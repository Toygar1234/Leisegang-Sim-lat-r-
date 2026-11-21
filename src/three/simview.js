/**
 * Simülasyon → doku (texture). Hesaplanan derişimleri gerçekçi renklere çevirir:
 *  - jelin rengi iç elektrolit tükendikçe solar (ör. dikromatın turuncusu)
 *  - çökelti rengi bant kalınlığına göre koyulaşır, zamanla "yaşlanır" (Mn kahverengileşir)
 *  - kompleks iyonlar çözeltiyi boyar (Cu → lacivert)
 * Görünüm modları: "ppt" (gerçekçi), "a" (dış iyon), "b" (iç iyon), "thermal" (ısı kamerası)
 */
import * as THREE from "three";
import { mulberry32 } from "../sim/engine.js";

const hex = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
const lerp = (a, b, t) => a + (b - a) * t;

/** Isı kamerası paleti (koyu mor → kırmızı → sarı → beyaz). */
function thermal(t) {
  const stops = [[10, 6, 40], [70, 20, 120], [200, 40, 90], [250, 120, 30], [255, 220, 90], [255, 255, 235]];
  const x = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x), f = x - i;
  return stops[i].map((v, k) => lerp(v, stops[i + 1][k], f));
}

export class SimTexture {
  /**
   * @param {import("../sim/engine.js").LiesegangSim} sim
   * @param {object} colors  kitabın renkleri
   * @param {object} o  { geometry, size, aging }
   */
  constructor(sim, colors, o = {}) {
    this.sim = sim;
    this.geometry = sim.p.geometry === "radial" ? "radial" : "tube";
    this.mode = o.mode || (colors.thermal ? "ppt" : "ppt");
    this.aging = o.aging || 0;
    this.setColors(colors);
    if (this.geometry === "tube") {
      this.w = 24; this.h = sim.p.N;
      this.jitter = new Float32Array(this.w);
      const rnd = mulberry32(5);
      for (let i = 0; i < this.w; i++) this.jitter[i] = (rnd() - 0.5) * 0.9;
    } else {
      const S = o.size || 384;
      this.w = this.h = S;
      // Her piksel için hücre indeksi (açıya bağlı küçük dalgalanmalarla)
      this.idx = new Float32Array(S * S);
      this.inside = new Uint8Array(S * S);
      const N = sim.p.N, c = (S - 1) / 2;
      const rnd = mulberry32(11);
      const ph = Array.from({ length: 6 }, () => rnd() * Math.PI * 2);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = x - c, dy = y - c, r = Math.hypot(dx, dy) / c;
        const k = y * S + x;
        if (r > 1) { this.inside[k] = 0; continue; }
        this.inside[k] = 1;
        const a = Math.atan2(dy, dx);
        const wob = 0.9 * Math.sin(a * 3 + ph[0]) + 0.6 * Math.sin(a * 5 + ph[1]) + 0.35 * Math.sin(a * 11 + ph[2]) + 0.25 * Math.sin(a * 17 + ph[3]);
        this.idx[k] = Math.max(0, r * (N - 1) + wob * r * 1.6);
      }
    }
    this.data = new Uint8Array(this.w * this.h * 4);
    this.texture = new THREE.DataTexture(this.data, this.w, this.h, THREE.RGBAFormat);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.RepeatWrapping;
    this.update();
  }

  setColors(colors) {
    this.colors = colors;
    this.cGel = hex(colors.gel);
    this.cBase = hex("#EEF0EE");
    this.cOut = hex(colors.outer || "#F2F5F7");
    this.cPpt = hex(colors.ppt);
    this.cAged = hex(colors.pptAged || colors.ppt);
    this.cCx = hex(colors.complex || colors.ppt);
    this.outTint = colors.outer && !/^#F[0-9A-F]F[0-9A-F]F[0-9A-F]$/i.test(colors.outer) && colors.outer.toUpperCase() !== "#F2F5F7" && colors.outer.toUpperCase() !== "#EEF1F4";
  }

  /** Tek bir hücrenin rengini hesaplar (0–255). */
  cellColor(i, out, jitter = 0) {
    const s = this.sim, p = s.p;
    const j = Math.min(p.N - 1, Math.max(0, i + jitter));
    const i0 = Math.floor(j), f = j - i0, i1 = Math.min(p.N - 1, i0 + 1);
    const d = s.d[i0] * (1 - f) + s.d[i1] * f;
    const a = s.a[i0] * (1 - f) + s.a[i1] * f;
    const b = s.b[i0] * (1 - f) + s.b[i1] * f;
    const cx = s.cx[i0] * (1 - f) + s.cx[i1] * f;
    if (this.mode === "a") { const t = Math.min(1, a / p.a0); out[0] = lerp(14, 99, t); out[1] = lerp(24, 227, t); out[2] = lerp(52, 242, t); return; }
    if (this.mode === "b") { const t = Math.min(1, b / p.b0); out[0] = lerp(14, 245, t); out[1] = lerp(24, 150, t); out[2] = lerp(52, 60, t); return; }
    if (this.mode === "thermal") { const t = 0.08 + Math.min(1, d / (p.b0 * 1.4)) * 0.9; const c = thermal(t); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return; }
    // Gerçekçi: jel rengi (iç elektrolitle), dış iyon tonu, kompleks, çökelti
    const tb = Math.min(1, b / p.b0);
    let r = lerp(this.cBase[0], this.cGel[0], tb), g = lerp(this.cBase[1], this.cGel[1], tb), bl = lerp(this.cBase[2], this.cGel[2], tb);
    if (this.outTint) { const ta = Math.min(1, a / p.a0) * 0.75; r = lerp(r, this.cOut[0], ta); g = lerp(g, this.cOut[1], ta); bl = lerp(bl, this.cOut[2], ta); }
    if (cx > 0) { const tc = 1 - Math.exp(-cx / (p.b0 * 0.5)); r = lerp(r, this.cCx[0], tc); g = lerp(g, this.cCx[1], tc); bl = lerp(bl, this.cCx[2], tc); }
    if (d > 0) {
      const td = 1 - Math.exp(-d / (p.b0 * 0.55));
      let pr = this.cPpt[0], pg = this.cPpt[1], pb = this.cPpt[2];
      if (this.aging) {
        const tn = s.tNuc[i0];
        if (Number.isFinite(tn)) { const ag = 1 - Math.exp(-(s.t - tn) / this.aging); pr = lerp(pr, this.cAged[0], ag); pg = lerp(pg, this.cAged[1], ag); pb = lerp(pb, this.cAged[2], ag); }
      }
      r = lerp(r, pr, td); g = lerp(g, pg, td); bl = lerp(bl, pb, td);
    }
    out[0] = r; out[1] = g; out[2] = bl;
  }

  update() {
    const D = this.data, out = [0, 0, 0];
    if (this.geometry === "tube") {
      const N = this.sim.p.N, W = this.w;
      for (let i = 0; i < N; i++) {
        const row = N - 1 - i;
        for (let x = 0; x < W; x++) {
          this.cellColor(i, out, this.jitter[x] * Math.min(1, i / 60));
          const k = (row * W + x) * 4;
          D[k] = out[0]; D[k + 1] = out[1]; D[k + 2] = out[2]; D[k + 3] = 255;
        }
      }
    } else {
      const S = this.w;
      const N = this.sim.p.N;
      // Hücre renklerini önce bir kez hesapla, sonra piksellere dağıt (hızlı)
      if (!this.lut || this.lut.length !== N * 3) this.lut = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { this.cellColor(i, out); this.lut[i * 3] = out[0]; this.lut[i * 3 + 1] = out[1]; this.lut[i * 3 + 2] = out[2]; }
      const L = this.lut;
      for (let k = 0; k < S * S; k++) {
        const o = k * 4;
        if (!this.inside[k]) { D[o] = L[(N - 1) * 3]; D[o + 1] = L[(N - 1) * 3 + 1]; D[o + 2] = L[(N - 1) * 3 + 2]; D[o + 3] = 255; continue; }
        const j = this.idx[k], i0 = Math.min(N - 1, j | 0), f = j - i0, i1 = Math.min(N - 1, i0 + 1);
        D[o] = L[i0 * 3] * (1 - f) + L[i1 * 3] * f;
        D[o + 1] = L[i0 * 3 + 1] * (1 - f) + L[i1 * 3 + 1] * f;
        D[o + 2] = L[i0 * 3 + 2] * (1 - f) + L[i1 * 3 + 2] * f;
        D[o + 3] = 255;
      }
    }
    this.texture.needsUpdate = true;
  }
}

/** Gerçek süre: tüp 60 mm / 600 hücre (0,1 mm), D ≈ 1,5·10⁻⁹ m²/s → 1 zaman birimi ≈ 6,7 s. */
export function realSeconds(sim) {
  const dx = sim.p.geometry === "radial" ? 0.15e-3 : 0.1e-3;
  return sim.t * (dx * dx) / 1.5e-9;
}
export function fmtDuration(sec) {
  if (sec < 60) return `${Math.round(sec)} sn`;
  const m = sec / 60, h = m / 60, d = h / 24;
  if (h < 1) return `${Math.round(m)} dk`;
  if (d < 1) return `${Math.floor(h)} sa ${Math.round(m % 60)} dk`;
  return `${Math.floor(d)} gün ${Math.round(h % 24)} sa`;
}
