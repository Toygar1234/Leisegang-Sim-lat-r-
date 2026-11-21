// Motorun bilimsel doğruluğunu otomatik sınayan testler.
// Çalıştırma: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { LiesegangSim } from "../src/sim/engine.js";
import { detectBands, analyzeBands, median } from "../src/sim/analysis.js";

function runToEnd(params, frac = 0.9) {
  const sim = new LiesegangSim(params);
  let guard = 0;
  while (!sim.finished(frac) && guard < 3e6) { sim.step(200); guard += 200; }
  const x0 = params.geometry === "radial" ? (params.R0 ?? 5) : 0;
  const bands = detectBands(sim.d, sim.tNuc, { start: params.geometry === "radial" ? Math.ceil(params.R0 ?? 5) : 1 });
  return { sim, res: analyzeBands(bands, x0) };
}

const BASE = { N: 700, a0: 10, b0: 1, qNuc: 0.6, qHet: null, noise: 0 };

test("zaman yasası: xₙ ∝ √tₙ (R² > 0,995)", () => {
  const { res } = runToEnd(BASE);
  assert.ok(res.n >= 8, `bant sayısı ${res.n}`);
  assert.ok(res.time.r2 > 0.995, `R² = ${res.time.r2}`);
});

test("Jablczynski aralık yasası: ardışık oranlar sabit bir 1+p değerine yaklaşır", () => {
  const { res } = runToEnd(BASE);
  const tail = res.ratios.slice(-5);
  const m = median(tail);
  for (const r of tail) assert.ok(Math.abs(r - m) < 0.05, `oranlar dağınık: ${tail}`);
  assert.ok(res.spacing.p > 0.2 && res.spacing.p < 0.5, `p = ${res.spacing.p}`);
  assert.ok(res.spacing.r2 > 0.99);
});

test("Matalon–Packter: dış derişim a₀ arttıkça p azalır", () => {
  const ps = [5, 10, 20].map((a0) => runToEnd({ ...BASE, a0 }).res.spacing.p);
  assert.ok(ps[0] > ps[1] && ps[1] > ps[2], `p değerleri: ${ps}`);
});

test("Matalon–Packter: iç derişim b₀ arttıkça p azalır", () => {
  const ps = [0.7, 1, 2].map((b0) => runToEnd({ ...BASE, b0 }).res.spacing.p);
  assert.ok(ps[0] > ps[1] && ps[1] > ps[2], `p değerleri: ${ps}`);
});

test("zayıf baz (NH₃) kuvvetli baza (NaOH) göre daha seyrek bant verir (Chopard 1999)", () => {
  const strong = runToEnd(BASE).res;
  const weak = runToEnd({ ...BASE, Kb: 1 }).res;
  assert.ok(weak.spacing.p > strong.spacing.p, `zayıf ${weak.spacing.p} / kuvvetli ${strong.spacing.p}`);
  assert.ok(weak.n < strong.n);
});

test("derişimler hiçbir zaman negatif olmaz; b + d toplamı artmaz", () => {
  const sim = new LiesegangSim({ ...BASE, N: 300 });
  const sum0 = sim.b.reduce((s, v) => s + v, 0);
  for (let k = 0; k < 100; k++) {
    sim.step(100);
    let s = 0;
    for (let i = 0; i < sim.p.N; i++) {
      assert.ok(sim.a[i] >= 0 && sim.b[i] >= 0 && sim.d[i] >= 0);
      s += sim.b[i] + sim.d[i];
    }
    assert.ok(s <= sum0 + 1e-9, "kütle yoktan var oldu");
  }
});

test("Petri kabı (radyal geometri): eşmerkezli halkalar ve aralık yasası", () => {
  const { res } = runToEnd({ ...BASE, geometry: "radial", N: 320, a0: 20, R0: 5 }, 0.85);
  assert.ok(res.n >= 4, `halka sayısı ${res.n}`);
  assert.ok(res.spacing.r2 > 0.95, `R² = ${res.spacing.r2}`);
});

test("kompleksleşme: fazla dış elektrolit eski bantları çözer", () => {
  const { sim } = runToEnd({ ...BASE, Kb: 1, complex: { aThr: 4, rate: 0.05, Dc: 0.3 } });
  const dissolved = sim.cx.reduce((s, v) => s + v, 0);
  assert.ok(dissolved > 0, "hiç kompleks oluşmadı");
  // Ara yüzeye yakın bölgede (kompleksin oluştuğu yer) çökelti azalmış olmalı
  let nearMass = 0;
  for (let i = 1; i < 20; i++) nearMass += sim.d[i];
  const ref = runToEnd({ ...BASE, Kb: 1 }).sim;
  let refNear = 0;
  for (let i = 1; i < 20; i++) refNear += ref.d[i];
  assert.ok(nearMass < refNear, `yakın bölge: ${nearMass} / referans ${refNear}`);
});
