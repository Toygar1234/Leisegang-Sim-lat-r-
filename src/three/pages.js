/**
 * Kitap sayfaları — her sayfa bir tuvale (canvas) dergi düzeninde çizilir.
 * Sayfa sırası (ilk sağ sayfadan başlar). "popup" sayfasında 3B deney sayfadan yükselir.
 */
import { canvas, tex, drawGHS } from "./textures.js";
import { drawFormula } from "../core/formula.js";
import { CLOTH, GHS, SAFETY_LEVEL, CATEGORIES } from "../data/books.js";
import { mulberry32 } from "../sim/engine.js";

const SERIF = '"Newsreader", Georgia, serif';
const SANS = '"Inter Tight", system-ui, sans-serif';
const WIDE = '"Unbounded", system-ui, sans-serif';
const MONO = '"JetBrains Mono", monospace';
const PAPER = "#F7EFDD";
const INK = "#1a1712";
const MUTED = "#7a7062";

// [[Ag2Cr2O7]] → Ag₂Cr₂O₇ (tuval için Unicode alt/üst simge)
const SUB = "₀₁₂₃₄₅₆₇₈₉", SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" };
export function plain(text = "") {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, f) => uni(f));
}
export function uni(f) {
  let out = "", prev = "";
  for (let i = 0; i < f.length; i++) {
    const c = f[i];
    if (f.startsWith("->", i)) { out += " → "; i++; prev = " "; continue; }
    if (f.startsWith("<=>", i)) { out += " ⇌ "; i += 2; prev = " "; continue; }
    if (c === "^") { i++; while (i < f.length && /[0-9+-]/.test(f[i])) out += SUP[f[i++]]; i--; prev = "^"; continue; }
    if (/[0-9]/.test(c) && /[A-Za-z)\]]/.test(prev)) { out += SUB[+c]; continue; }
    if (c === "v" && /[0-9A-Z)a-z]/.test(prev) && (i + 1 === f.length || f[i + 1] === " ")) { out += "↓"; prev = "v"; continue; }
    out += c; prev = c;
  }
  return out;
}

