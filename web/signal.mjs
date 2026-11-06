/** Convert a fresh chest-motion trace into bounded ink movement, without targets. */
export class MotionSignal {
  constructor() { this.clear(); }
  clear() {
    this.samples = [];
    this.lastTimestamp = -Infinity;
    this.lastArrival = -Infinity;
    this.valid = false;
    this.value = 0.5;
  }
  validate(code) {
    this.valid = code === 0;
    if (!this.valid) { this.samples = []; this.lastArrival = -Infinity; }
  }
  accept(metrics, timestamp, now) {
    if (!this.valid || !Number.isFinite(timestamp) || timestamp <= this.lastTimestamp) return false;
    const point = metrics?.breathing?.upperTrace?.at(-1);
    if (!Number.isFinite(point?.value)) return false;
    this.lastTimestamp = timestamp;
    this.lastArrival = now;
    this.samples.push(point.value);
    if (this.samples.length > 180) this.samples.shift();
    const low = Math.min(...this.samples), high = Math.max(...this.samples);
    const next = high - low > 1e-7 ? (point.value - low) / (high - low) : 0.5;
    this.value += (next - this.value) * 0.14;
    return true;
  }
  read(now) {
    const active = this.valid && now - this.lastArrival <= 2200 && this.samples.length >= 3;
    return { active, value: this.value };
  }
}

/** Generation guards prevent a stopped or superseded sensor from painting. */
export class SensorSession {
  constructor(signal, report = () => {}) {
    this.signal = signal;
    this.report = report;
    this.generation = 0;
    this.sensor = null;
    this.stopping = null;
    this.starting = null;
  }
  async start(create, consent, now = () => performance.now()) {
    if (!consent) throw new Error('Consent is required before opening the camera.');
    if (this.sensor || this.stopping) throw new Error('End the current session first.');
    const token = ++this.generation;
    const sensor = this.sensor = create();
    this.signal.clear();
    sensor.onValidation(code => { if (token === this.generation) this.signal.validate(code); });
    sensor.onMetrics((metrics, timestamp) => {
      if (token === this.generation) this.signal.accept(metrics, timestamp, now());
    });
    sensor.onError(message => {
      if (token === this.generation) { this.report(message); void this.stop().catch(() => {}); }
    });
    this.starting = Promise.resolve().then(() => sensor.start());
    try { await this.starting; }
    catch (error) { if (token === this.generation) await this.stop(); throw error; }
    finally { this.starting = null; }
  }
  async stop() {
    if (this.stopping) return this.stopping;
    ++this.generation;
    this.signal.clear();
    const sensor = this.sensor;
    this.sensor = null;
    if (!sensor) return;
    const starting = this.starting;
    this.stopping = (async () => {
      if (starting) await starting.catch(() => {});
      try { await sensor.stop(); }
      finally { await sensor.destroy(); }
    })();
    try { await this.stopping; }
    finally { this.stopping = null; }
  }
}
