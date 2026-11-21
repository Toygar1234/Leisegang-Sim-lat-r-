/**
 * Kitap kapakları, sırtları ve ilk sayfaları — tuvalde (canvas) kodla çizilir.
 * Stil: şablondaki serigrafi baskı (mürekkep siyahı, kobalt, vermilyon, krem).
 * Kapaktaki halkalar Jablczynski yasasıyla çizilir: rₙ = r₁·(1+p)ⁿ.
 *
 * Her kapak iki tuval üretir:
 *  - renk (color)
 *  - "ORM": G kanalı = pürüzlülük, B kanalı = metaliklik (yaldız baskı parlasın diye)
 */
import { canvas, tex } from "./textures.js";
import { CLOTH } from "../data/books.js";
import { drawFormula } from "../core/formula.js";
import { mulberry32 } from "../sim/engine.js";

const SERIF = '"Newsreader", Georgia, serif';
const SANS = '"Inter Tight", system-ui, sans-serif';
const MONO = '"JetBrains Mono", monospace';
const WIDE = '"Unbounded", "Archivo Variable", system-ui, sans-serif';

export const FOIL = {
  cobalt: { color: "#E2C27E", orm: "rgb(0,70,255)" },
  vermilion: { color: "#F3D9A0", orm: "rgb(0,70,255)" },
  ink: { color: "#D9B46A", orm: "rgb(0,64,255)" },
  cream: { color: "#2944B8", orm: "rgb(0,80,235)" },
};
const ORM_CLOTH = "rgb(0,212,0)";
const ORM_PRINT = "rgb(0,170,0)";

export async function loadCoverFonts() {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load(`600 80px ${SERIF}`),
    document.fonts.load(`400 80px ${SERIF}`),
    document.fonts.load(`italic 400 40px ${SERIF}`),
    document.fonts.load(`600 30px ${SANS}`),
    document.fonts.load(`500 30px ${SANS}`),
    document.fonts.load(`500 30px ${MONO}`),
    document.fonts.load(`600 60px ${WIDE}`),
    document.fonts.load(`700 60px ${WIDE}`),
  ]).catch(() => {});
}

/** Yazıyı belirli genişliğe sığacak şekilde satırlara böler. */
function wrap(g, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function spaced(g, text, x, y, sp, align = "left") {
  const chars = [...text];
  const widths = chars.map((c) => g.measureText(c).width);
  const total = widths.reduce((s, v) => s + v, 0) + sp * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const a = g.textAlign; g.textAlign = "left";
  chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i] + sp; });
  g.textAlign = a;
  return total;
}

/** Serigrafi benzeri yarım ton (halftone) noktaları. */
function halftone(g, x0, y0, w, h, f, cell, color) {
  g.fillStyle = color;
  for (let y = y0; y < y0 + h; y += cell) {
    for (let x = x0 + ((y / cell) % 2) * cell * 0.5; x < x0 + w; x += cell) {
      const v = f(x, y);
      if (v <= 0.02) continue;
      g.beginPath();
      g.arc(x, y, Math.min(cell * 0.62, v * cell * 0.62), 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** Baskı dokusu: hafif lekeler ve lif çizgileri. */
function printGrain(g, w, h, seed, alpha = 0.06) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${alpha * rnd()})` : `rgba(255,255,255,${alpha * rnd()})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  g.globalAlpha = alpha * 0.7;
  g.strokeStyle = "#000";
  for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y + rnd()); g.lineTo(w, y + rnd()); g.lineWidth = 0.5; g.stroke(); }
  g.globalAlpha = 1;
}

/** Jablczynski dizisi: kapak çizimlerindeki bant konumları. */
function series(x1, p, max, n = 14) {
  const xs = [];
  let x = x1;
  for (let i = 0; i < n && x < max; i++) { xs.push(x); x *= 1 + p; }
  return xs;
}

