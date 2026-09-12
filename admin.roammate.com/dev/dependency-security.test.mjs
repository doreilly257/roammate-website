import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
for (const [name, minimumMinors] of [['undici', { 7: 29, 8: 9 }], ['ws', { 8: 21 }]]) {
  test(`${name} stays on a patched compatible release`, () => {
    const entries = Object.entries(lock.packages).filter(([path]) => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`);
    assert.ok(entries.length > 0);
    for (const [path, pkg] of entries) {
      const [installedMajor, installedMinor] = pkg.version.split('.').map(Number);
      assert.ok(Object.hasOwn(minimumMinors, installedMajor) && installedMinor >= minimumMinors[installedMajor], `${path}: unreviewed or vulnerable ${pkg.version}`);
    }
  });
}
test('admin retains Pages-compatible framework and adapter', () => {
  assert.match(lock.packages['node_modules/astro'].version, /^5\./);
  assert.match(lock.packages['node_modules/@astrojs/cloudflare'].version, /^12\./);
});
