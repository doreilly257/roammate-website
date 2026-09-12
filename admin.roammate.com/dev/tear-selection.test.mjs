import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/tear.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function boot() {
  const handlers = new Map();
  const requests = [];
  let markup = '';
  let panelFocus = 0;
  let returnedFocus = 0;
  const classes = () => {
    const values = new Set();
    return { add: x => values.add(x), remove: x => values.delete(x), contains: x => values.has(x) };
  };
  const panel = {
    classList: classes(),
    replaceChildren: node => { markup = node.markup; },
    querySelector: () => ({ focus() { panelFocus++; } }),
  };
  const scrim = { classList: classes(), addEventListener() {} };
  vm.runInNewContext(source, {
    URLSearchParams,
    DOMParser: class { parseFromString(markup) { return { body: { childNodes: [{ markup }] } }; } },
    document: {
      getElementById: id => id === 'tearsheet' ? panel : scrim,
      body: { classList: classes() },
      addEventListener: (event, handler) => handlers.set(event, handler),
    },
    fetch: () => new Promise((resolve, reject) => requests.push({
      complete: html => resolve({ ok: true, text: async () => html }), reject,
    })),
  });
  return {
    requests,
    click() {
      const trigger = { attributes: [], getAttribute: () => 'users', focus() { returnedFocus++; } };
      handlers.get('click')({ preventDefault() {}, target: { closest: selector => selector === '[data-tear]' ? trigger : null } });
    },
    close: () => handlers.get('keydown')({ key: 'Escape' }),
    state: () => ({ markup, panelFocus, returnedFocus, open: panel.classList.contains('open') }),
  };
}

for (const stale of ['success', 'error']) {
  test(`late ${stale} from previous selection cannot replace the current detail`, async () => {
    const app = boot();
    app.click();
    app.click();
    app.requests[1].complete('CURRENT DETAIL');
    await settle();
    const current = app.state();
    assert.match(current.markup, /CURRENT DETAIL/);
    if (stale === 'success') app.requests[0].complete('STALE DETAIL');
    else app.requests[0].reject(new Error('Stale failure'));
    await settle();
    assert.deepEqual(app.state(), current);
  });
}

test('closing invalidates pending detail without stealing focus back', async () => {
  const app = boot();
  app.click();
  app.close();
  const closed = app.state();
  assert.equal(closed.open, false);
  assert.equal(closed.returnedFocus, 1);
  app.requests[0].complete('CLOSED DETAIL');
  await settle();
  assert.deepEqual(app.state(), closed);
});
