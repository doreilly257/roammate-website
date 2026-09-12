import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from '@astrojs/compiler';

const pages = ['users/index', 'excursions/index', 'media', 'activity', 'moderation', 'insights'];
const attr = (node, name) => node.attributes?.find((attribute) => attribute.name === name)?.value;

function descendants(node) {
  return (node.children ?? []).flatMap((child) => [child, ...descendants(child)]);
}

for (const page of pages) {
  const source = await readFile(new URL(`../src/pages/${page}.astro`, import.meta.url), 'utf8');
  const { ast } = await parse(source);
  const nodes = descendants(ast);

  test(`${page}: links never contain another interactive control`, () => {
    const links = nodes.filter((node) => node.name === 'a' && attr(node, 'href') !== undefined);
    assert.ok(links.length > 0);
    for (const link of links) {
      assert.equal(descendants(link).some((node) =>
        ['button', 'input', 'select', 'textarea', 'a'].includes(node.name)), false,
      `Nested interactive element in link at line ${link.position.start.line}`);
    }
  });

  if (page.endsWith('/index')) {
    test(`${page}: search and filter have explicit accessible names`, () => {
      for (const name of ['q', 'filter']) {
        const control = nodes.find((node) => ['input', 'select'].includes(node.name) && attr(node, 'name') === name);
        assert.ok(control, `Missing ${name} control`);
        assert.ok(attr(control, 'aria-label')?.trim(), `${name} needs a stable accessible label`);
      }
    });
  }
}

test('navigation links share button styling and a visible keyboard focus indicator', async () => {
  const css = await readFile(new URL('../src/styles/admin.css', import.meta.url), 'utf8');
  assert.match(css, /button,\s*a\.button-link\s*\{/);
  assert.match(css, /a\.button-link:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/);
  assert.match(css, /a\.button-link\.ghost\s*\{/);
  assert.match(css, /a\.button-link\.primary\s*\{/);
});