function wrapLines(g, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Paragraf çizer, yeni y konumunu döndürür. */
function para(g, text, x, y, maxW, { size = 31, lh = 1.42, font = SERIF, weight = 400, color = INK, italic = false } = {}) {
  g.font = `${italic ? "italic " : ""}${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  const lines = wrapLines(g, plain(text), maxW);
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
  return y + lines.length * size * lh;
}

function heading(g, text, x, y, color) {
  g.font = `700 ${26}px ${WIDE}`;
  g.fillStyle = color;
  g.textAlign = "left";
  g.fillText(text.toLocaleUpperCase("tr-TR"), x, y);
  g.fillRect(x, y + 16, 64, 4);
  return y + 62;
}

function paperBase(W, H, side, seed) {
  const c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,95,60,${rnd() * 0.05})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 3); }
  // cilt tarafında gölge (sağ sayfada solda, sol sayfada sağda)
  const gx = side === "right" ? 0 : W;
  const grd = g.createLinearGradient(gx, 0, side === "right" ? W * 0.14 : W * 0.86, 0);
  grd.addColorStop(0, "rgba(80,55,25,.28)"); grd.addColorStop(1, "rgba(80,55,25,0)");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // kenar sararması
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(150,110,50,0)"); v.addColorStop(1, "rgba(150,110,50,.14)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return { c, g };
}

function folio(g, W, H, book, n, side) {
  g.font = `600 18px ${SANS}`; g.fillStyle = MUTED; g.textAlign = side === "right" ? "right" : "left";
  const x = side === "right" ? W - 90 : 90;
  g.fillText(`${book.title.toLocaleUpperCase("tr-TR")} · ${n}`, x, H - 64);
  g.textAlign = "left";
}

function rings(g, cx, cy, R, c1, c2, p = 0.27) {
  let r = R * 0.07;
  for (let i = 0; i < 14 && r < R; i++) { g.strokeStyle = i % 2 ? c1 : c2; g.lineWidth = 2 + r * 0.05; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); r *= 1 + p; }
}

function tubeArt(g, cx, cy, h, ppt, gelC) {
  const w = h * 0.2, top = cy - h / 2;
  g.fillStyle = gelC; g.fillRect(cx - w / 2, top + h * 0.15, w, h * 0.85 - w / 2);
  g.beginPath(); g.arc(cx, top + h - w / 2, w / 2, 0, Math.PI); g.fill();
  let x = h * 0.03;
  for (let i = 0; i < 10 && x < h * 0.72; i++) { g.fillStyle = ppt; g.fillRect(cx - w / 2, top + h * 0.15 + x, w, 3 + x * 0.05); x *= 1.3; }
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx - w / 2, top + h - w / 2); g.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); g.lineTo(cx + w / 2, top); g.stroke();
}

/** Bir kitabın bütün sayfalarını tanımlar (çizim fonksiyonları). */
function pageSpecs(book) {
  const accent = CLOTH[book.cloth].base === "#EDE1C4" ? "#1F3FB0" : CLOTH[book.cloth].base;
  const ppt = book.colors?.ppt || "#D8432A";
  const specs = [];
  const P = (draw, extra = {}) => specs.push({ draw, ...extra });

  // 1. Başlık sayfası
  P((g, W, H) => {
    g.textAlign = "center";
    g.font = `600 20px ${SANS}`; g.fillStyle = accent; g.fillText(`LIESEGANG LAB · ${CATEGORIES.find((c) => c.id === book.cat)?.label.toLocaleUpperCase("tr-TR")}`, W / 2, 150);
    g.font = `700 64px ${WIDE}`; g.fillStyle = INK;
    const lines = wrapLines(g, book.title.toLocaleUpperCase("tr-TR"), W - 180);
    lines.forEach((l, i) => g.fillText(l, W / 2, 290 + i * 76));
    const y0 = 290 + lines.length * 76;
    g.font = `italic 400 34px ${SERIF}`; g.fillStyle = MUTED;
    g.fillText(book.product ? "" : book.sub, W / 2, y0 + 10);
    if (book.product) drawFormula(g, `${book.sub} -> ${book.product}`, W / 2, y0 + 16, { size: 36, family: SERIF, weight: 400, align: "center" });
    if (book.art === "tube" || book.sim?.prefer === "tube") tubeArt(g, W / 2, H * 0.62, H * 0.36, ppt, book.colors?.gel || "#ddd");
    else rings(g, W / 2, H * 0.62, H * 0.2, accent, ppt);
    g.font = `500 26px ${MONO}`; g.fillStyle = INK; g.fillText(`No. ${book.no}  ·  ${book.yearLabel || book.year}${book.yearNote ? "  ·  " + book.yearNote : ""}`, W / 2, H - 150);
    g.textAlign = "left";
  });

  // 2. Özet + neden ilginç
  P((g, W, H) => {
    let y = heading(g, "Kısaca", 90, 160, accent);
    y = para(g, book.lead, 90, y + 10, W - 180, { size: 36, lh: 1.4 });
    if (book.why) { y = heading(g, "Neden ilginç?", 90, y + 70, accent); y = para(g, book.why, 90, y + 10, W - 180); }
    else if (book.sections?.[0]) { y = heading(g, book.sections[0].h, 90, y + 70, accent); y = para(g, book.sections[0].p, 90, y + 10, W - 180); }
  });

  if (book.materials) {
    // 3. Malzemeler
    P((g, W, H) => {
      let y = heading(g, "Ne gerekir?", 90, 160, accent);
      const roleC = { jel: "#7A8CA8", iç: "#D8432A", dış: "#1F3FB0", araç: "#5B5A55" };
      const roleT = { jel: "ORTAM", iç: "İÇ ELEKTROLİT · JELDE", dış: "DIŞ ELEKTROLİT · ÜSTTE", araç: "ARAÇ" };
      for (const m of book.materials) {
        g.fillStyle = roleC[m.rol]; g.fillRect(90, y, 8, 120);
        g.font = `600 18px ${SANS}`; g.fillText(roleT[m.rol], 120, y + 24);
        g.font = `600 34px ${SANS}`; g.fillStyle = INK; g.fillText(m.ad, 120, y + 66);
        if (m.f) { g.fillStyle = accent; drawFormula(g, m.f, W - 90, y + 66, { size: 34, family: SERIF, weight: 400, align: "right" }); }
        const ny = m.not ? para(g, m.not, 120, y + 106, W - 230, { size: 24, color: MUTED, font: SANS, weight: 500, lh: 1.35 }) : y + 100;
        y = Math.max(y + 140, ny + 30);
      }
    });
    // 4. Tepkime
    P((g, W, H) => {
      let y = heading(g, "Hangi tepkime olur?", 90, 160, accent);
      y = para(g, book.reaction.words, 90, y + 10, W - 180, { size: 29, color: MUTED, font: SANS, weight: 500, lh: 1.4 });
      const box = (f, size) => {
        g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(80, y + 20, W - 160, size * 2.3);
        g.strokeStyle = "rgba(26,23,18,.15)"; g.strokeRect(80, y + 20, W - 160, size * 2.3);
        g.fillStyle = INK;
        let s = size;
        while (drawFormula(g, f, 0, 0, { size: s, family: SERIF, weight: 400, measureOnly: true }) > W - 200 && s > 22) s -= 2;
        drawFormula(g, f, W / 2, y + 20 + size * 1.5, { size: s, family: SERIF, weight: 400, align: "center" });
        y += size * 2.3 + 24;
      };
      if (book.reaction.pre) box(book.reaction.pre, 34);
      box(book.reaction.eq, 42);
      if (book.reaction.ionic) box(book.reaction.ionic, 36);
      if (book.reaction.note) y = para(g, book.reaction.note, 90, y + 50, W - 180, { size: 28 });
      g.font = `600 20px ${SANS}`; g.fillStyle = MUTED; g.fillText("↓ = suda çözünmeyen katı (çökelti)", 90, H - 130);
    });
  } else if (book.sections) {
    book.sections.slice(1, 3).forEach((s) => P((g, W) => { let y = heading(g, s.h, 90, 160, accent); para(g, s.p, 90, y + 10, W - 180, { size: 34 }); }));
  }

  // 5. Pop-up sayfası (3B model buradan yükselir)
  P((g, W, H) => {
    g.textAlign = "center";
    g.font = `700 30px ${WIDE}`; g.fillStyle = accent; g.fillText(book.model ? "3B MODEL" : "CANLI DENEY", W / 2, 150);
    g.font = `italic 400 30px ${SERIF}`; g.fillStyle = MUTED;
    g.fillText(book.model ? "Model sayfadan yükseliyor" : "Simülasyon şu anda hesaplanıyor", W / 2, 200);
    // sahne zemini
    const cy = H * 0.72;
    const grd = g.createRadialGradient(W / 2, cy, 10, W / 2, cy, W * 0.42);
    grd.addColorStop(0, "rgba(26,23,18,.22)"); grd.addColorStop(1, "rgba(26,23,18,0)");
    g.fillStyle = grd; g.beginPath(); g.ellipse(W / 2, cy, W * 0.42, W * 0.14, 0, 0, Math.PI * 2); g.fill();
    g.setLineDash([10, 10]); g.strokeStyle = "rgba(26,23,18,.3)"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(W / 2, cy, W * 0.36, W * 0.11, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.font = `600 20px ${SANS}`; g.fillStyle = MUTED;
    g.fillText(book.model ? "Sürükleyerek sayfa çevir · ← → tuşları" : "Her yeni bant oluştuğunda bir nota duyarsın", W / 2, H - 130);
    g.textAlign = "left";
  }, { popup: true });

  if (book.steps) {
    // 6. Nasıl yapılır
    P((g, W, H) => {
      let y = heading(g, "Nasıl yapılır?", 90, 160, accent);
      book.steps.forEach((s, i) => {
        g.font = `500 22px ${MONO}`; g.fillStyle = accent; g.fillText(String(i + 1).padStart(2, "0"), 90, y + 30);
        y = para(g, s, 150, y + 30, W - 240, { size: 27, lh: 1.38 }) + 20;
      });
      if (book.recipe) {
        g.fillStyle = "rgba(31,63,176,.08)"; const top = y + 10;
        const end = para(g, "Gerçek bir tarif: " + book.recipe.text, 110, y + 56, W - 220, { size: 24, font: SANS, weight: 500, lh: 1.4 });
        g.fillStyle = accent; g.fillRect(90, top, 6, end - top);
        para(g, "Kaynak: " + book.recipe.src, 110, end + 6, W - 220, { size: 20, color: MUTED, font: SANS, weight: 500 });
      }
    });
    // 7. Ne görürüz + güvenlik
    P((g, W, H) => {
      let y = heading(g, "Ne görürüz?", 90, 160, accent);
      y = para(g, book.see, 90, y + 10, W - 180, { size: 31 });
      if (book.safety) {
        y = heading(g, "Güvenlik", 90, y + 70, accent);
        const lv = SAFETY_LEVEL[book.safety.level];
        g.font = `700 22px ${WIDE}`; g.fillStyle = lv.color; g.fillText(lv.label.toLocaleUpperCase("tr-TR"), 90, y + 20);
        for (let i = 1; i <= 4; i++) { g.fillStyle = i <= book.safety.level ? lv.color : "rgba(26,23,18,.12)"; g.fillRect(90 + (i - 1) * 46, y + 40, 38, 10); }
        book.safety.ghs.forEach((c, i) => drawGHS(g, c, 140 + i * 120, y + 140, 130));
        y = para(g, book.safety.text, 90, y + 250, W - 180, { size: 25, font: SANS, weight: 500, lh: 1.4 });
      }
    });
  } else if (book.sections?.[3]) {
    P((g, W) => { let y = heading(g, book.sections[3].h, 90, 160, accent); para(g, book.sections[3].p, 90, y + 10, W - 180, { size: 34 }); });
  }

  // 8. İlginç bilgi + kaynaklar
  P((g, W, H) => {
    g.fillStyle = accent; g.fillRect(70, 110, W - 140, 520);
    g.font = `700 22px ${WIDE}`; g.fillStyle = "#F1E6CC"; g.fillText("İLGİNÇ BİLGİ", 110, 180);
    g.font = `400 150px ${SERIF}`; g.fillText("“", 100, 330);
    para(g, book.fact || book.lead, 110, 330, W - 240, { size: 36, color: "#F1E6CC", lh: 1.38 });
    let y = heading(g, "Kaynaklar", 90, 720, accent);
    (book.refs || []).forEach((r) => { y = para(g, "• " + r, 90, y + 4, W - 180, { size: 21, color: MUTED, font: SANS, weight: 500, lh: 1.35 }) + 12; });
  });

  // 9. Son sayfa: sıra sende
  P((g, W, H) => {
    g.textAlign = "center";
    g.font = `700 44px ${WIDE}`; g.fillStyle = INK; g.fillText("SIRA SENDE!", W / 2, 260);
    g.font = `italic 400 32px ${SERIF}`; g.fillStyle = MUTED;
    const lines = wrapLines(g, book.sim?.outer ? "Bu deneyi sanal laboratuvarda kendi derişimlerinle tekrarla. Tahmin et, dene, karşılaştır." : "Kitaplıktaki diğer kitapları aç ve laboratuvarda kendi desenini oluştur.", W - 220);
    lines.forEach((l, i) => g.fillText(l, W / 2, 340 + i * 46));
    rings(g, W / 2, H * 0.62, H * 0.17, accent, ppt, 0.3);
    g.font = `600 22px ${SANS}`; g.fillStyle = accent; g.fillText("↓  aşağıdaki düğmeleri kullan", W / 2, H - 150);
    g.textAlign = "left";
  }, { cta: true });

  return specs;
}

/**
 * Bir kitap için sayfa dokularını üretir.
 * @returns {{ pages: Array<{texture, popup?:boolean, cta?:boolean}>, W:number, H:number }}
 */
export function buildPages(book, aspect, res = 1) {
  const W = Math.round(1024 * res), H = Math.round(1024 * res * aspect);
  const specs = pageSpecs(book);
  const pages = specs.map((s, i) => {
    const side = i % 2 === 0 ? "right" : "left";
    const { c, g } = paperBase(W, H, side, i * 13 + parseInt(book.no, 10));
    g.save(); g.scale(res, res);
    s.draw(g, W / res, H / res);
    g.restore();
    folio(g, W, H, book, i + 1, side);
    const t = tex(c);
    if (side === "left") { t.wrapS = 1000; t.repeat.x = -1; t.offset.x = 1; } // arka yüz aynalanır
    return { texture: t, popup: !!s.popup, cta: !!s.cta };
  });
  if (pages.length % 2 === 1) {
    const { c } = paperBase(W, H, "left", 999);
    const t = tex(c); t.wrapS = 1000; t.repeat.x = -1; t.offset.x = 1;
    pages.push({ texture: t });
  }
  return { pages, W, H };
}
