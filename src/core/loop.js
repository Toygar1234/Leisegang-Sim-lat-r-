/**
 * Tek bir requestAnimationFrame döngüsü. Her 3B sahne kendini kaydeder;
 * yalnızca ekranda görünen sahneler çizilir (pil ve performans için).
 */
const views = new Set();
let last = performance.now();
let running = false;

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    for (const v of views) if (v.el === e.target) v.visible = e.isIntersecting;
  }
}, { rootMargin: "120px 0px" });

/**
 * @param {{el: Element, tick: (dt:number, t:number) => void, always?: boolean}} view
 */
export function addView(view) {
  view.visible = false;
  views.add(view);
  if (view.el) io.observe(view.el); else view.visible = true;
  start();
  return () => { views.delete(view); if (view.el) io.unobserve(view.el); };
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) {
    for (const v of views) {
      if (v.visible || v.always) {
        try { v.tick(dt, now / 1000); } catch (err) { console.error(err); views.delete(v); }
      }
    }
  }
  requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  requestAnimationFrame((t) => { last = t; frame(t); });
}
