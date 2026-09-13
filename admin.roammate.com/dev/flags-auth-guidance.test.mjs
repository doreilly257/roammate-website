import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const flags = readFileSync(new URL('../src/pages/flags.astro', import.meta.url), 'utf8');
const guidance = flags.match(/res\.status === 401 && \(\s*<>([\s\S]*?)<\/>/)?.[1]
  .replace(/<\/?code>/g, '').replace(/\s+/g, ' ').trim();

test('flags 401 guidance distinguishes the Pages binding from the scoped backend key', () => {
  assert.ok(guidance, '401 troubleshooting guidance must remain visible');
  assert.match(guidance, /Pages ADMIN_API_KEY binding.*backend.*scoped ADMIN_CONSOLE_KEY value/);
  assert.match(guidance, /[Vv]erify.*deployed backend.*supports.*scoped key/);
  assert.doesNotMatch(guidance, /ADMIN_READ_KEY|accept only ADMIN_API_KEY|master key/);
});
