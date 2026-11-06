/** Records the artwork canvas only. Camera frames and API keys are never drawn. */
export class ArtworkRecording {
  constructor(update) {
    this.update = update;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 800;
    this.context = this.canvas.getContext('2d');
    this.recorder = null;
    this.stream = null;
    this.url = null;
    this.startedAt = 0;
  }
  get active() { return this.recorder !== null; }
  start(source, now) {
    if (this.active) return;
    if (typeof MediaRecorder === 'undefined' || !this.canvas.captureStream) throw new Error('This browser cannot record the artwork.');
    this.discard();
    this.startedAt = now;
    this.source = source;
    const chunks = [];
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    this.stream = this.canvas.captureStream(30);
    try {
      const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      this.recorder = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
        this.recorder = null;
        if (chunks.length) this.url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        this.update({ active: false, url: this.url, filename: `tidal-loom-${source}-${new Date().toISOString().replaceAll(':', '-')}.webm` });
      };
      recorder.onerror = () => { this.stop(); this.update({ error: 'Recording stopped. You can try again.' }); };
      recorder.start(1000);
      this.update({ active: true, url: null });
    } catch (error) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.recorder = null;
      throw error;
    }
  }
  paint(artwork, label, sessionTime, now) {
    if (!this.active) return;
    const ctx = this.context;
    ctx.fillStyle = '#f5f1e9'; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = '#292d29'; ctx.font = '42px Georgia'; ctx.fillText('tidal loom', 56, 72);
    ctx.font = '18px system-ui'; ctx.fillStyle = '#626b5d'; ctx.fillText(label, 56, 115);
    ctx.fillText(sessionTime, 1160, 72);
    ctx.drawImage(artwork, 40, 145, 1200, 570);
    ctx.font = '18px system-ui'; ctx.fillText('Natural movement shapes ink. No target. No score.', 56, 761);
    if (now - this.startedAt >= 60000) this.stop();
  }
  stop() { if (this.recorder?.state === 'recording') this.recorder.stop(); }
  discard() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}
