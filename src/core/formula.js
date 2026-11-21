/**
 * Kimyasal formül yazımı.
 *  "Ag2Cr2O7"      → Ag₂Cr₂O₇  (harften sonra gelen rakam alt simge)
 *  "2AgNO3"        → katsayı (baştaki rakam normal)
 *  "Cr2O7^2-"      → yük üst simge
 *  "->", "<=>", "v" → ok, denge, çökelti oku
 *  "MgCl2·6H2O"    → hidrat
 */

function tokenize(str) {
  const out = [];
  let i = 0, prev = "";
  const push = (kind, text) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text; else out.push({ kind, text });
  };
  while (i < str.length) {
    const c = str[i];
    if (str.startsWith("<=>", i)) { push("arr", "⇌"); i += 3; prev = " "; continue; }
    if (str.startsWith("->", i)) { push("arr", "→"); i += 2; prev = " "; continue; }
    if (c === "^") {
      let j = i + 1, t = "";
      while (j < str.length && /[0-9]/.test(str[j])) t += str[j++];
      if (j < str.length && (str[j] === "+" || str[j] === "-")) t += str[j++] === "-" ? "−" : "+";
      push("sup", t); i = j; prev = "^"; continue;
    }
    if (c === "v" && /[0-9A-Z)\]a-z]/.test(prev) && (i + 1 === str.length || /[\s,;.]/.test(str[i + 1]))) {
      push("n", "↓"); i++; prev = "v"; continue;
    }
    if (/[0-9]/.test(c) && /[A-Za-z)\]]/.test(prev)) { push("sub", c); i++; continue; }
    push("n", c);
    prev = c;
    i++;
  }
  return out;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Formülü HTML'e çevirir. */
export function fmt(str) {
  if (!str) return "";
  const html = tokenize(str).map((t) => {
    if (t.kind === "sub") return `<sub>${esc(t.text)}</sub>`;
    if (t.kind === "sup") return `<sup>${esc(t.text)}</sup>`;
    if (t.kind === "arr") return `<span class="arr">${t.text}</span>`;
    return esc(t.text);
  }).join("");
  return `<span class="f">${html}</span>`;
}

/** Metni güvenli HTML'e çevirir; [[...]] içindeki formülleri biçimlendirir. */
export function rich(text) {
  if (!text) return "";
  return text.split(/(\[\[[^\]]+\]\])/g).map((part) => {
    const m = part.match(/^\[\[([^\]]+)\]\]$/);
    return m ? fmt(m[1]) : esc(part);
  }).join("");
}

/** Formülü tuvale (canvas) çizer. Genişliği döndürür. */
export function drawFormula(ctx, str, x, y, { size = 24, family = '"Inter Tight", sans-serif', weight = 600, align = "left", measureOnly = false } = {}) {
  const toks = tokenize(str);
  const fontFor = (k) => `${weight} ${k === "sub" || k === "sup" ? Math.round(size * 0.66) : size}px ${family}`;
  let w = 0;
  const widths = toks.map((t) => {
    ctx.font = fontFor(t.kind);
    const tw = ctx.measureText(t.kind === "arr" ? ` ${t.text} ` : t.text).width;
    w += tw;
    return tw;
  });
  if (measureOnly) return w;
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  const base = ctx.textBaseline, al = ctx.textAlign;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  toks.forEach((t, k) => {
    ctx.font = fontFor(t.kind);
    const dy = t.kind === "sub" ? size * 0.22 : t.kind === "sup" ? -size * 0.42 : 0;
    ctx.fillText(t.kind === "arr" ? ` ${t.text} ` : t.text, cx, y + dy);
    cx += widths[k];
  });
  ctx.textBaseline = base;
  ctx.textAlign = al;
  return w;
}
