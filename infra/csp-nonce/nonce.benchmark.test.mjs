import test from 'node:test';
const ok = (value) => { if (!value) throw new Error('UNIT_FAILED'); };
let api;
try { api = await import('./nonce.benchmark.mjs'); } catch { /* Initial RED: absent module. */ }
test('benchmark exports exist', () => ok(!!api));
test('nearest rank and signed paired summaries', () => {
  ok(!!api);
  const s = api.summarize([-5, 1, -1, 9]);
  ok(s.min === -5 && s.median === -1 && s.p95 === 9 && s.p99 === 9 && s.max === 9);
  for (const bad of [[], [NaN], [Infinity]]) {
    let rejected = false; try { api.summarize(bad); } catch { rejected = true; } ok(rejected);
  }
  const pair = { pair: 0, order: 'AB', aNs: 10, bNs: 5, deltaNs: -5 };
  ok(api.summarizePairs([pair]).deltaNs.median === -5);
  for (const bad of [{...pair, deltaNs: 5}, {...pair, aNs: -1}, {...pair, order: 'BA'}]) {
    let rejected = false; try { api.summarizePairs([bad]); } catch { rejected = true; } ok(rejected);
  }
  ok(api.orderForPair(0) === 'AB' && api.orderForPair(1) === 'BA' && api.orderForPair(1000) === 'AB');
});
test('five actual middleware fixtures and fresh bodies', async () => {
  ok(!!api && api.FIXTURES.length === 5);
  for (const f of api.FIXTURES) {
    const next = api.originFor(f);
    const x = await next(api.requestFor(f)), y = await next(api.requestFor(f));
    ok(x !== y && (f.method === 'HEAD' || x.body !== y.body));
    await x.arrayBuffer(); await y.arrayBuffer();
    const pair = await api.runPair(f, 0); ok(pair.order === 'AB' && pair.deltaNs === pair.bNs - pair.aNs);
    ok((await api.runPair(f, 1)).order === 'BA');
  }
  ok(await api.preflight() === true);
});