// ───────────────────────── Çizimler ─────────────────────────
const ART = {
  rings(g, c, R, col, rnd) {
    // Petri kabı
    halftone(g, c.x - R * 1.15, c.y - R * 1.15, R * 2.5, R * 2.5, (x, y) => {
      const d = Math.hypot(x - c.x - R * 0.12, y - c.y - R * 0.14) / R;
      return d < 1.08 && d > 0.9 ? 1 - Math.abs(d - 1) * 6 : 0;
    }, 7, col.ink);
    g.lineWidth = R * 0.035; g.strokeStyle = col.ink;
    g.beginPath(); g.arc(c.x, c.y, R, 0, Math.PI * 2); g.stroke();
    g.lineWidth = R * 0.012;
    g.beginPath(); g.arc(c.x, c.y, R * 0.94, 0, Math.PI * 2); g.stroke();
    // Halkalar (aralık yasası)
    const xs = series(R * 0.1, 0.24, R * 0.9);
    xs.forEach((r, i) => {
      g.strokeStyle = i % 3 === 2 ? col.ink : col.accent;
      g.lineWidth = 2 + r * 0.045;
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.02; a += 0.04) {
        const rr = r * (1 + 0.012 * Math.sin(a * 5 + i) + 0.008 * Math.sin(a * 11 + i * 3));
        const px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr;
        a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.stroke();
    });
    g.fillStyle = col.ink; g.beginPath(); g.arc(c.x, c.y, R * 0.06, 0, Math.PI * 2); g.fill();
  },
  tube(g, c, R, col) {
    g.save(); g.translate(c.x, c.y); g.rotate(-0.16);
    const w = R * 0.42, h = R * 1.9, top = -h / 2;
    // gölge yarım tonu
    halftone(g, -w * 0.5 + 12, top + 14, w + 10, h + 10, (x, y) => (x > w * 0.2 ? 0.8 : 0.0), 7, col.ink);
    // jel
    g.fillStyle = col.gel;
    g.beginPath(); g.moveTo(-w / 2, top + h * 0.16); g.lineTo(-w / 2, top + h - w / 2); g.arc(0, top + h - w / 2, w / 2, Math.PI, 0, true); g.lineTo(w / 2, top + h * 0.16); g.closePath(); g.fill();
    // bantlar
    const xs = series(h * 0.04, 0.28, h * 0.76);
    xs.forEach((x, i) => {
      g.fillStyle = col.accent;
      const bw = 3 + x * 0.05;
      g.fillRect(-w / 2, top + h * 0.16 + x, w, bw);
    });
    // üstteki çözelti
    g.fillStyle = col.ink;
    halftone(g, -w / 2, top + 4, w, h * 0.16 - 4, () => 0.55, 6, col.ink);
    // cam
    g.strokeStyle = col.ink; g.lineWidth = R * 0.03;
    g.beginPath(); g.moveTo(-w / 2, top); g.lineTo(-w / 2, top + h - w / 2); g.arc(0, top + h - w / 2, w / 2, Math.PI, 0, true); g.lineTo(w / 2, top); g.stroke();
    g.beginPath(); g.moveTo(-w / 2 - w * 0.12, top); g.lineTo(w / 2 + w * 0.12, top); g.stroke();
    g.restore();
  },
  paper(g, c, R, col, rnd) {
    g.save(); g.translate(c.x, c.y); g.rotate(0.08);
    g.fillStyle = col.gel; g.fillRect(-R, -R, R * 2, R * 2);
    g.strokeStyle = col.ink; g.lineWidth = 3; g.strokeRect(-R, -R, R * 2, R * 2);
    for (let k = 0; k < 3; k++) {
      const cx = (rnd() - 0.5) * R * 0.9, cy = (rnd() - 0.5) * R * 0.9;
      series(R * 0.06, 0.32, R * 0.7, 8).forEach((r, i) => {
        g.strokeStyle = i % 2 ? col.accent : col.ink; g.lineWidth = 2 + r * 0.04;
        g.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.08) {
          const rr = r * (1 + 0.06 * Math.sin(a * 4 + k * 2) + 0.04 * Math.sin(a * 9));
          a === 0 ? g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        g.stroke();
      });
    }
    g.restore();
  },
  agate(g, c, R, col, rnd) {
    const pts = [];
    for (let a = 0; a < Math.PI * 2; a += 0.3) pts.push([Math.cos(a) * R * (0.85 + rnd() * 0.25), Math.sin(a) * R * (0.75 + rnd() * 0.25)]);
    for (let k = 0; k < 22; k++) {
      const s = 1 - k / 22;
      g.beginPath();
      pts.forEach(([x, y], i) => { const px = c.x + x * s, py = c.y + y * s * (1 - k * 0.006); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.closePath();
      g.fillStyle = [col.ink, col.accent, col.gel, col.accent, col.ink][k % 5];
      g.fill();
    }
  },
  rock(g, c, R, col) {
    g.save(); g.translate(c.x, c.y);
    g.fillStyle = col.gel;
    g.beginPath(); g.moveTo(-R, -R * 0.7); g.lineTo(R * 0.9, -R * 0.9); g.lineTo(R, R * 0.8); g.lineTo(-R * 0.95, R * 0.9); g.closePath(); g.fill(); g.clip();
    series(R * 0.08, 0.2, R * 2.2, 18).forEach((x, i) => {
      g.strokeStyle = i % 2 ? col.accent : col.ink; g.lineWidth = 3 + x * 0.05;
      g.beginPath();
      for (let t = -R * 1.2; t <= R * 1.2; t += 8) { const y = -R * 1.1 + x + Math.sin(t * 0.03 + i) * 10; t === -R * 1.2 ? g.moveTo(t, y) : g.lineTo(t, y); }
      g.stroke();
    });
    g.restore();
  },
  cell(g, c, R, col) {
    g.fillStyle = col.gel; g.beginPath(); g.arc(c.x, c.y, R, 0, Math.PI * 2); g.fill();
    halftone(g, c.x - R, c.y - R, R * 2, R * 2, (x, y) => { const d = Math.hypot(x - c.x, y - c.y) / R; return d < 1 ? 0.25 + 0.3 * Math.sin(d * 30) : 0; }, 9, col.ink);
    series(R * 0.07, 0.3, R * 0.6, 9).forEach((r, i) => { g.strokeStyle = i % 2 ? col.ink : col.accent; g.lineWidth = 2 + r * 0.06; g.beginPath(); g.arc(c.x + R * 0.08, c.y - R * 0.05, r, 0, Math.PI * 2); g.stroke(); });
    g.strokeStyle = col.ink; g.lineWidth = 5; g.beginPath(); g.arc(c.x, c.y, R, 0, Math.PI * 2); g.stroke();
  },
  nano(g, c, R, col) {
    series(R * 0.12, 0.22, R, 12).forEach((r, i) => {
      const n = Math.floor(r * 0.35);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + i * 0.3;
        g.fillStyle = i % 2 ? col.accent : col.ink;
        g.beginPath(); g.arc(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 2 + r * 0.025, 0, Math.PI * 2); g.fill();
      }
    });
  },
  thermal(g, c, R, col) {
    series(R * 0.1, 0.25, R, 12).forEach((r, i) => {
      const t = i / 10;
      g.strokeStyle = `rgba(${Math.round(232 - t * 40)},${Math.round(73 + t * 140)},${Math.round(44 + t * 160)},1)`;
      g.lineWidth = 3 + r * 0.06;
      g.beginPath(); g.arc(c.x, c.y, r, 0, Math.PI * 2); g.stroke();
    });
    g.fillStyle = col.ink; g.font = `600 ${R * 0.22}px ${SANS}`; g.textAlign = "center"; g.fillText("+4 °C", c.x, c.y + R * 1.18);
  },
};

function palette(book) {
  const cl = CLOTH[book.cloth];
  const gel = book.cloth === "cream" ? "#D9CBA6" : book.cloth === "ink" ? "#2A2C33" : book.cloth === "vermilion" ? "#E9765E" : "#3A57C4";
  return { bg: cl.base, ink: cl.ink, accent: cl.accent, gel, foil: FOIL[book.cloth] };
}

/** Ön kapak. */
export function drawFront(book, res = 1) {
  const W = Math.round(720 * res), H = Math.round(1060 * res);
  const c = canvas(W, H), g = c.getContext("2d");
  const o = canvas(W, H), og = o.getContext("2d");
  const col = palette(book);
  const S = res;
  const rnd = mulberry32(parseInt(book.no, 10) * 97 + 3);

  g.fillStyle = col.bg; g.fillRect(0, 0, W, H);
  og.fillStyle = ORM_CLOTH; og.fillRect(0, 0, W, H);

  // Çerçeve (yaldız)
  const frame = (ctx, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 3 * S;
    ctx.strokeRect(34 * S, 34 * S, W - 68 * S, H - 68 * S);
    ctx.lineWidth = 1.2 * S;
    ctx.strokeRect(44 * S, 44 * S, W - 88 * S, H - 88 * S);
  };
  frame(g, col.foil.color); frame(og, col.foil.orm);

  // Üst satır
  g.fillStyle = col.ink; g.font = `600 ${20 * S}px ${SANS}`; g.textBaseline = "alphabetic";
  spaced(g, "LIESEGANG LAB", 72 * S, 96 * S, 4 * S);
  spaced(g, `DENEY No. ${book.no}`, W - 72 * S, 96 * S, 4 * S, "right");
  g.fillRect(72 * S, 112 * S, W - 144 * S, 1.5 * S);

  // Çizim
  g.save();
  const art = ART[book.art] || ART.rings;
  art(g, { x: W / 2, y: 390 * S }, 215 * S, col, rnd);
  g.restore();
  og.fillStyle = ORM_PRINT; og.fillRect(80 * S, 160 * S, W - 160 * S, 470 * S);

  // Başlık (yaldız baskı, geniş modern yazı tipi)
  const maxW = W - 150 * S;
  let size = 74 * S;
  const T = book.title.toLocaleUpperCase("tr-TR");
  g.font = `700 ${size}px ${WIDE}`;
  let lines = wrap(g, T, maxW);
  const widest = () => Math.max(...lines.map((l) => g.measureText(l).width));
  while ((lines.length > 3 || widest() > maxW) && size > 34 * S) { size -= 3 * S; g.font = `700 ${size}px ${WIDE}`; lines = wrap(g, T, maxW); }
  const lh = size * 1.08;
  const ty = 712 * S + (3 - lines.length) * lh * 0.32;
  for (const [ctx, color] of [[g, col.foil.color], [og, col.foil.orm]]) {
    ctx.font = `700 ${size}px ${WIDE}`; ctx.fillStyle = color; ctx.textAlign = "center";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, ty + i * lh));
  }
  const condense = 1;

  // Formül / alt başlık
  g.fillStyle = col.ink; g.textAlign = "left";
  const subY = ty + lines.length * lh - lh * 0.35 + 46 * S;
  if (/[0-9]/.test(book.sub)) drawFormula(g, book.sub, W / 2, subY, { size: 30 * S, family: SANS, weight: 500, align: "center" });
  else { g.font = `italic 400 ${32 * S}px ${SERIF}`; g.textAlign = "center"; g.fillText(book.sub, W / 2, subY); g.textAlign = "left"; }

  // Alt satır: yıl, çökelti rengi, LAB rozeti
  g.fillStyle = col.ink; g.fillRect(72 * S, H - 128 * S, W - 144 * S, 1.5 * S);
  g.font = `500 ${26 * S}px ${MONO}`;
  g.fillText(book.yearLabel || String(book.year), 72 * S, H - 80 * S);
  if (book.colors && book.colors.ppt) {
    g.fillStyle = book.colors.ppt;
    g.beginPath(); g.arc(W / 2 - 40 * S, H - 89 * S, 11 * S, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col.ink; g.lineWidth = 1.5 * S; g.stroke();
    g.fillStyle = col.ink; g.font = `600 ${14 * S}px ${SANS}`; spaced(g, "ÇÖKELTİ", W / 2 - 22 * S, H - 84 * S, 2 * S);
  }
  const bw = 92 * S, bh = 40 * S, bx = W - 72 * S - bw, by = H - 112 * S;
  for (const [ctx, color] of [[g, col.foil.color], [og, col.foil.orm]]) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5 * S; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = color; ctx.font = `600 ${22 * S}px ${SANS}`; spaced(ctx, "LAB", bx + bw / 2, by + bh / 2 + 8 * S, 5 * S, "center");
  }

  printGrain(g, W, H, parseInt(book.no, 10));
  return { color: tex(c), orm: tex(o, { srgb: false }), canvas: c };
}

