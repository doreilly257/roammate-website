import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function withFixtureDiagnostics(check, diagnostics) {
  try {
    return check();
  } catch (failure) {
    const { result, elapsedMs, trace } = diagnostics;
    failure.message += `\nFixture diagnostics: elapsedMs=${elapsedMs.toFixed(0)} status=${result.status} signal=${result.signal} code=${result.error?.code ?? 'none'}\n`
      + `spawn error: ${result.error?.stack ?? 'none'}\n`
      + `stdout:\n${result.stdout ?? ''}\nstderr (includes Bash xtrace):\n${result.stderr ?? ''}\n`
      + `stub commands:\n${trace}`;
    throw failure;
  }
}

test('fixture diagnostics retain timeout cause, timing and last commands on assertion failure', () => {
  const error = Object.assign(new Error('spawnSync bash ETIMEDOUT'), { code: 'ETIMEDOUT' });
  const diagnostics = {
    result: { error, status: null, signal: 'SIGTERM', stdout: 'building fixture\n', stderr: '+[fixture 9s:73] npm run build\n' },
    elapsedMs: 10_012,
    trace: '/fixture/bin/npm run build\n',
  };
  for (const reason of ['expected successful deploy', 'scratch cleaned even after upload failure']) {
    assert.throws(() => withFixtureDiagnostics(() => assert.fail(reason), diagnostics), (failure) => {
      assert.match(failure.message, new RegExp(reason));
      for (const expected of ['spawnSync bash ETIMEDOUT', 'code=ETIMEDOUT', 'status=null', 'signal=SIGTERM', 'elapsedMs=10012', 'building fixture', '+[fixture 9s:73] npm run build', '/fixture/bin/npm run build']) {
        assert.ok(failure.message.includes(expected), `missing diagnostic: ${expected}`);
      }
      return true;
    });
  }
});

test('fixture diagnostics do not change successful assertions or output', () => {
  const result = { status: 0, signal: null, stdout: 'Deployment complete!\n', stderr: '' };
  const before = structuredClone(result);
  assert.equal(withFixtureDiagnostics(() => result, { result, elapsedMs: 23, trace: '' }), result);
  assert.deepEqual(result, before);
});

// Run the real shell workflow with every executable deployment/build/auth tool
// replaced locally. These tests cannot authenticate or reach Cloudflare.
function fixture(args, check, failUpload = false) {
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
    // Fixtures contain synthetic keys only. Built-in timing avoids extra processes;
    // captured xtrace is surfaced only on failure, not in successful test output.
    const started = performance.now();
    const result = spawnSync('bash', ['-x', join(root, 'deploy.sh'), ...args], {
      env: { PATH: `${join(root, 'bin')}:/usr/bin:/bin`, TMPDIR: tmpdir(), TRACE: join(root, 'trace'), ASSEMBLY: join(root, 'assembly'), FIXTURE: root, PS4: '+[fixture ${SECONDS}s:${LINENO}] ' },
      encoding: 'utf8', timeout: 10_000,
    });
    const elapsedMs = performance.now() - started;
    const trace = existsSync(join(root, 'trace')) ? readFileSync(join(root, 'trace'), 'utf8') : '';
    const assembly = existsSync(join(root, 'assembly')) ? readFileSync(join(root, 'assembly'), 'utf8').trim() : null;
    return withFixtureDiagnostics(() => {
      if (assembly) assert.equal(existsSync(assembly), false, 'scratch cleaned even after upload failure');
      assert.equal(existsSync(join(root, 'roammate.com/dist/_routes.json')), false, 'original Astro output remains static');
      assert.equal(existsSync(join(root, 'functions')), false, 'no live autodiscovery directory left behind');
      return check({ result, trace, assembly, elapsedMs });
    }, { result, elapsedMs, trace });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const [args, branch] of [[[], 'main'], [['--preview'], 'preview']]) {
  test(`deploy workflow assembles nonce and route exclusions for ${branch}`, () => {
    fixture(args, ({ result, trace, assembly, elapsedMs }) => {
      assert.equal(result.status, 0);
      assert.ok(assembly);
      assert.match(trace, new RegExp(`pages deploy dist .*--branch=${branch} .*--commit-hash=deadbeef`));
      assert.ok(trace.indexOf('whoami') < trace.indexOf('pages deploy'));
      assert.ok(trace.indexOf('astro check') < trace.indexOf('pages deploy'));
      assert.match(result.stderr, /\+\[fixture \d+s:\d+\] /);
      assert.ok(elapsedMs >= 0);
    });
  });
}
test('failed upload is reported and scratch still cleaned', () => {
  fixture([], ({ result, assembly }) => {
    assert.equal(result.status, 17);
    assert.ok(assembly);
    assert.doesNotMatch(result.stdout, /Deployment complete!/);
  }, true);
});
test('unsupported flags never run authentication, builds or uploads', () => {
  for (const args of [['--dry-run'], ['--preview', 'unexpected']]) {
    fixture(args, ({ result, trace, assembly }) => {
      assert.equal(result.status, 2);
      assert.equal(trace, '');
      assert.equal(assembly, null);
    });
  }
});
