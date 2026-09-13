import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const script = fileURLToPath(new URL('../check-claims.mjs', import.meta.url));
function check(copy: string) {
  const cwd = mkdtempSync(join(tmpdir(), 'roammate-claims-'));
  try {
    mkdirSync(join(cwd, 'src/pages'), { recursive: true });
    writeFileSync(join(cwd, 'src/pages/example.astro'), copy);
    return spawnSync(process.execPath, [script, '--all'], { cwd, encoding: 'utf8' });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

it.each(['Verified profiles', 'Profile verification'])('rejects mandatory verification across %s table cells', (label) => {
  const result = check(`<tr>\n<td>${label}</td>\n<td>Yes (all users)</td>\n<td>No</td></tr>`);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('verification-is-mandatory');
});

it('rejects the guaranteed verified companion sentence', () => {
  const result = check('Your potential companion has verified their identity and travel history before you agree to anything.');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('verification-is-mandatory');
});

it('allows optional verification, shipped features, and competitor verification cells', () => {
  const result = check('Verified accounts carry a badge. Traveller reviews, SOS alerts and groups are available. <tr><td>Verified profiles</td><td>Optional identity verification</td><td>Yes (all users)</td></tr>');
  expect(result.status).toBe(0);
});
