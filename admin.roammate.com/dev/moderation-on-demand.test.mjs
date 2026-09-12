import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/moderation.astro', import.meta.url), 'utf8');
const frontmatter = source.split('---')[1].replace(/^import .*;\n/gm, '');
const compiled = ts.transpileModule(`async function render() { ${frontmatter} }`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

async function render({ selected = '', method = 'GET', form = {}, target = { targetType: 'message', target: { content: 'Full reported message' } }, failed = false, reportStatus = 'open', targetType = 'message' } = {}) {
  const calls = [];
  const reports = Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, status: reportStatus, target_type: targetType, target_user_id: 'u1' }));
  const Astro = {
    url: new URL(`https://admin.test/moderation?status=open&report=${encodeURIComponent(selected)}`),
    locals: { runtime: { env: {} }, operator: 'operator@test' },
    request: { method, formData: async () => new Map(Object.entries(form)) },
    response: { headers: new Headers() },
    redirect: (url) => ({ redirect: url }),
  };
  const api = {
    get: async (_, path) => {
      calls.push(['GET', path]);
      if (path.endsWith('/target')) return failed ? { ok: false, error: 'Timed out', status: 0 } : { ok: true, data: target };
      return { ok: true, data: path.startsWith('/reports?') ? { reports } : path.startsWith('/moderation-log') ? { actions: [] } : { queues: { reportsOpen: 200 } } };
    },
    post: async (_, path) => { calls.push(['POST', path]); return { ok: true }; },
  };
  await vm.runInNewContext(`${compiled}\nrender()`, { Astro, api, URLSearchParams, encodeURIComponent, console });
  return calls;
}

test('200-report queue makes only three summary requests, no target fan-out', async () => {
  const calls = await render();
  assert.equal(calls.length, 3);
  assert.equal(calls.filter(([, path]) => path.endsWith('/target')).length, 0);
});

test('opening one report loads only its target', async () => {
  const calls = await render({ selected: 'r42' });
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.filter(([, path]) => path.endsWith('/target')), [['GET', '/reports/r42/target']]);
});

test('unknown selection cannot fetch arbitrary private target', async () => {
  assert.equal((await render({ selected: '../private' })).length, 3);
});

for (const [label, options] of [
  ['no selected review', {}],
  ['different selected report', { selected: 'r2' }],
  ['missing acknowledgement', { selected: 'r1', form: { reportId: 'r1', action: 'dismiss' } }],
  ['failed target', { selected: 'r1', failed: true }],
  ['deleted target', { selected: 'r1', target: { targetType: 'message', target: null } }],
  ['unsupported target', { selected: 'r1', target: { targetType: 'unknown', target: {} } }],
  ['mismatched target type', { selected: 'r1', target: { targetType: 'user', target: { name: 'Other content' } } }],
  ['message video that cannot be reviewed', { selected: 'r1', target: { targetType: 'message', target: { id: 'msg1', content: 'Caption is not the full video', image_url: null, video_url: 'https://media.test/video.mp4' } } }],
  ['album media without a trustworthy type (actual backend shape)', { selected: 'r1', targetType: 'album_media', target: { targetType: 'album_media', target: { id: 'media1', url: 'https://media.test/original', thumbnail_url: 'https://media.test/thumb.jpg', caption: 'Caption', user_id: 'u1', created_at: '2026-09-12' } } }],
  ['album video', { selected: 'r1', targetType: 'album_media', target: { targetType: 'album_media', target: { type: 'video', url: 'https://media.test/video.mp4', thumbnail_url: 'https://media.test/thumb.jpg' } } }],
  ['resolved report', { selected: 'r1', reportStatus: 'resolved' }],
  ['unknown action', { selected: 'r1', form: { reportId: 'r1', action: 'arbitrary', reviewed: 'yes' } }],
]) {
  test(`refuses mutation with ${label}`, async () => {
    const calls = await render({ method: 'POST', form: { reportId: 'r1', action: 'dismiss', reviewed: 'yes' }, ...options });
    assert.equal(calls.filter(([method]) => method === 'POST').length, 0);
  });
}

test('acknowledged selected review fetches content before resolving', async () => {
  const calls = await render({ selected: 'r1', method: 'POST', form: { reportId: 'r1', action: 'dismiss', reviewed: 'yes' } });
  assert.equal(calls.filter(([method]) => method === 'POST').length, 1);
  assert.ok(calls.findIndex(([, path]) => path === '/reports/r1/target') < calls.findIndex(([method]) => method === 'POST'));
});

test('review UI explicitly gates decisions and offers native retry without client scripting', () => {
  assert.match(source, /View reported content/);
  assert.match(source, /Retry loading content/);
  assert.match(source, /r\.status === 'open' && r\.id === selectedReport\?\.id && targetPreview/);
  assert.match(source, /name="reviewed" value="yes" required/);
  assert.doesNotMatch(source, /<script/);
});

test('reported media uses original content rather than thumbnail-only review', () => {
  assert.doesNotMatch(source, /image: g\('thumbnail_url'\)/);
  assert.match(source, /g\('profile_image_url'\)/);
  assert.match(source, /g\('bio'\)/);
});

test('unknown or stale selections have an explicit unavailable notice without lookup', () => {
  assert.match(source, /selectedId && !selectedReport && res\.ok/);
  assert.match(source, /Selected report is no longer available in this queue/);
});

test('referrer policy preserves same-origin form Origin for Astro CSRF protection', () => {
  assert.match(source, /headers\.set\('Referrer-Policy', 'same-origin'\)/);
  assert.doesNotMatch(source, /headers\.set\('Referrer-Policy', 'no-referrer'\)/);
});