/** Kitap sırtı: geniş modern yazı tipi, sırtın tam ortasında (yukarıdan aşağı okunur). */
export function drawSpine(book, res = 1, thick = 170) {
  const W = Math.round(thick * res), H = Math.round(1060 * res);
  const c = canvas(W, H), g = c.getContext("2d");
  const o = canvas(W, H), og = o.getContext("2d");
  const col = palette(book);
  const S = res;
  g.fillStyle = col.bg; g.fillRect(0, 0, W, H);
  og.fillStyle = ORM_CLOTH; og.fillRect(0, 0, W, H);

  // Üst etiket bloğu (numara)
  g.fillStyle = col.accent; g.fillRect(0, 70 * S, W, 118 * S);
  og.fillStyle = ORM_PRINT; og.fillRect(0, 70 * S, W, 118 * S);
  g.fillStyle = col.bg; g.font = `700 ${40 * S}px ${WIDE}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(book.no, W / 2, 129 * S);
  // Yaldız çizgiler
  for (const [ctx, color] of [[g, col.foil.color], [og, col.foil.orm]]) {
    ctx.fillStyle = color;
    [40, 50, 206, 214, H / S - 214, H / S - 206, H / S - 50, H / S - 40].forEach((y) => ctx.fillRect(0, y * S, W, 3 * S));
  }

  // Başlık: tek satır sığmazsa iki sütun
  const words = book.spine.split(" ");
  const avail = 600 * S, cy = 560 * S;
  const fit = (lines, maxSize) => {
    let size = maxSize;
    g.font = `600 ${size}px ${WIDE}`;
    const widest = () => Math.max(...lines.map((l) => g.measureText(l).width));
    while (widest() > avail && size > 14 * S) { size -= 1 * S; g.font = `600 ${size}px ${WIDE}`; }
    return size;
  };
  let lines = [book.spine];
  let size = fit(lines, W * 0.36);
  if (size < W * 0.24 && words.length > 1) {
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const L = [words.slice(0, k).join(" "), words.slice(k).join(" ")];
      const sz = fit(L, W * 0.26);
      if (!best || sz > best.sz) best = { L, sz };
    }
    lines = best.L; size = best.sz;
  }
  const gap = size * 1.18;
  for (const [ctx, color] of [[g, col.foil.color], [og, col.foil.orm]]) {
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(Math.PI / 2);
    ctx.font = `600 ${size}px ${WIDE}`; ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * gap));
    ctx.restore();
  }

  // Alt: çökelti rengi noktası + LAB
  if (book.colors && book.colors.ppt) {
    g.fillStyle = book.colors.ppt;
    g.beginPath(); g.arc(W / 2, H - 150 * S, 13 * S, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col.ink; g.lineWidth = 2 * S; g.stroke();
  }
  g.fillStyle = col.ink; g.font = `600 ${17 * S}px ${WIDE}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("LAB", W / 2, H - 100 * S);
  g.textBaseline = "alphabetic";

  // Yuvarlak sırt gölgelendirmesi
  const sh = g.createLinearGradient(0, 0, W, 0);
  sh.addColorStop(0, "rgba(0,0,0,.32)"); sh.addColorStop(0.2, "rgba(0,0,0,0)"); sh.addColorStop(0.5, "rgba(255,255,255,.05)"); sh.addColorStop(0.8, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.32)");
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  printGrain(g, W, H, parseInt(book.no, 10) + 50, 0.05);
  return { color: tex(c), orm: tex(o, { srgb: false }) };
}

