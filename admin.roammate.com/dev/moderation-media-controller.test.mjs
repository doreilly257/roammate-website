import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(name, require = () => {}) {
  const path = new URL(`../src/lib/${name}.ts`, import.meta.url);
  const exports = {};
  if (existsSync(path)) vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require });
  return exports;
}
const media = load('moderation-media');
const controller = load('moderation-media-controller', () => media);
class Node {
  constructor(props = {}) { Object.assign(this, { listeners: {}, dataset: {}, checked: false, disabled: true, textContent: '' }, props); }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  fire(type) { for (const fn of this.listeners[type] ?? []) fn({ preventDefault() {} }); }
}
function fixture() {
  const image = new Node({ tagName: 'IMG', complete: false, naturalWidth: 0 });
  const video = new Node({ tagName: 'VIDEO', error: null, readyState: 0, currentTime: 0, videoWidth: 0, muted: false, volume: 1, paused: false, seeking: false });
  const reviewed = new Node();
  const dismiss = new Node();
  const eject = new Node({ dataset: { unavailable: 'true' } });
  const status = new Node();
  const form = new Node();
  const window = new Node();
  const root = { ownerDocument: { defaultView: window }, querySelectorAll: (s) => s === '[data-review-original]' ? [image, video] : [dismiss, eject], querySelector: (s) => s === '[name="reviewed"]' ? reviewed : s === '[data-media-status]' ? status : form };
  return { root, image, video, reviewed, dismiss, eject, status, window };
}
test('media controller fails closed until all originals and explicit acknowledgement', () => {
  assert.equal(typeof controller.bindMediaReview, 'function');
  const f = fixture();
  controller.bindMediaReview(f.root);
  assert.equal(f.reviewed.disabled, true);
  f.image.complete = true; f.image.naturalWidth = 100; f.image.fire('load');
  assert.equal(f.reviewed.disabled, true);
  Object.assign(f.video, { readyState: 2, videoWidth: 100, currentTime: 0 }); f.video.fire('loadedmetadata');
  assert.equal(f.reviewed.disabled, true);
  f.video.fire('playing'); f.video.currentTime = 1; f.video.fire('timeupdate');
  assert.equal(f.reviewed.disabled, false);
  assert.equal(f.dismiss.disabled, true);
  f.reviewed.checked = true; f.reviewed.fire('change');
  assert.equal(f.dismiss.disabled, false);
  assert.equal(f.eject.disabled, true);
  f.video.error = {}; f.video.fire('error');
  assert.equal(f.reviewed.checked, false);
  assert.equal(f.dismiss.disabled, true);
  assert.match(f.status.textContent, /unavailable|failed/i);
});
test('back-forward cache restoration cannot restore prior acknowledgement', () => {
  const f = fixture();
  Object.assign(f.image, { complete: true, naturalWidth: 100 });
  Object.assign(f.video, { readyState: 2, videoWidth: 100, currentTime: 1 });
  controller.bindMediaReview(f.root);
  f.video.fire('playing'); f.video.currentTime = 2; f.video.fire('timeupdate');
  f.reviewed.checked = true; f.reviewed.fire('change');
  assert.equal(f.dismiss.disabled, false);
  f.window.fire('pageshow');
  assert.equal(f.reviewed.checked, false);
  assert.equal(f.dismiss.disabled, true);
});
test('muting, emptied, source change and image failure reset acknowledgement', () => {
  assert.equal(typeof controller.bindMediaReview, 'function');
  for (const event of ['volumechange', 'emptied', 'loadstart', 'error']) {
    const f = fixture();
    Object.assign(f.image, { complete: true, naturalWidth: 100 });
    Object.assign(f.video, { readyState: 2, videoWidth: 100, currentTime: 1 });
    controller.bindMediaReview(f.root);
    f.video.fire('playing'); f.video.currentTime = 2; f.video.fire('timeupdate');
    f.reviewed.checked = true; f.reviewed.fire('change');
    if (event === 'volumechange') f.video.muted = true;
    (event === 'error' ? f.image : f.video).fire(event);
    assert.equal(f.reviewed.checked, false);
    assert.equal(f.dismiss.disabled, true);
  }
});
test('seek-only progress never unlocks review without actual playing and subsequent progress', () => {
  const f = fixture();
  Object.assign(f.image, { complete: true, naturalWidth: 100 });
  Object.assign(f.video, { readyState: 2, videoWidth: 100, currentTime: 10, paused: true });
  controller.bindMediaReview(f.root);
  f.video.fire('timeupdate');
  assert.equal(f.reviewed.disabled, true);
  f.video.paused = false; f.video.fire('playing');
  assert.equal(f.reviewed.disabled, true);
  f.video.currentTime = 11; f.video.fire('timeupdate');
  assert.equal(f.reviewed.disabled, false);
  f.reviewed.checked = true; f.reviewed.fire('change');
  f.video.seeking = true; f.video.fire('seeking');
  f.video.currentTime = 20; f.video.fire('timeupdate');
  assert.equal(f.reviewed.checked, false);
  assert.equal(f.reviewed.disabled, true);
});
