/**
 * 07 · TARİHÇE — yatay kaydırılan zaman çizelgesi (fare tekerleği ve sürükleme ile).
 */
import { TIMELINE } from "../data/content.js";
import { sfx } from "../core/audio.js";

export function initTimeline() {
  const root = document.getElementById("timeline");
  root.innerHTML = `
    <div class="tl-nav"><button class="tbtn" data-d="-1" aria-label="Geri" data-cursor="btn">‹</button><button class="tbtn" data-d="1" aria-label="İleri" data-cursor="btn">›</button></div>
    <div class="tl-line" aria-hidden="true"></div>
    <div class="tl-track" id="tlTrack">${TIMELINE.map((e) => `
      <article class="tl-card glass reveal"><div class="tl-year">${e.y}</div><h3>${e.t}</h3><p>${e.p}</p><small>${e.s}</small></article>`).join("")}</div>`;
  const track = root.querySelector("#tlTrack");
  root.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => { track.scrollBy({ left: +b.dataset.d * 320, behavior: "smooth" }); sfx.tick(); }));
  // sürükleyerek kaydırma
  let down = null;
  track.addEventListener("pointerdown", (e) => { down = { x: e.clientX, s: track.scrollLeft }; track.setPointerCapture(e.pointerId); });
  track.addEventListener("pointermove", (e) => { if (down) track.scrollLeft = down.s - (e.clientX - down.x); });
  track.addEventListener("pointerup", () => { down = null; });
  track.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && track.scrollWidth > track.clientWidth) { const max = track.scrollWidth - track.clientWidth; if ((e.deltaY > 0 && track.scrollLeft < max - 2) || (e.deltaY < 0 && track.scrollLeft > 2)) { e.preventDefault(); track.scrollLeft += e.deltaY; } } }, { passive: false });
}
