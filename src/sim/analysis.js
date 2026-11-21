/**
 * Bant analizi — raporundaki veri analizi adımlarının (Bölüm 6.8) aynısı:
 *   1. xₙ – √tₙ grafiği → eğim ve R²  (zaman yasası)
 *   2. ln xₙ – n grafiği → p = e^eğim − 1  (Jablczynski aralık yasası)
 *   3. xₙ₊₁ / xₙ oranları → 1 + p
 *   4. ln wₙ – ln xₙ → α  (genişlik yasası)
 */

/** En küçük kareler doğrusu: y = eğim·x + kesim, ayrıca R². */
export function linearFit(X, Y) {
  const n = X.length;
  if (n < 2) return { slope: NaN, intercept: NaN, r2: NaN };
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += X[i]; my += Y[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = X[i] - mx, dy = Y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept: my - slope * mx, r2 };
}

/**
 * Çökelti profilinden bantları bulur.
 * @param {ArrayLike<number>} d     çökelti miktarı
 * @param {ArrayLike<number>} tNuc  her hücrenin ilk çökelme zamanı
 * @param {object} opt  { rel: max'a göre eşik, start: kaynak hücre sayısı }
 */
export function detectBands(d, tNuc, opt = {}) {
  const N = d.length;
  const start = opt.start ?? 1;
  let max = 0;
  for (let i = start; i < N; i++) if (d[i] > max) max = d[i];
  if (max <= 0) return [];
  const thr = (opt.rel ?? 0.06) * max;
  const bands = [];
  for (let i = start; i < N;) {
    if (d[i] > thr) {
      let j = i, m = 0, mx = 0, t = Infinity, peak = 0;
      while (j < N && d[j] > thr) {
        m += d[j]; mx += j * d[j];
        if (tNuc[j] < t) t = tNuc[j];
        if (d[j] > peak) peak = d[j];
        j++;
      }
      bands.push({ x: mx / m, front: i, back: j - 1, w: j - i, t, mass: m, peak });
      i = j;
    } else i++;
  }
  const out = bands.filter((b) => Number.isFinite(b.t));
  // Raporun Ek-4'teki find_peaks(prominence=...) mantığı: komşularına göre çok küçük kalan
  // bantlar "ikincil bant" olarak işaretlenir ve yasaların hesabına katılmaz.
  const minor = opt.minorFrac ?? 0.3;
  for (let k = 0; k < out.length; k++) {
    const nb = Math.max(out[k - 1]?.mass ?? 0, out[k + 1]?.mass ?? 0);
    out[k].minor = nb > 0 && out[k].mass < minor * nb;
  }
  return opt.keepMinor ? out : out.filter((b) => !b.minor);
}

/**
 * Bantlardan Liesegang yasalarını hesaplar.
 * @param {Array} bands  detectBands çıktısı
 * @param {number} x0    konum ofseti (radyal geometride damla yarıçapı)
 */
export function analyzeBands(bands, x0 = 0) {
  const B = bands.filter((b) => b.x - x0 > 1.5);
  const res = { n: B.length, x: [], t: [], w: [], ratios: [], time: null, spacing: null, width: null };
  if (B.length === 0) return res;
  res.x = B.map((b) => b.x - x0);
  res.t = B.map((b) => b.t);
  res.w = B.map((b) => b.w);
  if (B.length >= 3) {
    res.time = linearFit(res.t.map(Math.sqrt), res.x);
    const n = res.x.map((_, i) => i + 1);
    const fit = linearFit(n, res.x.map(Math.log));
    res.spacing = { ...fit, p: Math.exp(fit.slope) - 1 };
    res.ratios = res.x.slice(1).map((v, i) => v / res.x[i]);
  }
  if (B.length >= 4) {
    const ok = B.filter((b) => b.w > 1);
    if (ok.length >= 3) {
      const f = linearFit(ok.map((b) => Math.log(b.x - x0)), ok.map((b) => Math.log(b.w)));
      res.width = { alpha: f.slope, r2: f.r2 };
    }
  }
  return res;
}

/** Ortanca. */
export function median(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
