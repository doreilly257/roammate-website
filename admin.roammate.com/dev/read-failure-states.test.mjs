import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const quality = readFileSync(new URL('../src/pages/quality.astro', import.meta.url), 'utf8');
const activity = readFileSync(new URL('../src/pages/activity.astro', import.meta.url), 'utf8');

// Execute the actual template guard rather than a copy of the expected condition.
function cleanGuard(source, text) {
  const before = source.slice(0, source.indexOf(text));
  return [...before.matchAll(/\{([^{}\n]+) \? \(/g)].at(-1)[1];
}

for (const [integrityOK, anomaliesOK] of [[true, true], [false, true], [true, false], [false, false]]) {
  test(`structural clean claim requires successful checks (${integrityOK}/${anomaliesOK})`, () => {
    const visible = vm.runInNewContext(cleanGuard(quality, 'No structural problems found.'), {
      failing: [], intRes: { ok: integrityOK }, anomRes: { ok: anomaliesOK },
    });
    assert.equal(visible, integrityOK && anomaliesOK);
  });
}

test('quality makes incomplete structural checks explicit without hiding successful findings', async () => {
  assert.match(quality, /!intRes\.ok \|\| !anomRes\.ok/);
  assert.match(quality, /Structural checks are incomplete/);
  assert.match(quality, /failing\.length > 0 &&/);
  const frontmatter = quality.split('---')[1].replace(/^import .*;\n/gm, '');
  const code = ts.transpileModule(`async function render() { ${frontmatter}; return { failing, tables }; }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const finding = { id: 'orphan', label: 'Orphan', count: 2, level: 'bad', why: 'Missing parent' };
  const result = await vm.runInNewContext(`${code}\nrender()`, {
    Astro: { locals: { runtime: { env: {} } } },
    api: { get: async (_, path) => path === '/quality/anomalies'
      ? { ok: false, error: 'Unavailable', status: 503 }
      : { ok: true, data: { tables: [{ table: 'users', rows: 3 }], profiles: [], checks: [finding], sources: [] } } },
  });
  assert.equal(result.failing[0].id, 'orphan');
  assert.equal(result.tables[0].rows, 3);
});

for (const ok of [true, false]) {
  test(`activity empty result claim requires successful read (${ok})`, () => {
    assert.equal(vm.runInNewContext(cleanGuard(activity, 'No events match these filters.'), {
      res: { ok }, events: [],
    }), ok);
  });
}

test('activity failed read has unavailable status instead of a zero count', () => {
  assert.match(activity, /res\.ok \? `\$\{events\.length\} shown` : 'Unavailable'/);
  assert.match(activity, /!res\.ok && <div class="empty">Activity results are unavailable\./);
});
