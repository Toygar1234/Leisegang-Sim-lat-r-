/**
 * Sesler — hepsi Web Audio API ile kodla üretilir (dosya yok, internet gerekmez).
 * Bantların sesi: her yeni bant bir nota çalar; aralıklar açıldıkça notalar seyrekleşir.
 */
import { store } from "./store.js";

let ctx = null, master = null, verb = null;
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.32;
  // Basit yankı (kısa gecikme ağı)
  verb = ctx.createDelay(0.5);
  verb.delayTime.value = 0.16;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
  verb.connect(lp); lp.connect(fb); fb.connect(verb); lp.connect(wet); wet.connect(ctx.destination);
  master.connect(ctx.destination);
  master.connect(verb);
  return ctx;
}

const on = () => store.setting("sound") !== false;

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume();
}

function tone({ freq = 440, type = "sine", dur = 0.25, gain = 0.3, attack = 0.005, when = 0, glide = 0, detune = 0 }) {
  if (!on() || !ensure()) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t + dur);
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise({ dur = 0.3, gain = 0.2, freq = 1200, q = 0.8, type = "bandpass", when = 0, sweep = 0 }) {
  if (!on() || !ensure()) return;
  const t = ctx.currentTime + when;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const sfx = {
  tick: () => tone({ freq: 2200, type: "triangle", dur: 0.04, gain: 0.05 }),
  click: () => { tone({ freq: 880, type: "triangle", dur: 0.06, gain: 0.08 }); },
  slide: () => noise({ dur: 0.28, gain: 0.07, freq: 900, q: 0.6, sweep: 2.2 }),
  open: () => { noise({ dur: 0.5, gain: 0.12, freq: 600, q: 0.5, sweep: 3 }); tone({ freq: 330, type: "sine", dur: 0.6, gain: 0.07, when: 0.12, glide: 1.5 }); },
  close: () => { noise({ dur: 0.35, gain: 0.1, freq: 1800, q: 0.5, sweep: 0.35 }); tone({ freq: 220, type: "sine", dur: 0.25, gain: 0.06, when: 0.05 }); },
  page: () => noise({ dur: 0.18, gain: 0.06, freq: 3000, q: 0.4, type: "highpass" }),
  drip: () => { tone({ freq: 1200, type: "sine", dur: 0.18, gain: 0.12, glide: 0.35 }); tone({ freq: 1800, type: "sine", dur: 0.08, gain: 0.04, when: 0.06, glide: 0.6 }); },
  /** n. bant oluştuğunda çalan nota (pentatonik, yükselen). */
  band: (n) => {
    const m = 72 + PENTA[Math.min(n, PENTA.length - 1)];
    tone({ freq: midi(m), type: "sine", dur: 1.1, gain: 0.09, attack: 0.004 });
    tone({ freq: midi(m + 12), type: "triangle", dur: 0.5, gain: 0.025, attack: 0.002 });
  },
  start: () => { [60, 64, 67].forEach((m, i) => tone({ freq: midi(m), type: "triangle", dur: 0.25, gain: 0.06, when: i * 0.06 })); },
  stop: () => tone({ freq: midi(55), type: "triangle", dur: 0.2, gain: 0.06 }),
  xp: () => { [76, 81, 88].forEach((m, i) => tone({ freq: midi(m), type: "sine", dur: 0.35, gain: 0.07, when: i * 0.07 })); },
  level: () => { [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone({ freq: midi(m), type: "triangle", dur: 0.5, gain: 0.07, when: i * 0.08 })); },
  correct: () => { tone({ freq: midi(79), type: "sine", dur: 0.3, gain: 0.1 }); tone({ freq: midi(84), type: "sine", dur: 0.45, gain: 0.1, when: 0.09 }); },
  wrong: () => { tone({ freq: midi(52), type: "sawtooth", dur: 0.28, gain: 0.04, glide: 0.8 }); },
  whoosh: () => noise({ dur: 0.6, gain: 0.08, freq: 300, q: 0.7, sweep: 6 }),
};
