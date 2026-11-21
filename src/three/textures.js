/**
 * Kodla üretilen dokular (fotoğraf dosyası yok → internetsiz çalışır, lisans sorunu yok).
 */
import * as THREE from "three";
import { mulberry32 } from "../sim/engine.js";

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

export function tex(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.needsUpdate = true;
  return t;
}

/** Yükseklik haritasından normal haritası üretir. */
export function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext("2d").getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const octx = out.getContext("2d");
  const img = octx.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * strength;
    const dy = (H(x, y - 1) - H(x, y + 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    img.data[i] = (dx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

/** Kitap bezi örgüsünün normal haritası (tekrarlanır). */
export function clothNormal() {
  return once("clothN", () => {
    const s = 128, c = canvas(s, s), g = c.getContext("2d");
    const rnd = mulberry32(3);
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    const n = 16, cell = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const over = (x + y) % 2 === 0;
      const v = 110 + rnd() * 40;
      const grd = over ? g.createLinearGradient(x * cell, 0, x * cell + cell, 0) : g.createLinearGradient(0, y * cell, 0, y * cell + cell);
      grd.addColorStop(0, `rgb(${v - 60},${v - 60},${v - 60})`);
      grd.addColorStop(0.5, `rgb(${v + 70},${v + 70},${v + 70})`);
      grd.addColorStop(1, `rgb(${v - 60},${v - 60},${v - 60})`);
      g.fillStyle = grd;
      g.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    }
    return tex(heightToNormal(c, 1.6), { srgb: false, repeat: [10, 14] });
  });
}

/** Sayfa bloğu kenarı: ince yatay çizgiler (sayfalar). */
export function pageEdge(color = "#F3EAD6") {
  return once("page" + color, () => {
    const c = canvas(64, 512), g = c.getContext("2d");
    g.fillStyle = color; g.fillRect(0, 0, 64, 512);
    const rnd = mulberry32(9);
    for (let y = 0; y < 512; y += 2) {
      g.fillStyle = `rgba(110,90,60,${0.05 + rnd() * 0.12})`;
      g.fillRect(0, y, 64, 1);
    }
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, "rgba(120,95,60,.18)"); grd.addColorStop(0.1, "rgba(0,0,0,0)"); grd.addColorStop(0.9, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(120,95,60,.18)");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 512);
    const t = tex(c); t.rotation = Math.PI / 2; t.center.set(0.5, 0.5);
    return t;
  });
}

/** Ceviz ağacı rafı: renk + normal. */
export function walnut() {
  return once("walnut", () => {
    const w = 1024, h = 128, c = canvas(w, h), g = c.getContext("2d");
    const hc = canvas(w, h), hg = hc.getContext("2d");
    const rnd = mulberry32(42);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#5a3a22"); grd.addColorStop(1, "#3e2615");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    hg.fillStyle = "#808080"; hg.fillRect(0, 0, w, h);
    for (let k = 0; k < 140; k++) {
      const y0 = rnd() * h, amp = 2 + rnd() * 6, freq = 0.002 + rnd() * 0.01, ph = rnd() * 6;
      const dark = rnd() < 0.5;
      g.strokeStyle = dark ? `rgba(30,16,8,${0.15 + rnd() * 0.3})` : `rgba(140,95,55,${0.08 + rnd() * 0.15})`;
      hg.strokeStyle = dark ? "rgba(40,40,40,.5)" : "rgba(200,200,200,.4)";
      g.lineWidth = hg.lineWidth = 0.6 + rnd() * 1.8;
      g.beginPath(); hg.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1) * amp * 0.3;
        x === 0 ? (g.moveTo(x, y), hg.moveTo(x, y)) : (g.lineTo(x, y), hg.lineTo(x, y));
      }
      g.stroke(); hg.stroke();
    }
    return { map: tex(c, { repeat: [3, 1] }), normalMap: tex(heightToNormal(hc, 1.2), { srgb: false, repeat: [3, 1] }) };
  });
}

/** Mermer desenli iç kapak (ebru benzeri), Liesegang halkaları motifiyle. */
export function marble(seed = 1, colors = ["#1F3FB0", "#D8432A", "#F1E6CC", "#141414"]) {
  return once("marble" + seed + colors.join(), () => {
    const w = 512, h = 768, c = canvas(w, h), g = c.getContext("2d");
    const rnd = mulberry32(seed);
    g.fillStyle = colors[2]; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const x = rnd() * w, y = rnd() * h, R = 30 + rnd() * 120;
      const col = colors[Math.floor(rnd() * colors.length)];
      for (let r = R, i = 0; r > 4; r *= 0.78, i++) {
        g.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.12) {
          const rr = r * (1 + 0.08 * Math.sin(a * 3 + k) + 0.05 * Math.sin(a * 7 + i));
          const px = x + Math.cos(a) * rr * 1.1, py = y + Math.sin(a) * rr;
          a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath();
        g.fillStyle = i % 2 ? colors[2] : col;
        g.globalAlpha = 0.9;
        g.fill();
      }
    }
    g.globalAlpha = 1;
    // Tarak çekme (ebru) efekti
    const img = g.getImageData(0, 0, w, h), out = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = Math.min(w - 1, Math.max(0, Math.round(x + Math.sin(y * 0.045) * 14)));
      const sy = Math.min(h - 1, Math.max(0, Math.round(y + Math.sin(x * 0.03 + y * 0.01) * 10)));
      const i = (y * w + x) * 4, j = (sy * w + sx) * 4;
      out.data[i] = img.data[j]; out.data[i + 1] = img.data[j + 1]; out.data[i + 2] = img.data[j + 2]; out.data[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    return tex(c);
  });
}

