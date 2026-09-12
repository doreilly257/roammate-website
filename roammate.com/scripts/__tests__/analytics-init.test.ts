import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// Execute the actual layout script, retaining the real PostHog queue stub.
// No SDK/network requests or analytics data leave the test.
const layout = readFileSync(new URL('../../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const script = layout.match(/<script>\s*([\s\S]*?)<\/script>/)![1]
  .replace('import.meta.env.PUBLIC_POSTHOG_KEY', JSON.stringify('phc_test'));

function boot(consent: string | null, idle = true, pathname = '/guides/bangkok/', storageFailure?: 'access' | 'read' | 'write') {
  const storage = new Map<string, string>();
  if (consent) storage.set('analytics_consent', consent);
  const callbacks: Array<() => void> = [];
  const clicks = new Map<string, () => void>();
  const injected: unknown[] = [];
  const banner = { style: { display: 'none' } };
  const observed: unknown[] = [];
  const reveal = {};
  const document = {
    readyState: 'complete',
    querySelector: () => null,
    querySelectorAll: (selector: string) => selector === '.reveal' ? [reveal] : [],
    getElementById: (id: string) => id === 'cookieBanner' ? banner
      : ['cookieAccept', 'cookieDecline'].includes(id)
        ? { addEventListener: (_event: string, fn: () => void) => clicks.set(id, fn) }
        : null,
    createElement: () => ({}),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (el: unknown) => injected.push(el) } }],
  };
  const context: Record<string, any> = {
    document, URLSearchParams, location: { pathname, search: '?utm_source=test' },
    localStorage: { getItem: (key: string) => {
      if (storageFailure === 'read') throw new Error('Storage read denied');
      return storage.get(key) ?? null;
    }, setItem: (key: string, value: string) => {
      if (storageFailure === 'write') throw new Error('Storage quota exceeded');
      storage.set(key, value);
    } },
    setTimeout: (fn: () => void) => callbacks.push(fn),
    addEventListener: () => {},
    IntersectionObserver: class { observe(el: unknown) { observed.push(el); } unobserve() {} },
  };
  if (storageFailure === 'access') Object.defineProperty(context, 'localStorage', {
    get() { throw new Error('Storage access denied'); },
  });
  context.window = context;
  if (idle) context.requestIdleCallback = (fn: () => void) => callbacks.push(fn);
  runInNewContext(script, context);
  return {
    flush: () => callbacks.splice(0).forEach(fn => fn()),
    click: (id: string) => clicks.get(id)?.(),
    captures: () => (context.posthog ?? []).filter((row: unknown[]) => row[0] === 'capture'),
    context, injected, banner, observed, storage,
  };
}

describe('consent-gated analytics startup', () => {
  it.each(['access', 'read'] as const)('keeps page initialization alive and analytics off when storage %s throws', failure => {
    const page = boot('granted', true, '/guides/bangkok/', failure);
    expect(page.banner.style.display).toBe('');
    expect(page.observed).toHaveLength(1);
    expect(() => page.flush()).not.toThrow();
    expect(page.injected).toHaveLength(0);
    expect(page.captures()).toHaveLength(0);
  });

  it.each(['cookieAccept', 'cookieDecline'])('handles %s without assuming consent persisted when writes fail', button => {
    const page = boot(null, true, '/guides/bangkok/', 'write');
    expect(() => page.click(button)).not.toThrow();
    expect(page.banner.style.display).toBe('none');
    expect(page.storage.has('analytics_consent')).toBe(false);
    page.flush();
    expect(page.injected).toHaveLength(0);
    expect(page.captures()).toHaveLength(0);
  });

  it.each(['cookieAccept', 'cookieDecline'])('handles %s when accessing storage itself throws', button => {
    const page = boot(null, true, '/guides/bangkok/', 'access');
    expect(() => page.click(button)).not.toThrow();
    expect(page.banner.style.display).toBe('none');
    page.flush();
    expect(page.injected).toHaveLength(0);
    expect(page.captures()).toHaveLength(0);
  });

  it.each([true, false])('captures initial guide events after delayed SDK bootstrap (idle=%s)', idle => {
    const page = boot('granted', idle);
    expect(page.injected).toHaveLength(0);
    expect(page.captures()).toHaveLength(0);
    page.flush();
    expect(page.injected).toHaveLength(1);
    expect(page.captures().map((row: unknown[]) => row[1])).toEqual(['page_view_enhanced', 'guide_view']);
    expect(page.captures()[0][2]).toMatchObject({ slug: 'bangkok', utm_source: 'test' });
  });

  it('captures a blog view when consent is granted after the idle callback', () => {
    const page = boot(null, true, '/blog/test-post/');
    page.flush();
    expect(page.injected).toHaveLength(0);
    page.click('cookieAccept');
    expect(page.captures().map((row: unknown[]) => row[1])).toEqual(['page_view_enhanced', 'blog_view']);
  });

  it('does not initialise twice when acceptance precedes idle loading', () => {
    const page = boot(null);
    page.click('cookieAccept');
    page.flush();
    expect(page.injected).toHaveLength(1);
    expect(page.context.posthog._i).toHaveLength(1);
    expect(page.captures().map((row: unknown[]) => row[1])).toEqual(['page_view_enhanced', 'guide_view']);
  });

  it.each(['denied', null])('does not load or capture without consent (%s)', consent => {
    const page = boot(consent);
    page.flush();
    expect(page.injected).toHaveLength(0);
    expect(page.captures()).toHaveLength(0);
    if (consent === null) {
      page.click('cookieDecline');
      expect(page.injected).toHaveLength(0);
      expect(page.captures()).toHaveLength(0);
    }
  });
});
