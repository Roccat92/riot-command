// SFX tuy chon (WebAudio, tong hop tu dong, khong dung file am thanh). Mac dinh TAT; bat bang nut tren HUD.
// Gioi han tan suat: moi loai am toi da ~8 lan/giay de khong tao hang tram node.
let ctx: AudioContext | null = null;
export const sfx = { enabled: false };
const last: Record<string, number> = {};

function ac(): AudioContext | null {
  if (!sfx.enabled) return null;
  if (!ctx) {
    const C = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number): void {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur + 0.02);
}

function noise(dur: number, vol: number, hp = 0): void {
  const a = ac();
  if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource();
  s.buffer = buf;
  const g = a.createGain();
  g.gain.value = vol;
  let node: AudioNode = s;
  if (hp) {
    const f = a.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    s.connect(f);
    node = f;
  }
  node.connect(g).connect(a.destination);
  s.start();
}

export function playSfx(type: string): void {
  if (!sfx.enabled) return;
  const now = performance.now();
  if (now - (last[type] ?? 0) < 120) return;
  last[type] = now;
  switch (type) {
    case 'throw':
      tone('triangle', 520, 180, 0.12, 0.05);
      break;
    case 'block':
      tone('square', 220, 120, 0.08, 0.06);
      break;
    case 'hit':
      noise(0.1, 0.12);
      break;
    case 'glass':
      noise(0.18, 0.1, 3000);
      break;
    case 'fire':
      noise(0.5, 0.14, 300);
      tone('sawtooth', 110, 55, 0.4, 0.05);
      break;
    case 'dodge':
      tone('sine', 300, 700, 0.1, 0.04);
      break;
    case 'wave':
      tone('sawtooth', 220, 330, 0.5, 0.07);
      break;
  }
}
