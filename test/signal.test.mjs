import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionSignal, SensorSession } from '../web/signal.mjs';
const metrics = value => ({ breathing: { upperTrace: [{ value }] } });
function sensor() { return { start: async () => {}, stop: async () => {}, destroy: async () => {}, onValidation(fn) { this.validation = fn; }, onMetrics(fn) { this.metrics = fn; }, onError(fn) { this.error = fn; } }; }
test('no movement until validation and three fresh samples; stale output stops painting', () => {
  const s = new MotionSignal(); assert.equal(s.accept(metrics(1), 1, 0), false);
  s.validate(0); [1,2,3].forEach(n => s.accept(metrics(n), n, 100));
  assert.equal(s.read(100).active, true); assert.equal(s.read(2301).active, false);
});
test('bad values and old timestamps cannot refresh a stalled stream', () => {
  const s = new MotionSignal(); s.validate(0); [1,2,3].forEach(n => s.accept(metrics(n), n, 0));
  assert.equal(s.accept(metrics(NaN), 4, 2000), false);
  assert.equal(s.accept(metrics(3), 2, 2000), false); assert.equal(s.read(2300).active, false);
});
test('lost face validation clears the motion window and requires fresh data', () => {
  const s = new MotionSignal(); s.validate(0); [1,2,3].forEach(n => s.accept(metrics(n), n, 100));
  s.validate(2); s.validate(0); assert.equal(s.read(101).active, false); assert.equal(s.samples.length, 0);
});
test('no sensor construction without consent', async () => {
  const session = new SensorSession(new MotionSignal()); let created = false;
  await assert.rejects(session.start(() => { created = true; return sensor(); }, false), /Consent/); assert.equal(created, false);
});
test('stop clears data, stops and destroys capture, and ignores late events', async () => {
  const s = new MotionSignal(), session = new SensorSession(s), fake = sensor(); let stops = 0, destroys = 0;
  fake.stop = async () => { stops++; }; fake.destroy = async () => { destroys++; };
  await session.start(() => fake, true, () => 100); fake.validation(0); fake.metrics(metrics(1), 1);
  await session.stop(); fake.validation(0); fake.metrics(metrics(9), 2);
  assert.equal(s.samples.length, 0); assert.equal(stops, 1); assert.equal(destroys, 1);
});
test('start failure releases capture and does not leave a reusable live session', async () => {
  const session = new SensorSession(new MotionSignal()), fake = sensor(); let destroyed = false;
  fake.start = async () => { throw new Error('Camera unavailable'); }; fake.destroy = async () => { destroyed = true; };
  await assert.rejects(session.start(() => fake, true), /Camera unavailable/); assert.equal(destroyed, true); assert.equal(session.sensor, null);
});
test('stop failure still destroys capture', async () => {
  const session = new SensorSession(new MotionSignal()), fake = sensor(); let destroyed = false;
  fake.stop = async () => { throw new Error('stop failed'); }; fake.destroy = async () => { destroyed = true; };
  await session.start(() => fake, true); await assert.rejects(session.stop(), /stop failed/); assert.equal(destroyed, true);
});
test('stopping while camera permission is pending waits for acquisition then releases it', async () => {
  const session = new SensorSession(new MotionSignal()), fake = sensor(); let finish, stops = 0;
  fake.start = () => new Promise(resolve => { finish = resolve; }); fake.stop = async () => { stops++; };
  const starting = session.start(() => fake, true); await Promise.resolve();
  const stopping = session.stop(); assert.equal(stops, 0);
  await assert.rejects(session.start(() => sensor(), true), /End the current/);
  finish(); await starting; await stopping; assert.equal(stops, 1); assert.equal(session.sensor, null);
});
