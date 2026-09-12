import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const paths = { flags: 'flags.astro', users: 'users/[id].astro', excursions: 'excursions/[id].astro' };
const compiled = Object.fromEntries(Object.entries(paths).map(([key, path]) => {
  const source = readFileSync(new URL(`../src/pages/${path}`, import.meta.url), 'utf8');
  const frontmatter = source.split('---')[1].replace(/^import .*;\n/gm, '');
  return [key, ts.transpileModule(`async function render() { ${frontmatter}; return { flash }; }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText];
}));

async function render(page, { fields = [], method = 'POST', malformed = false, failed = false, missingDetail = false, id = 'test-id' } = {}) {
  const mutations = [];
  const form = new FormData();
  for (const [key, value] of fields) form.append(key, value);
  const Astro = {
    locals: { runtime: { env: {} }, operator: 'test-operator' },
    params: { id },
    url: new URL(`https://admin.test/${page}${page === 'flags' ? '' : '/test-id'}`),
    request: new Request(`https://admin.test/${page}`, { method, ...(method === 'POST' ? malformed ? { body: 'invalid multipart', headers: { 'content-type': 'multipart/form-data; boundary=test' } } : { body: form } : {}) }),
    response: { status: 200 },
    redirect: (url, status) => ({ redirect: url, status }),
  };
  const mutate = async (_, path, json) => {
    mutations.push({ path, json: JSON.parse(JSON.stringify(json)) });
    return failed ? { ok: false, error: 'Outcome unknown; inspect before retrying', status: 0 }
      : { ok: true, data: { flags: { matchmaking_enabled: true } } };
  };
  const api = { post: mutate, put: mutate, get: async (_, path) => {
    if (missingDetail && path !== '/overview') return { ok: false, error: 'Not found', status: 404 };
    return { ok: true, data: { flags: { matchmaking_enabled: true }, user: {}, excursion: {}, participants: [], queues: { reportsOpen: 0 } } };
  } };
  const result = await vm.runInNewContext(`${compiled[page]}; render()`, { Astro, api, encodeURIComponent });
  return { result, mutations, status: Astro.response.status };
}

const valid = {
  flags: [['flag', 'matchmaking_enabled'], ['next', 'true']],
  users: [['action', 'restore'], ['notes', 'Reviewed']],
  excursions: [['action', 'restore'], ['notes', 'Reviewed']],
};

for (const page of Object.keys(paths)) {
  test(`${page}: successful mutation redirects303 and a subsequentGET never mutates`, async () => {
    const post = await render(page, { fields: valid[page] });
    assert.equal(post.mutations.length, 1);
    assert.equal(post.result?.status, 303);
    assert.equal(post.result.redirect, `/${page}${page === 'flags' ? '' : '/test-id'}`);
    assert.equal((await render(page, { method: 'GET', fields: valid[page] })).mutations.length, 0);
  });
  for (const missingDetail of [false, true]) {
    test(`${page}: failed mutation stays visible without retry even with detail404=${missingDetail}`, async () => {
      const out = await render(page, { fields: valid[page], failed: true, missingDetail });
      assert.equal(out.mutations.length, 1);
      assert.equal(out.result?.redirect, undefined);
      assert.match(out.result.flash.message, /Outcome unknown/);
    });
  }
  for (const options of [{ fields: [] }, { malformed: true }, { fields: [['action', 'unknown'], ['flag', 'unknown_flag'], ['next', 'true']] }]) {
    test(`${page}: rejects malformed or unsupported form ${JSON.stringify(options)}`, async () => {
      const out = await render(page, options);
      assert.equal(out.mutations.length, 0);
      assert.equal(out.status, 400);
      assert.equal(out.result.flash.kind, 'err');
    });
  }
}

for (const next of [undefined, '', 'FALSE', '0', ' true ', 'nonsense']) {
  test(`flags: rejects nonliteral boolean ${JSON.stringify(next)}`, async () => {
    const fields = [['flag', 'matchmaking_enabled']];
    if (next !== undefined) fields.push(['next', next]);
    const out = await render('flags', { fields });
    assert.equal(out.mutations.length, 0);
    assert.equal(out.status, 400);
  });
}

test('flags: literalfalse staysfalse rather than truthy string', async () => {
  const out = await render('flags', { fields: [['flag', 'matchmaking_enabled'], ['next', 'false']] });
  assert.deepEqual(out.mutations[0].json, { matchmaking_enabled: false });
});

for (const page of Object.keys(paths)) {
  test(`${page}: duplicate action fields cannot trigger a mutation`, async () => {
    const fields = [...valid[page], valid[page][0]];
    const out = await render(page, { fields });
    assert.equal(out.mutations.length, 0);
    assert.equal(out.status, 400);
  });
}

for (const page of Object.keys(paths)) {
  const fieldNames = page === 'flags' ? ['flag', 'next'] : ['action', 'notes'];
  for (const name of fieldNames) {
    test(`${page}: rejects file value in ${name}`, async () => {
      const fields = valid[page].filter(([key]) => key !== name);
      fields.push([name, new Blob(['invalid'])]);
      const out = await render(page, { fields });
      assert.equal(out.status, 400);
      assert.equal(out.mutations.length, 0);
    });
    test(`${page}: rejects duplicate ${name}`, async () => {
      const out = await render(page, { fields: [...valid[page], [name, 'true']] });
      assert.equal(out.status, 400);
      assert.equal(out.mutations.length, 0);
    });
  }
}
for (const [page, action] of [['users', 'eject'], ['excursions', 'delete']]) {
  test(`${page}: alternate action preserves actor and truncates notes`, async () => {
    const out = await render(page, { fields: [['action', action], ['notes', 'a'.repeat(600)]] });
    assert.equal(out.result.status, 303);
    assert.deepEqual(out.mutations, [{ path: `/${page}/test-id/${action}`, json: { actorId: 'test-operator', notes: 'a'.repeat(500) } }]);
  });
  test(`${page}: optional notes and encoded canonical redirect`, async () => {
    const id = 'id?query/#fragment';
    const out = await render(page, { id, fields: [['action', 'restore']] });
    assert.equal(out.result.redirect, `/${page}/${encodeURIComponent(id)}`);
    assert.equal(out.mutations[0].path, `/${page}/${encodeURIComponent(id)}/restore`);
    assert.equal(out.mutations[0].json.notes, '');
  });
  test(`${page}: ordinary missing GET retains list redirect`, async () => {
    const out = await render(page, { method: 'GET', missingDetail: true });
    assert.equal(out.result.redirect, `/${page}`);
    assert.equal(out.mutations.length, 0);
  });
}
