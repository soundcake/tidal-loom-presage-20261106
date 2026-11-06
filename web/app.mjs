import { MotionSignal, SensorSession } from './signal.mjs';
import { ArtworkRecording } from './recording.mjs';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d'), signal = new MotionSignal();
let mode = 'idle', startAt = 0, phase = 0, colour = 'terra', stopped = false;
const session = new SensorSession(signal, message => { void stop().then(() => { $('status').textContent = message; }); });
const recording = new ArtworkRecording(({ active, url, filename, error }) => {
  if (error) { $('record-status').textContent = error; return; }
  $('record').textContent = active ? 'Finish recording' : 'Record artwork';
  $('record-status').textContent = active ? 'Recording artwork only · up to 60 seconds' : url ? 'Video ready. Download it or start a new recording.' : '';
  $('download').hidden = !url;
  if (url) { $('download').href = url; $('download').download = filename; }
  controls();
});
if (location.protocol === 'file:' && new URLSearchParams(location.search).has('desktop')) {
  import('./live.js').then(() => { $('status').textContent = 'Read the data details before choosing camera mode.'; })
    .catch(() => { $('status').textContent = 'The live adapter could not load. Check the desktop build.'; });
}
const colours = { terra: [173, 91, 61], sage: [76, 117, 83], blue: [56, 102, 125] };
function controls() {
  $('stop').disabled = mode === 'idle' || mode === 'stopping'; $('preview').disabled = mode !== 'idle';
  $('live').disabled = mode !== 'idle'; $('consent').disabled = mode !== 'idle';
  $('key').disabled = mode !== 'idle';
  $('record').disabled = !recording.active && mode !== 'preview' && mode !== 'live';
}
async function stop() {
  recording.stop();
  mode = 'stopping'; phase = 0;
  $('badge').textContent = 'CAMERA OFF'; $('time').textContent = '00:00';
  $('signal').textContent = 'Session cleared.'; $('key').value = ''; $('consent').checked = false;
  $('status').textContent = 'Session cleared. You can start again when you choose.';
  controls();
  try { await session.stop(); } catch { $('status').textContent = 'Session ended. Close this window if the camera indicator remains on.'; }
  mode = 'idle';
  controls();
}
$('preview').onclick = () => {
  mode = 'preview'; phase = 0; startAt = performance.now();
  $('badge').textContent = 'SYNTHETIC PREVIEW';
  $('signal').textContent = 'Illustration only — this motion is generated.';
  $('status').textContent = 'No camera access. Stop to switch to your own movement.'; controls();
};
$('live').onclick = async () => {
  if (!$('consent').checked) { $('status').textContent = 'Read the data details and give consent before starting.'; return; }
  if (!window.createTidalSensor) { $('status').textContent = 'Live mode is available in the configured desktop app. This browser preview never opens your camera.'; return; }
  if (!$('key').value.trim()) { $('status').textContent = 'Enter your SmartSpectra API key to start.'; return; }
  mode = 'starting'; controls(); $('status').textContent = 'Starting camera processing…';
  try {
    await session.start(() => window.createTidalSensor($('key').value.trim()), true);
    $('key').value = '';
    if (mode !== 'starting') return;
    mode = 'live'; startAt = performance.now(); $('badge').textContent = 'LIVE CAMERA';
    $('status').textContent = 'Sit comfortably with your face and upper chest in view. Breathe naturally.';
  } catch (error) { await stop(); $('status').textContent = error.message; }
  controls();
};
$('stop').onclick = stop;
$('record').onclick = () => {
  if (recording.active) { recording.stop(); return; }
  if (mode !== 'preview' && mode !== 'live') return;
  try { recording.start(mode === 'live' ? 'live' : 'synthetic', performance.now()); }
  catch (error) { $('record-status').textContent = error.message; }
};
$('clear').onclick = () => { if (mode === 'idle') phase = 0; else { phase = 0; startAt = performance.now(); } };
document.querySelectorAll('[data-colour]').forEach(button => button.onclick = () => {
  colour = button.dataset.colour;
  document.querySelectorAll('[data-colour]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
});
document.addEventListener('visibilitychange', () => { if (document.hidden) void stop(); });
window.addEventListener('pagehide', () => { stopped = true; recording.discard(); void stop(); });
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let previous = 0;
function draw(now) {
  if (stopped) return;
  const width = canvas.clientWidth, height = canvas.clientHeight, scale = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) { canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); }
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.fillStyle = '#e9e9df'; ctx.fillRect(0, 0, width, height);
  const motion = signal.read(now);
  const active = mode === 'preview' || (mode === 'live' && motion.active);
  const amount = mode === 'preview' ? 0.5 + 0.4 * Math.sin((now - startAt) / 1450) : motion.value;
  if (active) phase += Math.min(now - previous, 40) * (reduced ? 0.00007 : 0.0003);
  previous = now;
  if (mode === 'live') $('signal').textContent = motion.active ? 'Your movement is making this mark.' : motion.hint;
  if (mode === 'live' || mode === 'preview') { const seconds = Math.floor((now - startAt) / 1000); $('time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  const [r,g,b] = colours[colour];
  for (let ribbon = 0; ribbon < 42; ribbon++) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 3) {
      const t = x / width, envelope = Math.sin(t * Math.PI) ** 1.4;
      const amplitude = 44 + (active ? amount : 0.5) * 44;
      const y = height / 2 + envelope * (Math.sin(t * Math.PI * 2 + phase + ribbon * .025) * amplitude + (ribbon - 21) * 2.4);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.15 + .13 * Math.sin(ribbon / 42 * Math.PI)})`; ctx.lineWidth = .8; ctx.stroke();
  }
  const label = recording.source === 'synthetic' ? 'SYNTHETIC PREVIEW · generated motion · no camera' : motion.active ? 'LIVE SMARTSPECTRA · fresh chest-motion signal' : 'LIVE CAMERA · waiting for a clear, fresh signal';
  recording.paint(canvas, label, $('time').textContent, now);
  requestAnimationFrame(draw);
}
controls(); requestAnimationFrame(draw);
