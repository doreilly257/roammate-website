import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transform } from '@astrojs/compiler';
import { describe, expect, it, vi } from 'vitest';

const read = (path: string) => readFileSync(new URL('../../src/' + path, import.meta.url), 'utf8');
const post = read('layouts/BlogPostLayout.astro');
const blog = read('pages/blog/index.astro');
const script = (source: string, marker: string) => [...source.matchAll(/<script(?: define:vars=\{\{[^}]+\}\})?>([\s\S]*?)<\/script>/g)]
  .find((match) => match[1].includes(marker))![1];

describe('blog scripts under the existing self-only script CSP', () => {
  it.each([
    ['navigator.share', post],
  ])('extracts the %s feature into Astro’s processed script pipeline', async (marker, source) => {
    const compiled = await transform(source);
    // Compiler scripts are extracted for Vite; define:vars produces rendered inline
    // code instead. assetsInlineLimit:0 in astro.config keeps extracted JS external.
    expect(compiled.scripts.some((entry) => 'code' in entry && entry.code.includes(marker))).toBe(true);
    expect(source).not.toContain('<script define:vars');
    const config = readFileSync(new URL('../../astro.config.mjs', import.meta.url), 'utf8');
    expect(config).toMatch(/assetsInlineLimit:\s*0/);
  });

  it('passes server values through escaped Astro attributes rather than raw script text', () => {
    expect(post).toContain('data-share-title={title}');
    expect(post).toContain('data-share-url={canonical}');
    expect(blog).not.toContain('<script define:vars');
  });
});

function sharePage(supported = true, present = true, rejected = false) {
  const events = new Map<string, () => Promise<void> | void>();
  const data = { shareTitle: 'A "quoted" <title> & café', shareUrl: 'https://roammate.com/blog/a-post/' };
  const button = { dataset: data, style: { display: 'none' }, addEventListener: (event: string, fn: () => void) => events.set(event, fn) };
  const share = vi.fn(() => rejected ? Promise.reject(new Error('cancelled')) : Promise.resolve());
  runInNewContext(script(post, 'navigator.share'), {
    document: { getElementById: () => present ? button : null },
    navigator: supported ? { share } : {},
    // Old define:vars reads these globals instead of per-element data.
    title: 'stale global', canonical: 'https://wrong.example/',
  });
  return { button, share, events, data };
}

describe('native blog sharing', () => {
  it('reveals supported sharing and passes the exact title and canonical from the button', async () => {
    const page = sharePage();
    expect(page.button.style.display).toBe('inline-flex');
    await page.events.get('click')?.();
    expect(page.share).toHaveBeenCalledWith({ title: page.data.shareTitle, url: page.data.shareUrl });
  });
  it('keeps the control hidden when native sharing is unavailable', () => {
    const page = sharePage(false);
    expect(page.button.style.display).toBe('none');
    expect(page.events.size).toBe(0);
  });
  it('does not fail if the button is absent', () => {
    expect(() => sharePage(true, false)).not.toThrow();
  });
  it('handles a dismissed share without an unhandled rejection', async () => {
    const page = sharePage(true, true, true);
    await page.events.get('click')?.();
    await Promise.resolve();
    expect(page.share).toHaveBeenCalledTimes(1);
  });
});
