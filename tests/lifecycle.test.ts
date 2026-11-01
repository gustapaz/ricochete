import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindPauseLifecycle } from '../src/lifecycle';
import { Machine } from '../src/model';

test('blur pauses active simulation, clears input and requires explicit resume', () => {
  const win = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  const m = new Machine(); m.action(); let pressed = true;
  const cleanup = bindPauseLifecycle(win, doc, () => { pressed = false; m.pause(); });
  win.dispatchEvent(new Event('blur'));
  assert.equal(pressed, false); assert.equal(m.mode, 'paused');
  const y = m.y; m.step(1/30); assert.equal(m.y, y);
  m.resume(); assert.equal(m.mode, 'playing'); cleanup();
  win.dispatchEvent(new Event('blur')); assert.equal(m.mode, 'playing');
});

test('hidden document pauses ready state and visibility restoration cannot auto-resume', () => {
  const win = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  const m = new Machine();
  bindPauseLifecycle(win, doc, () => m.pause());
  doc.dispatchEvent(new Event('visibilitychange')); assert.equal(m.mode, 'ready');
  doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(m.mode, 'paused');
  doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(m.mode, 'paused');
  m.resume(); assert.equal(m.mode, 'ready');
});
