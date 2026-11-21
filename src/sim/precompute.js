/**
 * Zaman dilimli ön hesaplama: simülasyonu küçük parçalar hâlinde (en fazla ~8 ms) ilerletir,
 * böylece sayfa hesaplama sırasında donmaz. Aynı anda yalnızca bir hesaplama çalışır (kuyruk).
 */
import { LiesegangSim } from "./engine.js";

let queue = Promise.resolve();
const idle = () => new Promise((r) => setTimeout(r, 0));

async function run(params, frames, endFrac, budget) {
  const probe = new LiesegangSim(params);
  let t0 = performance.now();
  while (!probe.finished(endFrac)) {
    probe.step(50);
    if (performance.now() - t0 > budget) { await idle(); t0 = performance.now(); }
  }
  const T = probe.t;
  const sim = new LiesegangSim(params);
  const out = [];
  t0 = performance.now();
  for (let f = 1; f <= frames; f++) {
    const target = T * Math.pow(f / frames, 2);
    while (sim.t < target) {
      sim.step(20);
      if (performance.now() - t0 > budget) { await idle(); t0 = performance.now(); }
    }
    out.push(sim.snapshot());
  }
  return out;
}

/** Kareleri hesaplar (kuyrukta sırayla). */
export function computeFrames(params, frames = 80, endFrac = 0.9, budget = 8) {
  const job = queue.then(() => run(params, frames, endFrac, budget));
  queue = job.catch(() => {});
  return job;
}

/** Eleman ekrana yaklaşınca bir kez çalıştırır. */
export function whenNear(el, fn, margin = "800px") {
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin });
  io.observe(el);
}
