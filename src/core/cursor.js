/**
 * Özel halka imleç (şablondaki gibi): butonlarda küçülür, kitap sırtlarında daralır,
 * açık kapağın üstünde kobalt bir "AÇ / OKU" diskine dönüşür.
 */
const el = document.getElementById("cursor");
const label = document.getElementById("cursorLabel");
const pill = document.createElement("div");
pill.className = "cursor__pill lbl";
el.appendChild(pill);
let mx = -100, my = -100, cx = -100, cy = -100;
let forced = null; // 3B sahnelerin dayattığı durum ("spine", "open")
let hoverMode = null;

const MODES = ["is-spine", "is-btn", "is-open", "is-drag", "is-peek"];

function apply() {
  const mode = forced || hoverMode;
  for (const m of MODES) el.classList.toggle(m, mode === m.slice(3));
}

export const cursor = {
  get x() { return mx; },
  get y() { return my; },
  force(mode, text) {
    if (text) { label.textContent = text; pill.textContent = text; }
    if (forced !== mode) { forced = mode; apply(); }
  },
  hide(h) { el.classList.toggle("is-hidden", !!h); },
};

export function initCursor() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  window.addEventListener("pointermove", (e) => {
    if (mx < -50) { cx = e.clientX; cy = e.clientY; el.classList.remove("is-hidden"); }
    mx = e.clientX; my = e.clientY;
    const t = e.target.closest ? e.target.closest("[data-cursor], button, a, input, select, label, summary") : null;
    let m = null;
    if (t) {
      const d = t.getAttribute("data-cursor");
      m = d === "drag" ? "drag" : d === "none" ? null : "btn";
    }
    if (m !== hoverMode) { hoverMode = m; apply(); }
  }, { passive: true });
  document.addEventListener("mouseleave", () => cursor.hide(true));
  document.addEventListener("mouseenter", () => cursor.hide(false));
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-16 * dt);
    cx += (mx - cx) * k; cy += (my - cy) * k;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
