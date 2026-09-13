import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/moderation.astro', import.meta.url), 'utf8');
const frontmatter = source.split('---')[1].replace(/^import .*;\n/gm, '').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.LOCAL_MODERATION_MEDIA', 'undefined');
const compiled = ts.transpileModule(`async function render() { ${frontmatter}; return { flash }; }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const valid = [['reportId', 'r1'], ['action', 'dismiss'], ['reviewed', 'yes']];

async function render({ fields = valid, malformed = false, failed = false, method = 'POST' } = {}) {
  const mutations = [];
  const form = new FormData();
  for (const [key, value] of fields) form.append(key, value);
  const Astro = {
    url: new URL('https://admin.test/moderation?status=open&report=r1'),
    locals: { runtime: { env: {} }, operator: 'trusted-operator' },
    request: new Request('https://admin.test/moderation', { method, ...(method === 'POST' ? malformed ? { body: 'broken', headers: { 'content-type': 'multipart/form-data; boundary=test' } } : { body: form } : {}) }),
    response: { status: 200, headers: new Headers() },
    redirect: (url, status) => ({ redirect: url, status }),
  };
  const api = {
    get: async (_, path) => ({ ok: true, data: path.endsWith('/target') ? { targetType: 'message', target: { content: 'Review me' } } : path.startsWith('/reports?') ? { reports: [{ id: 'r1', status: 'open', target_type: 'message', target_user_id: 'u1' }] } : path.startsWith('/moderation-log') ? { actions: [] } : { queues: { reportsOpen: 1 } } }),
    post: async (_, path, json) => { mutations.push({ path, json: JSON.parse(JSON.stringify(json)) }); return failed ? { ok: false, status: 0, error: 'Outcome unknown; inspect before retrying' } : { ok: true }; },
  };
  const result = await vm.runInNewContext(`${compiled}; render()`, { Astro, api, URLSearchParams, encodeURIComponent });
  return { result, mutations, status: Astro.response.status };
}

for (const field of ['reportId', 'action', 'reviewed', 'notes']) {
  for (const mode of ['duplicate', 'file', ...(field === 'notes' ? [] : ['missing'])]) {
    test(`moderation rejects ${mode} ${field}`, async () => {
      let fields = [...valid, ['notes', 'note']];
      if (mode === 'duplicate') fields.push([field, fields.find(([key]) => key === field)[1]]);
      else { fields = fields.filter(([key]) => key !== field); if (mode === 'file') fields.push([field, new Blob(['bad'])]); }
      const out = await render({ fields });
      assert.equal(out.mutations.length, 0);
      assert.equal(out.status, 400);
    });
  }
}
test('moderation malformed multipart returns400 without mutation', async () => {
  const out = await render({ malformed: true });
  assert.equal(out.mutations.length, 0);
  assert.equal(out.status, 400);
});
for (const action of ['dismiss', 'remove_content_and_eject_user']) {
  test(`moderation ${action} preserves actor, notes and303 PRG`, async () => {
    const out = await render({ fields: [['reportId', 'r1'], ['action', action], ['reviewed', 'yes'], ['notes', 'a'.repeat(600)]] });
    assert.deepEqual(out.mutations, [{ path: '/reports/r1/resolve', json: { actorId: 'trusted-operator', action, notes: 'a'.repeat(500) } }]);
    assert.equal(out.result.status, 303);
    assert.equal((await render({ method: 'GET' })).mutations.length, 0);
  });
}
test('moderation failed mutation stays visible without redirect/retry', async () => {
  const out = await render({ failed: true });
  assert.equal(out.mutations.length, 1);
  assert.equal(out.result.redirect, undefined);
  assert.match(out.result.flash.message, /Outcome unknown/);
});
test('queue and log empty states are conditional on successful reads', () => {
  assert.match(source, /res\.ok && \(reports\.length === 0/);
  assert.match(source, /!logRes\.ok \? \(/);
  assert.match(source, /Moderation queue unavailable/);
  assert.doesNotMatch(source, /Nothing needs attention/);
});
