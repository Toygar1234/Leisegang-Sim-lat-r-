/**
 * LIESEGANG LAB — Matematik motoru
 * =================================
 * Bu dosya, Liesegang bantlarının oluşumunu sayısal olarak hesaplar.
 *
 * Model: Ostwald (1897) aşırı doygunluk fikri + çekirdeklenme ve büyüme
 * (Keller–Rubinow 1981, Dee 1986 ve Chopard ve ark. 1994 modellerinin sade hâli).
 *
 *   a : dış elektrolit (üstten gelen iyon, ör. NH₃/OH⁻ ya da Ag⁺)
 *   b : iç elektrolit (jelde bekleyen iyon, ör. Mg²⁺ ya da Cr₂O₇²⁻)
 *   d : çökelti (katı, hareket etmez)
 *
 *   ∂a/∂t = Dₐ ∇²a − R          (Fick'in 2. yasası + tepkime)
 *   ∂b/∂t = D_b ∇²b − R
 *   ∂d/∂t = R
 *
 * Çökelme hızı R, iyon çarpımına bağlıdır:  Q = a_etkin · b
 *   - Hücrede çökelti yoksa ve Q > q_çek (çekirdeklenme eşiği)  → yeni çekirdek (homojen çekirdeklenme)
 *   - Komşuda çökelti varsa ve Q > q_het (daha düşük eşik)       → kolay çekirdeklenme (heterojen)
 *   - Hücrede çökelti varsa ve Q > q_çöz (çözünürlük sınırı)     → büyüme
 *
 * Zayıf baz (NH₃) seçeneği: Toplam baz a'dan, dengedeki OH⁻ (a_etkin) hesaplanır:
 *   x² / (a − x) = K_b   →   x = (−K_b + √(K_b² + 4·K_b·a)) / 2
 *
 * Kompleksleşme seçeneği (Co, Cu, Ni): Fazla amonyak çökeltiyi yeniden çözer
 *   (ör. Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ + 2OH⁻). Bu, "göç eden desen" oluşturur (Lagzi 2003).
 *
 * Birimler boyutsuzdur: hücre genişliği = 1, zaman birimi = 1.
 * Gerçek birimlere çevirmek için: gerçek süre = t · (Δx² / D_gerçek).
 *
 * Doğrulama (tests/engine.test.js): zaman yasası xₙ ∝ √tₙ, Jablczynski aralık yasası
 * xₙ₊₁/xₙ → 1+p, Matalon–Packter eğilimi ve zayıf baz etkisi otomatik test edilir.
 */

export const DEFAULTS = {
  geometry: "tube", // "tube" (1B tüp) ya da "radial" (Petri kabı, merkezden damla)
  N: 600,           // hücre sayısı
  a0: 10,           // dış elektrolit derişimi (boyutsuz)
  b0: 1,            // iç elektrolit derişimi (boyutsuz)
  Da: 1,            // dış elektrolit difüzyon katsayısı
  Db: 0.5,          // iç elektrolit difüzyon katsayısı
  dt: 0.2,          // zaman adımı (kararlılık için dt·D ≤ 0.5)
  qNuc: 0.6,        // homojen çekirdeklenme eşiği (aşırı doygunluk)
  qHet: 0.3,        // heterojen çekirdeklenme eşiği (komşuda çökelti varken)
  qSol: 0.05,       // çözünürlük sınırı (bunun altında büyüme durur)
  g: 1,             // büyüme hızı katsayısı
  kn: 1,            // çekirdeklenme hızı katsayısı
  Kb: null,         // null = kuvvetli elektrolit; sayı = zayıf baz ayrışma sabiti
  complex: null,    // { aThr, rate, Dc } — fazla dış elektrolitle yeniden çözünme
  noise: 0.04,      // jel düzensizliği (eşiklerde küçük rastgele farklar)
  seed: 7,
  R0: 5,            // radyal geometride damlanın yarıçapı (hücre)
  dMax: 0,          // 0 = sınırsız
};

