import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import worker from './worker.mjs';

const form = { name: 'Local Tester', email: 'local@example.invalid', message: 'Hello', website: 'iqaas.io' };
afterEach(() => mock.restoreAll());
async function run(body, encoding, method = 'POST') {
  const errors = [];
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  mock.method(console, 'error', (...args) => errors.push(args.map(String).join(' ')));
  const writes = [];
  const request = new Request('https://contactus.example.invalid/', {
    method,
    headers: { Origin: 'https://iqaas.io', 'Content-Type': 'application/json', ...(encoding ? { 'Content-Encoding': encoding } : {}) },
    ...(method === 'POST' ? { body } : {}),
  });
  const response = await worker.fetch(request, { contactus: { put: async (key, value) => writes.push({ key, value: JSON.parse(value) }) } });
  return { response, writes, errors };
}
test('plain JSON is stored once without rereading a consumed stream', async () => {
  const { response, writes, errors } = await run(JSON.stringify(form));
  assert.equal(response.status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value.message, form.message);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://iqaas.io');
  assert.deepEqual(errors, []);
});
test('gzip JSON is decoded and stored once', async () => {
  const { response, writes, errors } = await run(gzipSync(JSON.stringify(form)), 'gzip');
  assert.equal(response.status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value.email, form.email);
  assert.deepEqual(errors, []);
});
for (const [label, body, encoding, status] of [
  ['malformed JSON', '{private-input-sentinel', undefined, 400],
  ['invalid gzip', 'not-gzip', 'gzip', 400],
  ['unsupported encoding', JSON.stringify(form), 'br', 415],
  ['decompression size limit', gzipSync(JSON.stringify({ ...form, message: 'a'.repeat(70_000) })), 'gzip', 413],
  ['null JSON', 'null', undefined, 400],
  ['array JSON', '[]', undefined, 400],
]) {
  test(label + ' is rejected before storage without body rereads', async () => {
    const { response, writes, errors } = await run(body, encoding);
    assert.equal(response.status, status);
    assert.equal(writes.length, 0);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://iqaas.io');
    assert.ok(!errors.join(' ').includes('private-input-sentinel'));
    assert.ok(!errors.join(' ').match(/locked|consumed|unusable/i));
  });
}
for (const [method, status] of [['OPTIONS', 200], ['GET', 405]]) {
  test(method + ' needs no body', async () => {
    const { response, writes, errors } = await run(undefined, undefined, method);
    assert.equal(response.status, status);
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
    if (method === 'OPTIONS') assert.match(response.headers.get('Access-Control-Allow-Headers'), /Content-Encoding/i);
  });
}
