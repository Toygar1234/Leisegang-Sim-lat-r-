/**
 * Laboratuvardaki gerçek ayarları (mol/L, %, °C) boyutsuz model parametrelerine çevirir.
 *
 *  a₀ = a₀(ön ayar) · C_dış / C_dış,ref        b₀ = b₀(ön ayar) · C_iç / C_iç,ref
 *  Sıcaklık: difüzyon katsayıları yaklaşık %2,5/°C artar  → D·e^{0,025(T−20)}
 *  Jel yüzdesi: yoğun jel yayılmayı yavaşlatır             → D / (1 + 0,15(g − 3))
 *  Baz: NH₃ zayıf baz (K_b ile ayrışma), NaOH kuvvetli baz (tam ayrışır, kompleks yapmaz)
 */
export function labParams(book, geometry, s) {
  const base = book.sim[geometry] || book.sim.tube || book.sim.petri;
  const out = book.sim.outer, inn = book.sim.inner;
  const p = { ...base };
  p.a0 = clamp(base.a0 * (s.cOut / out.ref), base.a0 * 0.25, base.a0 * 3);
  p.b0 = clamp(base.b0 * (s.cIn / inn.ref), base.b0 * 0.3, base.b0 * 3);
  const fT = Math.exp(0.025 * (s.temp - 20));
  const fG = clamp(1 / (1 + 0.15 * (s.gel - 3)), 0.6, 1.6);
  p.Da = (base.Da ?? 1) * fT * fG;
  p.Db = (base.Db ?? 0.5) * fT * fG;
  p.dt = Math.min(0.2, 0.4 / Math.max(p.Da, p.Db));
  p.noise = s.noise;
  if (book.sim.base === "NH3") {
    if (s.baseType === "NaOH") { p.Kb = null; p.complex = null; }
    else p.Kb = base.Kb ?? 1;
  }
  p.seed = base.seed ?? 7;
  return { params: p, Dreal: 1.5e-9 * fT * fG };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function defaultSettings(book) {
  return {
    cOut: book.sim.outer.ref,
    cIn: book.sim.inner.ref,
    temp: 20,
    gel: 3,
    noise: 0.03,
    baseType: book.sim.base === "NH3" ? "NH3" : null,
  };
}