/** Küçük, tekrarlanabilir rastgele sayı üreteci (aynı tohum → aynı desen). */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class LiesegangSim {
  constructor(params = {}) {
    this.p = { ...DEFAULTS, ...params };
    this.reset();
  }

  /** Bütün alanları başlangıç durumuna getirir. */
  reset() {
    const p = this.p;
    const N = p.N;
    this.a = new Float64Array(N);
    this.b = new Float64Array(N);
    this.d = new Float64Array(N);
    this.cx = new Float64Array(N);      // çözünmüş kompleks (Co, Cu, Ni)
    this.tNuc = new Float64Array(N).fill(Infinity); // ilk çökelme zamanı (renk yaşlanması için)
    this.na = new Float64Array(N);
    this.nb = new Float64Array(N);
    this.ncx = new Float64Array(N);
    this.thr = new Float64Array(N);
    this.isSource = new Uint8Array(N);
    const rnd = mulberry32(p.seed);
    for (let i = 0; i < N; i++) this.thr[i] = 1 + p.noise * (rnd() - 0.5) * 2;

    // Geometri katsayıları: radyal geometride r_{i±1/2} / r_i ağırlıkları
    this.wL = new Float64Array(N);
    this.wR = new Float64Array(N);
    if (p.geometry === "radial") {
      for (let i = 0; i < N; i++) {
        const r = i + 0.5;
        this.wL[i] = i === 0 ? 0 : i / r;          // r_{i-1/2} / r_i
        this.wR[i] = i === N - 1 ? 0 : (i + 1) / r; // r_{i+1/2} / r_i
        if (r < p.R0) this.isSource[i] = 1;
      }
    } else {
      for (let i = 0; i < N; i++) {
        this.wL[i] = i === 0 ? 0 : 1;
        this.wR[i] = i === N - 1 ? 0 : 1;
      }
      this.isSource[0] = 1;
    }
    for (let i = 0; i < N; i++) this.b[i] = this.isSource[i] ? 0 : p.b0;
    this.t = 0;
    this.steps = 0;
    this.nucleations = 0;
    this.lastBandCount = 0;
  }

  /** Dış elektrolitin etkin (ayrışmış) derişimi. */
  aEff(a) {
    const Kb = this.p.Kb;
    if (Kb === null || Kb === undefined) return a;
    return (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * a)) / 2;
  }

  /** n adım ilerletir. Çekirdeklenme sayısını döndürür (ses ve animasyon için). */
  step(n = 1) {
    const p = this.p, N = p.N, dt = p.dt;
    const Da = p.Da * dt, Db = p.Db * dt;
    const wL = this.wL, wR = this.wR, src = this.isSource;
    const cpx = p.complex;
    const Dc = cpx ? (cpx.Dc ?? 0.3) * dt : 0;
    let nucEvents = 0;
    for (let s = 0; s < n; s++) {
      let a = this.a, b = this.b, d = this.d, na = this.na, nb = this.nb;

      // 1) Difüzyon (Fick yasası, açık Euler, sonlu hacim)
      for (let i = 0; i < N; i++) {
        const aL = i > 0 ? a[i - 1] : a[i], aR = i < N - 1 ? a[i + 1] : a[i];
        const bL = i > 0 ? b[i - 1] : b[i], bR = i < N - 1 ? b[i + 1] : b[i];
        na[i] = a[i] + Da * (wR[i] * (aR - a[i]) - wL[i] * (a[i] - aL));
        nb[i] = b[i] + Db * (wR[i] * (bR - b[i]) - wL[i] * (b[i] - bL));
      }
      if (cpx) {
        const c = this.cx, nc = this.ncx;
        for (let i = 0; i < N; i++) {
          const cL = i > 0 ? c[i - 1] : c[i], cR = i < N - 1 ? c[i + 1] : c[i];
          nc[i] = c[i] + Dc * (wR[i] * (cR - c[i]) - wL[i] * (c[i] - cL));
        }
        this.cx = nc; this.ncx = c;
      }
      this.a = na; this.na = a; this.b = nb; this.nb = b;
      a = this.a; b = this.b;

      // 2) Kaynak (damla ya da tüpün üstündeki çözelti): derişim sabit tutulur
      for (let i = 0; i < N; i++) if (src[i]) { a[i] = p.a0; b[i] = 0; }

      // 3) Tepkime: çekirdeklenme ve büyüme
      const t = this.t;
      for (let i = 0; i < N; i++) {
        if (src[i]) continue;
        const ai = a[i], bi = b[i];
        if (ai <= 0 || bi <= 0) continue;
        const Q = this.aEff(ai) * bi;
        let r = 0;
        if (d[i] > 0) {
          if (Q > p.qSol) r = p.g * (Q - p.qSol) * dt;
        } else {
          const nbr = (i > 0 && d[i - 1] > 0) || (i < N - 1 && d[i + 1] > 0);
          const th = this.thr[i];
          if (Q > p.qNuc * th || (nbr && p.qHet !== null && Q > p.qHet * th)) {
            r = p.kn * (Q - p.qSol) * dt;
            if (this.tNuc[i] === Infinity) { this.tNuc[i] = t; nucEvents++; }
          }
        }
        if (r > 0) {
          if (r > ai) r = ai;
          if (r > bi) r = bi;
          a[i] = ai - r; b[i] = bi - r; d[i] += r;
        }
      }

      // 4) Kompleksleşme: fazla dış elektrolit çökeltiyi çözer
      if (cpx) {
        const c = this.cx;
        for (let i = 0; i < N; i++) {
          if (src[i] || d[i] <= 0) continue;
          const ex = a[i] - cpx.aThr;
          if (ex > 0) {
            let r = cpx.rate * ex * d[i] * dt;
            if (r > d[i]) r = d[i];
            const use = Math.min(r * (cpx.ligands ?? 2), a[i]);
            d[i] -= r; c[i] += r; a[i] -= use;
          }
        }
        for (let i = 0; i < N; i++) if (src[i]) c[i] = c[i] * 0.98;
      }

      for (let i = 0; i < N; i++) if (a[i] < 0) a[i] = 0;
      this.t += dt;
      this.steps++;
    }
    this.nucleations += nucEvents;
    return nucEvents;
  }

  /** Cephenin konumu: dış elektrolitin a0·eşik'i geçtiği en uzak hücre. */
  frontPosition(frac = 0.02) {
    const thr = this.p.a0 * frac;
    for (let i = this.p.N - 1; i >= 0; i--) if (this.a[i] > thr) return i;
    return 0;
  }

  /** Cephe ortamın sonuna yaklaştı mı? */
  finished(frac = 0.9) {
    return this.frontPosition() >= this.p.N * frac;
  }

  /** Belirli bir zaman bütçesi içinde (ms) mümkün olduğunca çok adım atar. */
  stepFor(ms, maxSteps = 1e7, chunk = 50) {
    const t0 = performance.now();
    let done = 0, nuc = 0;
    while (done < maxSteps && performance.now() - t0 < ms) {
      const k = Math.min(chunk, maxSteps - done);
      nuc += this.step(k);
      done += k;
    }
    return { steps: done, nucleations: nuc };
  }

  /** Durumun hafif bir kopyası (kaydırmayla geri sarma ve 3B uzay-zaman grafiği için). */
  snapshot() {
    return { t: this.t, a: Float32Array.from(this.a), b: Float32Array.from(this.b), d: Float32Array.from(this.d), cx: Float32Array.from(this.cx), tNuc: Float32Array.from(this.tNuc) };
  }
}

/**
 * Simülasyonu baştan sona çalıştırır ve eşit aralıklı anlık görüntüler döndürür.
 * Kaydırma ile zamanı ileri-geri sarmak (scroll scrub) için kullanılır.
 * Görüntüler √t'ye göre eşit aralıklıdır; böylece bantlar kaydırma boyunca düzgün belirir.
 */
export function precompute(params, frames = 120, endFrac = 0.92, maxSteps = 4e6) {
  const sim = new LiesegangSim(params);
  // Önce toplam süreyi bul (cephe ortamın sonuna gelene kadar)
  const probe = new LiesegangSim(params);
  let guard = 0;
  while (!probe.finished(endFrac) && guard < maxSteps) { probe.step(200); guard += 200; }
  const T = probe.t;
  const out = [];
  for (let f = 1; f <= frames; f++) {
    const target = T * (f / frames) ** 2;
    while (sim.t < target) sim.step(20);
    out.push(sim.snapshot());
  }
  return { frames: out, T, final: sim };
}
