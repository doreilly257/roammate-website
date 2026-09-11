import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../src/', import.meta.url));
function astroFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? astroFiles(path) : path.endsWith('.astro') ? [path] : [];
  });
}

describe('machine-readable identifiers are not localised', () => {
  it('uses Schema.org Organization, never Organisation', () => {
    const invalid = astroFiles(root).filter(path =>
      /["']@type["']\s*:\s*["']Organisation["']/.test(readFileSync(path, 'utf8')),
    );
    expect(invalid).toEqual([]);
    expect(readFileSync(join(root, 'layouts/BaseLayout.astro'), 'utf8'))
      .toContain('"@type": "Organization"');
  });

  it('uses the standard HTML theme-color metadata name', () => {
    const layout = readFileSync(join(root, 'layouts/BaseLayout.astro'), 'utf8');
    expect(layout).toContain('<meta name="theme-color" content="#c4562a">');
    expect(layout).not.toContain('name="theme-colour"');
  });
});
