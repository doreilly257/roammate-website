import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/components/NewsletterSignup.astro', import.meta.url), 'utf8');
const script = ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)![1], {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function boot({ responseOk = true, analyticsThrows = false, stalled = false } = {}) {
  const input = { value: 'subscriber@example.test' };
  const error = { textContent: '' };
  const button = { disabled: false, textContent: 'Subscribe' };
  const success = { hidden: true };
  let submit: (event: { preventDefault(): void }) => Promise<void>;
  let expire: () => void;
  let cleared = 0;
  let requests = 0;
  let captures = 0;
  const form = {
    hidden: false,
    querySelector: (selector: string) => selector === '.newsletter-input' ? input
      : selector === '.newsletter-error' ? error : button,
    closest: () => ({ querySelector: () => success }),
    addEventListener: (_: string, callback: typeof submit) => { submit = callback; },
  };
  runInNewContext(script, {
    document: { querySelectorAll: () => [form] }, AbortController,
    location: { pathname: '/blog/example/' },
    window: { posthog: { capture: () => { captures++; if (analyticsThrows) throw new Error('SDK failed'); } } },
    setTimeout: (callback: () => void) => { expire = callback; return 1; },
    clearTimeout: () => { cleared++; },
    fetch: async (_: string, init: RequestInit) => {
      requests++;
      if (stalled) return new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('timeout'))));
      return { ok: responseOk };
    },
  });
  return { form, error, button, success, submit: () => submit({ preventDefault() {} }),
    expire: () => expire(), counts: () => ({ requests, captures, cleared }) };
}

describe('newsletter submission outcome', () => {
  it.each([false, true])('preserves confirmed subscription when analytics throws=%s', async analyticsThrows => {
    const page = boot({ analyticsThrows });
    await page.submit();
    expect(page.form.hidden).toBe(true);
    expect(page.success.hidden).toBe(false);
    expect(page.error.textContent).toBe('');
    expect(page.counts()).toEqual({ requests: 1, captures: 1, cleared: 1 });
  });

  it.each([false, true])('keeps failed subscription retryable without a success event (timeout=%s)', async stalled => {
    const page = boot({ responseOk: false, stalled });
    const pending = page.submit();
    if (stalled) page.expire();
    await pending;
    expect(page.form.hidden).toBe(false);
    expect(page.success.hidden).toBe(true);
    expect(page.button.disabled).toBe(false);
    expect(page.button.textContent).toBe('Subscribe');
    expect(page.error.textContent).not.toBe('');
    expect(page.counts()).toEqual({ requests: 1, captures: 0, cleared: 1 });
  });
});