/** Mezür/beher üzerindeki ölçek çizgileri (şeffaf zemin). */
export function graduation({ marks = 10, label = "mL", step = 10, color = "#ffffff" } = {}) {
  return once("grad" + marks + label + step + color, () => {
    const w = 512, h = 1024, c = canvas(w, h), g = c.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 4;
    g.font = '600 38px "Inter Tight", sans-serif'; g.textBaseline = "middle";
    for (let i = 0; i <= marks * 5; i++) {
      const y = h - 60 - (i / (marks * 5)) * (h - 140);
      const major = i % 5 === 0;
      g.beginPath(); g.moveTo(40, y); g.lineTo(major ? 150 : 100, y); g.stroke();
      if (major && i > 0) g.fillText(String((i / 5) * step), 165, y);
    }
    g.fillText(label, 40, 40);
    const t = tex(c); t.wrapS = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** GHS tehlike işareti (kırmızı çerçeveli eşkenar dörtgen) — tuval üzerine çizim. */
export function drawGHS(g, code, x, y, s) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.PI / 4);
  g.fillStyle = "#fff"; g.strokeStyle = "#d4161b"; g.lineWidth = s * 0.07;
  const a = s * 0.66;
  g.fillRect(-a / 2, -a / 2, a, a); g.strokeRect(-a / 2, -a / 2, a, a);
  g.restore();
  g.save(); g.translate(x, y); g.fillStyle = "#111"; g.strokeStyle = "#111"; g.lineWidth = s * 0.04;
  const k = s * 0.2;
  g.beginPath();
  switch (code) {
    case "GHS03": g.arc(0, k * 0.5, k * 0.6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-k * 0.3, -k * 0.2); g.quadraticCurveTo(0, -k * 1.4, k * 0.3, -k * 0.2); g.fill(); break;
    case "GHS05": g.fillRect(-k, k * 0.5, k * 2, k * 0.25); g.fillRect(-k * 0.8, -k, k * 0.4, k * 0.9); g.fillRect(k * 0.4, -k, k * 0.4, k * 0.9); break;
    case "GHS06": g.arc(0, -k * 0.2, k * 0.55, 0, Math.PI * 2); g.fill(); g.fillRect(-k * 0.8, k * 0.55, k * 1.6, k * 0.18); break;
    case "GHS07": g.fillRect(-k * 0.12, -k * 0.9, k * 0.24, k * 1.2); g.fillRect(-k * 0.12, k * 0.5, k * 0.24, k * 0.26); break;
    case "GHS08": g.arc(0, -k * 0.6, k * 0.3, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(-k * 0.55, k); g.lineTo(-k * 0.4, -k * 0.2); g.lineTo(k * 0.4, -k * 0.2); g.lineTo(k * 0.55, k); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(0, -k * 0.1); g.lineTo(k * 0.15, k * 0.25); g.lineTo(0, k * 0.6); g.lineTo(-k * 0.15, k * 0.25); g.fill(); break;
    case "GHS09": g.moveTo(-k, k * 0.6); g.lineTo(k, k * 0.6); g.stroke(); g.beginPath(); g.moveTo(-k * 0.6, k * 0.6); g.lineTo(-k * 0.6, -k * 0.6); g.stroke(); g.beginPath(); g.ellipse(k * 0.35, k * 0.2, k * 0.45, k * 0.2, 0, 0, Math.PI * 2); g.fill(); break;
    default: break;
  }
  g.restore();
}

/** GHS işaretinin SVG hâli (HTML'de kullanmak için). */
export function ghsSVG(code, title = "") {
  const sym = {
    GHS03: '<circle cx="32" cy="38" r="8" fill="none" stroke="#111" stroke-width="3"/><path d="M27 33 Q32 14 37 33Z" fill="#111"/>',
    GHS05: '<rect x="18" y="38" width="28" height="4" fill="#111"/><rect x="20" y="20" width="6" height="14" fill="#111"/><rect x="38" y="20" width="6" height="14" fill="#111"/><path d="M23 34v2M41 34v2" stroke="#111" stroke-width="2"/>',
    GHS06: '<circle cx="32" cy="28" r="8" fill="#111"/><rect x="21" y="38" width="22" height="3" fill="#111"/><circle cx="29" cy="27" r="2" fill="#fff"/><circle cx="35" cy="27" r="2" fill="#fff"/>',
    GHS07: '<rect x="29.5" y="18" width="5" height="18" fill="#111"/><rect x="29.5" y="39" width="5" height="5" fill="#111"/>',
    GHS08: '<circle cx="32" cy="22" r="5" fill="#111"/><path d="M24 46 L26 30 H38 L40 46Z" fill="#111"/><path d="M32 32 l3 5 -3 6 -3 -6Z" fill="#fff"/>',
    GHS09: '<path d="M18 42 H46" stroke="#111" stroke-width="2.5"/><path d="M24 42 V24 M24 30 l-4-4 M24 32 l4-4" stroke="#111" stroke-width="2.5" fill="none"/><ellipse cx="37" cy="37" rx="7" ry="3.5" fill="#111"/>',
  }[code] || "";
  return `<svg class="ghs" viewBox="0 0 64 64" role="img" aria-label="${title}"><title>${title}</title><rect x="13" y="13" width="38" height="38" transform="rotate(45 32 32)" fill="#fff" stroke="#d4161b" stroke-width="4"/>${sym}</svg>`;
}
