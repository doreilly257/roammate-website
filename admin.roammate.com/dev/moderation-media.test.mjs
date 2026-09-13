import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const path = new URL('../src/lib/moderation-media.ts', import.meta.url);
const exports = {};
if (existsSync(path)) vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL });
const original = 'https://media.roammate.com/original';
const payload = (type, extra = {}) => ({ targetType: 'album_media', target: { type, url: original, album_id: 'a1', ...extra } });

test('local gate requires development and explicit opt-in', () => {
  assert.equal(typeof exports.localMediaEnabled, 'function');
  for (const opt of [undefined, 'false', 'true', true]) assert.equal(exports.localMediaEnabled(false, opt), false);
  assert.equal(exports.localMediaEnabled(true, undefined), false);
  assert.equal(exports.localMediaEnabled(true, 'true'), true);
});
test('local media uses original and persisted photo/video, never thumbnail inference', () => {
  assert.equal(typeof exports.describeLocalTarget, 'function');
  for (const [type, kind] of [['photo', 'image'], ['video', 'video']]) {
    const out = exports.describeLocalTarget(payload(type, { thumbnail_url: 'https://evil.test/thumb' }));
    assert.equal(out.media[0].url, original);
    assert.equal(out.media[0].kind, kind);
  }
  for (const type of [undefined, 'image', 'unknown', {}, 1]) assert.equal(exports.describeLocalTarget(payload(type)), null);
  assert.equal(exports.describeLocalTarget(payload('photo', { url: null })), null);
});
test('local message requires every original and rejects deleted/malformed targets', () => {
  assert.equal(typeof exports.describeLocalTarget, 'function');
  const out = exports.describeLocalTarget({ targetType: 'message', target: { content: 'Both', image_url: original, video_url: `${original}/video` } });
  assert.equal(out.media.length, 2);
  for (const target of [null, [], 'bad', {}, { content: {} }, { content: 123 }, { is_deleted: 1, content: 'deleted' }, { content: 'bad', image_url: {} }, { image_url: original, video_url: 'https://evil.test/video' }]) {
    assert.equal(exports.describeLocalTarget({ targetType: 'message', target }), null);
  }
});
test('URLs require HTTPS exact host no credentials or nonstandard port', () => {
  assert.equal(typeof exports.validMediaURL, 'function');
  assert.equal(exports.validMediaURL(original), original);
  for (const url of ['http://media.roammate.com/a', 'https://media.roammate.com.evil.test/a', 'https://evil.test/media.roammate.com', 'https://user:pass@media.roammate.com/a', 'https://media.roammate.com:444/a', '//media.roammate.com/a', 'javascript:alert(1)', {}, null]) assert.equal(exports.validMediaURL(url), null);
});
test('readiness requires loaded original image or actual unmuted video progress', () => {
  assert.equal(typeof exports.originalReady, 'function');
  assert.equal(exports.originalReady({ kind: 'image', complete: true, width: 100 }), true);
  assert.equal(exports.originalReady({ kind: 'image', complete: true, width: 0 }), false);
  const video = { kind: 'video', readyState: 2, currentTime: 1, muted: false, volume: 1, width: 100 };
  assert.equal(exports.originalReady(video), true);
  for (const change of [{ currentTime: 0 }, { readyState: 1 }, { muted: true }, { volume: 0 }, { error: true }, { width: 0 }]) assert.equal(exports.originalReady({ ...video, ...change }), false);
});
test('page wires media only through compile-time development opt-in, with disabled no-JS controls', () => {
  const source = readFileSync(new URL('../src/pages/moderation.astro', import.meta.url), 'utf8');
  assert.match(source, /import\.meta\.env\.DEV && localMediaEnabled\(true, import\.meta\.env\.LOCAL_MODERATION_MEDIA\)/);
  assert.match(source, /localOriginalMedia \? describeLocalTarget/);
  assert.match(source, /<video[^>]*controls[^>]*preload="metadata"/);
  assert.match(source, /disabled=\{mediaReviewRequired\}/);
  assert.match(source, /<noscript>/);
  assert.doesNotMatch(source, /<video[^>]*(autoplay|muted|poster)/);
});