/** İlk sayfa (kapak açılınca görünen sayfa). */
export function drawTitlePage(book, res = 1) {
  const W = Math.round(640 * res), H = Math.round(980 * res), S = res;
  const c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#F4EBD7"; g.fillRect(0, 0, W, H);
  const grd = g.createLinearGradient(0, 0, W * 0.12, 0);
  grd.addColorStop(0, "rgba(90,70,40,.25)"); grd.addColorStop(1, "rgba(90,70,40,0)");
  g.fillStyle = grd; g.fillRect(0, 0, W * 0.12, H);
  g.fillStyle = "#1F3FB0"; g.textAlign = "center";
  g.font = `600 ${16 * S}px ${SANS}`; spaced(g, "LIESEGANG LAB", W / 2, 120 * S, 5 * S, "center");
  g.fillStyle = "#141414";
  g.font = `400 ${62 * S}px ${SERIF}`;
  const lines = wrap(g, book.title, W - 140 * S);
  lines.forEach((l, i) => g.fillText(l, W / 2, 260 * S + i * 66 * S));
  g.font = `italic 400 ${26 * S}px ${SERIF}`; g.fillStyle = "#6D6A63";
  g.fillText(`Deney No. ${book.no} · ${book.yearLabel || book.year}`, W / 2, 300 * S + lines.length * 66 * S);
  const cx = W / 2, cy = 680 * S;
  series(10 * S, 0.27, 170 * S, 12).forEach((r, i) => { g.strokeStyle = i % 2 ? "#1F3FB0" : (book.colors?.ppt || "#D8432A"); g.lineWidth = 2 * S + r * 0.04; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); });
  g.fillStyle = "#6D6A63"; g.font = `500 ${15 * S}px ${SANS}`;
  spaced(g, "rₙ = r₁ · (1 + p)ⁿ", W / 2, 900 * S, 2 * S, "center");
  return tex(c);
}
