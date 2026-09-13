import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual component script, without adding a DOM dependency.
function setup() {
  function element() {
    const attributes = new Map<string, string>();
    const classes = new Set<string>();
    const listeners = new Map<string, (event?: any) => void>();
    return {
      attributes, listeners,
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
        contains: (name: string) => classes.has(name),
      },
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      removeAttribute: (key: string) => attributes.delete(key),
      hasAttribute: (key: string) => attributes.has(key),
      addEventListener: (name: string, handler: (event?: any) => void) => listeners.set(name, handler),
      querySelectorAll: () => [],
      focus: () => {},
    };
  }
  const main = element();
  const nav = { ...element(), parentElement: { children: [] as any[] } };
  nav.parentElement.children = [nav, main];
  const toggle = element();
  const links = element();
  const close = element();
  const search = element();
  const elements: Record<string, any> = { nav, navToggle: toggle, navLinks: links, navClose: close, headerSearch: search };
  const mediaListeners: ((event: { matches: boolean }) => void)[] = [];
  const documentListeners = new Map<string, (event: any) => void>();
  const source = readFileSync(new URL('../../src/components/Nav.astro', import.meta.url), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)![1];
  runInNewContext(ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, {
    document: {
      getElementById: (id: string) => elements[id],
      addEventListener: (name: string, fn: (event: any) => void) => documentListeners.set(name, fn),
    },
    window: {
      addEventListener: () => {},
      matchMedia: (query: string) => {
        expect(query).toBe('(max-width: 1024px)');
        return { addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => mediaListeners.push(fn) };
      },
    },
  });
  return {
    main, toggle, links, search,
    open: () => toggle.listeners.get('click')!(),
    resize: (mobile: boolean) => mediaListeners.forEach(fn => fn({ matches: mobile })),
    escape: () => documentListeners.get('keydown')!({ key: 'Escape' }),
  };
}

describe('mobile navigation lifecycle', () => {
  it('makes the header form inert behind the overlay and releases it on close or resize', () => {
    const menu = setup();
    menu.open(); expect(menu.search.hasAttribute('inert')).toBe(true);
    menu.escape(); expect(menu.search.hasAttribute('inert')).toBe(false);
    menu.open(); menu.resize(false); expect(menu.search.hasAttribute('inert')).toBe(false);
  });
  it('releases page content when switching to desktop', () => {
    const menu = setup();
    menu.open();
    expect(menu.main.hasAttribute('inert')).toBe(true);
    menu.resize(false);
    expect(menu.main.hasAttribute('inert')).toBe(false);
    expect(menu.links.classList.contains('open')).toBe(false);
    expect(menu.toggle.attributes.get('aria-expanded')).toBe('false');
  });

  it('does not reopen the overlay when returning to mobile', () => {
    const menu = setup();
    menu.open();
    menu.resize(false);
    menu.resize(true);
    expect(menu.main.hasAttribute('inert')).toBe(false);
    expect(menu.links.classList.contains('open')).toBe(false);
  });

  it('still closes with Escape', () => {
    const menu = setup();
    menu.open();
    menu.escape();
    expect(menu.main.hasAttribute('inert')).toBe(false);
    expect(menu.toggle.attributes.get('aria-expanded')).toBe('false');
  });
});
