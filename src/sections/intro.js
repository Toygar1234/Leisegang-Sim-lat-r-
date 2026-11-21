/**
 * 01 · NEDİR? — Kaydırma bir zaman makinesidir: sayfa aşağı indikçe simülasyon zamanı ilerler,
 * 3B tüpte (ya da Petri kabında) bantlar tek tek belirir.
 * Simülasyon önceden hesaplanır (√t'ye göre eşit aralıklı kareler), kaydırma bu kareler arasında gezer.
 */
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import { Experiment } from "../three/experiment.js";
import { computeFrames, whenNear } from "../sim/precompute.js";
import { fmtDuration, realSeconds } from "../three/simview.js";
import { bookById } from "../data/books.js";
import { sfx } from "../core/audio.js";
import { detectBands } from "../sim/analysis.js";

export function initIntro() {
  const viewEl = document.getElementById("introView");
  const sec = document.getElementById("nedir");
  const timeEl = document.getElementById("introTime");
  const scrub = document.getElementById("introScrub");
  const stage = createStage(viewEl, { bloom: { strength: 0.55, radius: 0.5, threshold: 0.86 }, fov: 32 });
  const exp = new Experiment(stage, { autoRotate: true, bottles: true });
  exp.running = false;

  const cfg = { tube: bookById("mgoh2"), petri: bookById("ag2cr2o7") };
  const cache = {};
  let geo = "tube", frames = null, lastIdx = -1, lastBands = 0;

  async function use(g) {
    geo = g;
    const book = cfg[g];
    exp.setBook(book, g);
    exp.running = false;
    frames = null;
    lastIdx = -1;
    if (!cache[g]) cache[g] = computeFrames(book.sim[g], 90);
    frames = await cache[g];
  }
  whenNear(sec, () => use("tube"));
  exp.setBook(cfg.tube, "tube");
  exp.running = false;

  document.querySelectorAll("#introSeg [data-geo]").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#introSeg [data-geo]").forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", String(x === b)); });
    sfx.click();
    use(b.dataset.geo);
  }));

  addView({ el: viewEl, tick: (dt) => {
    if (frames && exp.sim) {
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height * 0.85)));
      scrub.style.width = (prog * 100).toFixed(1) + "%";
      const idx = Math.min(frames.length - 1, Math.round(prog * (frames.length - 1)));
      if (idx !== lastIdx) {
        const f = frames[idx], sim = exp.sim;
        sim.a.set(f.a); sim.b.set(f.b); sim.d.set(f.d); sim.cx.set(f.cx);
        for (let i = 0; i < f.tNuc.length; i++) sim.tNuc[i] = f.tNuc[i];
        sim.t = f.t;
        exp.simTex.update();
        const n = detectBands(sim.d, sim.tNuc, { start: geo === "tube" ? 1 : Math.ceil(sim.p.R0) }).length;
        if (n > lastBands && idx > lastIdx) sfx.band(n - 1);
        lastBands = n;
        lastIdx = idx;
        timeEl.textContent = `t = ${fmtDuration(realSeconds(sim))} · ${n} bant`;
      }
    }
    exp.tick(dt);
  } });
}
