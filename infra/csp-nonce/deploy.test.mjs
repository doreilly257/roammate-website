import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Run the real shell workflow with every executable deployment/build/auth tool
// replaced locally. These tests cannot authenticate or reach Cloudflare.
function fixture(args, failUpload = false) {
  const root = mkdtempSync(join(tmpdir(), 'nonce-deploy-test-'));
  try {
    for (const dir of ['bin', 'roammate.com/dist', 'roammate.com/node_modules/.bin', 'infra/csp-nonce/functions']) {
      mkdirSync(join(root, dir), { recursive: true });
    }
    copyFileSync(new URL('../../deploy.sh', import.meta.url), join(root, 'deploy.sh'));
    copyFileSync(new URL('./_routes.json', import.meta.url), join(root, 'infra/csp-nonce/_routes.json'));
    writeFileSync(join(root, 'infra/csp-nonce/functions/_middleware.js'), '// fixture middleware');
    writeFileSync(join(root, 'roammate.com/dist/index.html'), 'fixture HTML');
    writeFileSync(join(root, 'roammate.com/.env'), 'PUBLIC_POSTHOG_KEY=phc_offline_fixture\n');
    const stub = '#!/bin/sh\nprintf "%s %s\\n" "$0" "$*" >> "$TRACE"\n';
    for (const executable of ['node', 'npm', 'tsc']) {
      writeFileSync(join(root, 'bin', executable), stub + 'exit 0\n', { mode: 0o755 });
    }
    copyFileSync(join(root, 'bin/tsc'), join(root, 'roammate.com/node_modules/.bin/tsc'));
    writeFileSync(join(root, 'bin/git'), '#!/bin/sh\nprintf "deadbeef\\n"\n', { mode: 0o755 });
    writeFileSync(join(root, 'bin/npx'), stub + `
case "$*" in
  *"pages deploy"*)
    pwd > "$ASSEMBLY"
    test -f functions/_middleware.js || exit 91
    test -f dist/_routes.json || exit 92
    test -f dist/index.html || exit 93
    cmp dist/_routes.json "$FIXTURE/infra/csp-nonce/_routes.json" || exit 94
    exit "${failUpload ? 17 : 0}"
    ;;
esac
exit 0
`, { mode: 0o755 });
    const result = spawnSync('bash', [join(root, 'deploy.sh'), ...args], {
      env: { PATH: `${join(root, 'bin')}:/usr/bin:/bin`, TMPDIR: tmpdir(), TRACE: join(root, 'trace'), ASSEMBLY: join(root, 'assembly'), FIXTURE: root },
      encoding: 'utf8', timeout: 10_000,
    });
    const trace = existsSync(join(root, 'trace')) ? readFileSync(join(root, 'trace'), 'utf8') : '';
    const assembly = existsSync(join(root, 'assembly')) ? readFileSync(join(root, 'assembly'), 'utf8').trim() : null;
    if (assembly) assert.equal(existsSync(assembly), false, 'scratch cleaned even after upload failure');
    assert.equal(existsSync(join(root, 'roammate.com/dist/_routes.json')), false, 'original Astro output remains static');
    assert.equal(existsSync(join(root, 'functions')), false, 'no live autodiscovery directory left behind');
    return { result, trace, assembly };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const [args, branch] of [[[], 'main'], [['--preview'], 'preview']]) {
  test(`deploy workflow assembles nonce and route exclusions for ${branch}`, () => {
    const { result, trace, assembly } = fixture(args);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(assembly);
    assert.match(trace, new RegExp(`pages deploy dist .*--branch=${branch} .*--commit-hash=deadbeef`));
    assert.ok(trace.indexOf('whoami') < trace.indexOf('pages deploy'));
    assert.ok(trace.indexOf('astro check') < trace.indexOf('pages deploy'));
  });
}
test('failed upload is reported and scratch still cleaned', () => {
  const { result, assembly } = fixture([], true);
  assert.equal(result.status, 17);
  assert.ok(assembly);
  assert.doesNotMatch(result.stdout, /Deployment complete!/);
});
test('unsupported flags never run authentication, builds or uploads', () => {
  for (const args of [['--dry-run'], ['--preview', 'unexpected']]) {
    const { result, trace, assembly } = fixture(args);
    assert.equal(result.status, 2);
    assert.equal(trace, '');
    assert.equal(assembly, null);
  }
});
