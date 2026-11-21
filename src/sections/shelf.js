/**
 * ANA EKRAN — canlı 3B kütüphane ve sonsuz kitap rafı.
 * Hareket matematiği (şablondan uyarlandı):
 *   yay:       s += (T − s)·(1 − e^(−k·dt))
 *   konum:     F(r) = r·(t + g) + (D − t + 1,6g)·B(r),  B(r) = (r + sin(πr)/π)/2  (|r|<1)
 *   açıklık:   o = smoothstep(max(0, 1 − |r|))
 *   dönüş:     Y = −90°·o + eğimY·o,  X = eğimX·o,  Z = 4,5°·o
 * Kitaba tıklanınca 3B okuyucu açılır (src/three/reader.js).
 */
import * as THREE from "three";
import { createStage, toScreen } from "../core/stage.js";
import { addView } from "../core/loop.js";
import { cursor } from "../core/cursor.js";
import { sfx } from "../core/audio.js";
import { BOOKS, CATEGORIES } from "../data/books.js";
import { createBook, cloneBook, coverCorners } from "../three/models/book.js";
import { drawFront, drawSpine, drawTitlePage, loadCoverFonts } from "../three/covers.js";
import { createLibrary } from "../three/library.js";
import { Reader } from "../three/reader.js";
import { wood } from "../three/materials.js";
import { fmt } from "../core/formula.js";
import { Q, prefersReducedMotion } from "../core/quality.js";

const DEG = Math.PI / 180;
const smooth = (x) => x * x * (3 - 2 * x);
const B = (r) => (Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5);

/** Okuyucunun altındaki düğme çubuğu. */
function createReaderUI(hero, handlers) {
  const el = document.createElement("div");
  el.className = "reader-ui";
  el.innerHTML = `
    <button class="reader-ui__nav" data-r="prev" data-cursor="btn" aria-label="Önceki sayfa">‹</button>
    <div class="reader-ui__dots" aria-hidden="true"></div>
    <button class="reader-ui__nav" data-r="next" data-cursor="btn" aria-label="Sonraki sayfa">›</button>
    <span class="reader-ui__sep"></span>
    <button class="reader-ui__btn" data-r="text" data-cursor="btn">Metin görünümü</button>
    <button class="reader-ui__btn reader-ui__btn--hot" data-r="lab" data-cursor="btn">Laboratuvarda dene</button>
    <button class="reader-ui__btn" data-r="close" data-cursor="btn">Kapat ✕</button>`;
  const hint = document.createElement("div");
  hint.className = "reader-hint lbl";
  hint.textContent = "Sayfayı çevirmek için sürükle ya da tıkla · ← → · Esc";
  hero.append(el, hint);
  el.addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (b) handlers[b.dataset.r](); });
  const dots = el.querySelector(".reader-ui__dots");
  return {
    show(r) {
      dots.innerHTML = Array.from({ length: r.n + 1 }, (_, i) => `<i data-i="${i}"></i>`).join("");
      el.querySelector('[data-r="lab"]').hidden = !r.book.sim?.outer;
      el.classList.add("is-on"); hint.classList.add("is-on");
      setTimeout(() => hint.classList.remove("is-on"), 4200);
      this.update(r);
    },
    hide() { el.classList.remove("is-on"); hint.classList.remove("is-on"); },
    update(r) { [...dots.children].forEach((d, i) => d.classList.toggle("is-on", i === r.spread)); },
  };
}

export async function initShelf({ onProgress, onActive, onTextMode, onLab }) {
  const host = document.getElementById("shelf");
  const hero = document.getElementById("raf");
  const reduced = prefersReducedMotion();
  const q = Q();
  const n = BOOKS.length;
  const COPIES = 3, total = n * COPIES;
  const TH = 0.165, GAP = 0.03, D = 0.68, STEP = TH + GAP;
  const F = (r) => r * STEP + (D - TH + 1.6 * GAP) * B(r);

  // ── Sahne ──
  const stage = createStage(host, {
    canvas: document.getElementById("shelfCanvas"), fov: 30, envIntensity: 0.38, warmEnv: true, exposure: 0.98,
    clear: 0x120805, bloom: { strength: 0.5, radius: 0.45, threshold: 0.95 },
  });
  const { scene, camera, renderer } = stage;
  const lib = createLibrary(scene, renderer);

  const key = new THREE.DirectionalLight(0xffe2b8, 1.25);
  key.position.set(-2.6, 3.6, 4.6);
  key.castShadow = renderer.shadowMap.enabled;
  key.shadow.mapSize.set(q.shadowSize, q.shadowSize);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const spot = new THREE.PointLight(0xffd29a, 0.0, 3.4, 1.6);
  scene.add(spot);
  const peekLight = new THREE.PointLight(0xffc977, 0, 1.2, 1.8);
  scene.add(peekLight);

  // Ön raf (ceviz) ve pirinç kenar, altında konsol ayakları
  const plank = new THREE.Mesh(new THREE.BoxGeometry(80, 0.06, 1.0), wood());
  plank.position.set(0, -0.53, 0.02);
  plank.receiveShadow = true;
  scene.add(plank);
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd9a95a, metalness: 1, roughness: 0.28, clearcoat: 0.5 });
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 80, 12), brass);
  lip.rotation.z = Math.PI / 2;
  lip.position.set(0, -0.495, 0.53);
  scene.add(lip);
  for (let x = -12; x <= 12; x += 3) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), brass);
    br.position.set(x, -0.74, -0.25);
    scene.add(br);
  }

  // ── Kitaplar ──
  await loadCoverFonts();
  const masters = [];
  for (let i = 0; i < n; i++) {
    const book = BOOKS[i];
    const res = q.coverRes;
    const front = drawFront(book, res);
    const spine = drawSpine(book, res);
    const title = drawTitlePage(book, res * 0.8);
    for (const t of [front.color, front.orm, spine.color, spine.orm, title]) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    masters.push({ group: createBook(book, { front, spine, title }), coverCanvas: front.canvas });
    onProgress && onProgress(i + 1, n);
    await new Promise((r) => setTimeout(r, 0));
  }
  const books = [];
  for (let v = 0; v < total; v++) {
    const m = masters[v % n].group;
    const g = v < n ? m : cloneBook(m);
    g.rotation.order = "ZXY";
    g.vIndex = v;
    g.lift = 0; g.peek = 0;
    g.traverse((o) => { o.vIndex = v; });
    scene.add(g);
    books.push(g);
  }

  // ── Okuyucu ──
  const reader = new Reader({ scene, camera, renderer, ui: null });
  if (import.meta.env && import.meta.env.DEV) window.__reader = reader;
  let hiddenV = -1;
  const closeReader = () => {
    const g = books.find((b) => b.vIndex === hiddenV);
    if (!g) return;
    reader.close(g, () => { hiddenV = -1; });
  };
  reader.ui = createReaderUI(hero, {
    prev: () => reader.prev(),
    next: () => reader.next(),
    close: closeReader,
    text: () => { const r = reader.screenRect(canvasRect); onTextMode && onTextMode(reader.book, r.quad, { coverQuad: () => reader.screenRect(canvasRect).quad, onClosed: () => {} }); },
    lab: () => { const b = reader.book; closeReader(); onLab && onLab(b); },
  });

  // ── Durum ──
  const startIdx = Math.max(0, BOOKS.findIndex((b) => b.featured));
  let s = startIdx + n - 9, T = startIdx + n;
  let active = -1, hover = -1, dragging = false;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2, tiltX = 0, tiltY = 0, onCover = false;
  let camX = 0, camY = 0;
  let pxPerUnit = 100, halfW = 5, canvasRect = host.getBoundingClientRect(), baseCam = new THREE.Vector3();

  function layout() {
    const vw = window.innerWidth, vh = stage.height;
    const Hpx = vw <= 767 ? Math.min(vw * 0.6, window.innerHeight * 0.4) : Math.min(window.innerHeight * 0.46, vw * 0.31);
    const fov = camera.fov * DEG;
    const dist = vh / (Hpx * 2 * Math.tan(fov / 2));
    baseCam.set(0, 0.16, dist);
    camera.position.copy(baseCam);
    camera.lookAt(0, 0.04, 0);
    pxPerUnit = Hpx;
    halfW = (stage.width / pxPerUnit) / 2;
    const sc = key.shadow.camera;
    sc.left = -halfW - 1.5; sc.right = halfW + 1.5; sc.top = 2; sc.bottom = -2; sc.near = 0.5; sc.far = 14;
    sc.updateProjectionMatrix();
    canvasRect = host.getBoundingClientRect();
  }
  stage.resize();
  layout();
  new ResizeObserver(() => { stage.resize(); layout(); }).observe(host);
  window.addEventListener("scroll", () => { canvasRect = host.getBoundingClientRect(); }, { passive: true });

  // ── Altyazı (maskeden kayarak değişir) ──
  const masks = ["capTitle", "capSub", "capYear"].map((id) => document.getElementById(id).parentElement);
  function swap(mask, html, dir) {
    const proto = mask.firstElementChild;
    if (reduced || !proto) { if (proto) proto.innerHTML = html; return; }
    const neo = proto.cloneNode(false);
    neo.removeAttribute("id");
    neo.removeAttribute("data-leaving");
    neo.removeAttribute("style");
    neo.innerHTML = html;
    mask.appendChild(neo);
    [...mask.children].forEach((k) => {
      if (k === neo || k.dataset.leaving) return;
      k.dataset.leaving = "1";
      const a = k.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-dir * 105}%)` }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
      a.onfinish = () => k.remove();
    });
    neo.animate([{ transform: `translateY(${dir * 105}%)` }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
  }
  function setActive(i, dir) {
    active = i;
    const b = BOOKS[i];
    const sub = b.product ? `${fmt(b.sub)} <span class="arr">→</span> ${fmt(b.product)}` : b.sub;
    const year = `${b.yearLabel || b.year}${b.yearNote ? " · " + b.yearNote : ""} · No. ${b.no}`;
    swap(masks[0], b.title, dir);
    swap(masks[1], sub, dir);
    swap(masks[2], year, dir);
    updateTabs();
    onActive && onActive(b);
  }

  // ── Kategori sekmeleri ──
  const tabsEl = document.getElementById("tabs");
  const ind = document.getElementById("tabsInd");
  const tabBtns = CATEGORIES.map((c) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.innerHTML = `<span>${c.label}</span>`;
    btn.dataset.cat = c.id;
    btn.dataset.cursor = "btn";
    btn.addEventListener("click", () => jumpTo(c.id === "all" ? 0 : BOOKS.findIndex((b) => b.cat === c.id)));
    tabsEl.appendChild(btn);
    return btn;
  });
  function updateTabs() {
    const cat = BOOKS[active]?.cat;
    let on = null;
    tabBtns.forEach((b) => { const yes = b.dataset.cat === cat; b.classList.toggle("is-on", yes); if (yes) on = b; });
    if (on) { ind.style.width = on.offsetWidth + "px"; ind.style.transform = `translateX(${on.offsetLeft}px)`; ind.style.opacity = 1; }
  }
  window.addEventListener("resize", () => updateTabs());
  function jumpTo(i) {
    const cur = ((Math.round(T) % n) + n) % n;
    let d = i - cur;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    if (d) { T = Math.round(T) + d; sfx.slide(); }
  }

  // ── Girdi ──
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(x, y) {
    ndc.set(((x - canvasRect.left) / canvasRect.width) * 2 - 1, -((y - canvasRect.top) / canvasRect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(books.filter((b) => b.visible), true);
    return hits.length ? hits[0].object.vIndex : -1;
  }
  const relOf = (v) => {
    let r = (v - s) % total;
    if (r < -total / 2) r += total;
    if (r >= total / 2) r -= total;
    return r;
  };
  function activeGroup() {
    let best = null, bd = 1e9;
    for (const g of books) { const r = Math.abs(relOf(g.vIndex)); if (r < bd) { bd = r; best = g; } }
    return best;
  }
  function coverQuad(g = activeGroup()) {
    return coverCorners(g).map((p) => toScreen(p, camera, stage.width, stage.height)).map((p) => ({ x: p.x + canvasRect.left, y: p.y + canvasRect.top }));
  }

  function openBook() {
    if (reader.active) return;
    T = Math.round(T);
    const g = activeGroup();
    hiddenV = g.vIndex;
    cursor.force(null);
    reader.open(g.bookData, g);
  }

  let down = null, wheelTimer = 0;
  host.addEventListener("pointerdown", (e) => {
    if (reader.active) { reader.dragStart(e.clientX, e.clientY, reader.screenRect(canvasRect)); down = { x: e.clientX, y: e.clientY, reader: true }; return; }
    down = { x: e.clientX, y: e.clientY, T0: T, moved: false, id: e.pointerId };
  });
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (reader.active) {
      if (down && down.reader) { if (Math.abs(e.clientX - down.x) > 6) down.moved = true; reader.dragMove(e.clientX); }
      else reader.hover(mx, my, reader.screenRect(canvasRect));
      return;
    }
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!down.moved && Math.abs(dx) > 5) { down.moved = true; dragging = true; }
    if (down.moved) T = down.T0 - dx / (STEP * pxPerUnit);
  }, { passive: true });
  window.addEventListener("pointerup", (e) => {
    if (!down) return;
    const d = down; down = null;
    if (d.reader) {
      const handled = reader.dragEnd(e.clientX);
      if (handled || d.moved || reader.state !== "open") return;
      const r = reader.screenRect(canvasRect);
      const inside = r && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      if (!inside) { if (e.target === host || host.contains(e.target)) closeReader(); return; }
      if (e.clientX > (r.left + r.right) / 2) reader.next(); else reader.prev();
      return;
    }
    if (dragging) { dragging = false; T = Math.round(T); sfx.slide(); return; }
    if (d.moved) return;
    const v = pick(e.clientX, e.clientY);
    if (v < 0) return;
    const r = relOf(v);
    if (Math.abs(r) < 0.5) openBook();
    else { T = Math.round(T + r); sfx.slide(); }
  });
  host.addEventListener("wheel", (e) => {
    if (reader.active || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    T += (e.deltaX / (STEP * pxPerUnit)) * 0.5;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { T = Math.round(T); }, 160);
  }, { passive: false });
  document.getElementById("prevBtn").addEventListener("click", () => { if (!reader.active) { T = Math.round(T) - 1; sfx.slide(); } });
  document.getElementById("nextBtn").addEventListener("click", () => { if (!reader.active) { T = Math.round(T) + 1; sfx.slide(); } });
  document.getElementById("openBtn").addEventListener("click", openBook);
  window.addEventListener("keydown", (e) => {
    if (document.querySelector(".detail.is-open")) return;
    if (reader.active) {
      if (e.key === "ArrowRight") reader.next();
      else if (e.key === "ArrowLeft") reader.prev();
      else if (e.key === "Escape") closeReader();
      return;
    }
    if (window.scrollY > window.innerHeight * 0.5) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowLeft") { T = Math.round(T) - 1; sfx.slide(); }
    else if (e.key === "ArrowRight") { T = Math.round(T) + 1; sfx.slide(); }
    else if (e.key === "Enter" && (e.target === document.body || e.target === host)) openBook();
  });

  const tmp = new THREE.Vector3();

  // ── Her kare ──
  function tick(dt, time) {
    lib.tick(time);
    const k = reduced ? 1 : dragging ? 18 : 5.2;
    s += (T - s) * (1 - Math.exp(-k * dt));
    if (Math.abs(T - s) < 1e-4) s = T;
    if (Math.abs(s) > total * 4) { const sh = Math.round(s / total) * total; s -= sh; T -= sh; }
    const ai = ((Math.round(s) % n) + n) % n;
    if (ai !== active) { setActive(ai, Math.sign(T - s) || 1); if (!dragging) sfx.tick(); }

    // Kamera: fareyle hafif paralaks (sahne canlı görünsün)
    const nx = (mx / window.innerWidth - 0.5), ny = (my / window.innerHeight - 0.5);
    const kc = 1 - Math.exp(-2.5 * dt);
    camX += ((reader.active ? 0 : nx * 0.22) - camX) * kc;
    camY += ((reader.active ? 0 : -ny * 0.12) - camY) * kc;
    camera.position.set(baseCam.x + camX, baseCam.y + camY + Math.sin(time * 0.35) * 0.008, baseCam.z);
    camera.lookAt(camX * 0.3, 0.04, 0);

    // İmleç ve eğim
    const g0 = activeGroup();
    const quad = coverQuad(g0);
    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const hw = (Math.max(...xs) - Math.min(...xs)) / 2, hh = (Math.max(...ys) - Math.min(...ys)) / 2;
    const settled = Math.abs(T - s) < 0.3;
    const inHero = my >= canvasRect.top && my <= canvasRect.bottom && window.scrollY < window.innerHeight * 0.9;
    onCover = !reader.active && inHero && settled && Math.abs(mx - cx) < hw * 1.05 && Math.abs(my - cy) < hh * 1.04;
    let tY, tX;
    if (onCover) { tY = -((mx - cx) / hw) * 9 * DEG; tX = -((my - cy) / hh) * 6 * DEG; }
    else { tY = -((mx - window.innerWidth / 2) / window.innerWidth) * 5 * DEG; tX = 0; }
    const kt = 1 - Math.exp(-7 * dt);
    tiltX += (tX - tiltX) * kt; tiltY += (tY - tiltY) * kt;

    hover = inHero && !onCover && !reader.active && !dragging ? pick(mx, my) : -1;
    if (reader.active) cursor.force(reader.state === "open" ? "drag" : null);
    else if (inHero) cursor.force(onCover ? "peek" : hover >= 0 ? "spine" : null, "Kitabı aç");
    else cursor.force(null);

    // İmleci izleyen sıcak ışık (yaldızlarda parıltı)
    if (inHero && !reader.active) {
      ndc.set(((mx - canvasRect.left) / canvasRect.width) * 2 - 1, -((my - canvasRect.top) / canvasRect.height) * 2 + 1);
      tmp.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
      spot.position.copy(camera.position).addScaledVector(tmp, (0.8 - camera.position.z) / tmp.z);
      spot.intensity += ((onCover ? 1.4 : 0.7) - spot.intensity) * kt;
    } else spot.intensity *= 0.92;

    // Kitapları yerleştir
    const kl = reduced ? 1 : 1 - Math.exp(-12 * dt);
    for (const g of books) {
      const r = relOf(g.vIndex);
      const x = F(r);
      const vis = Math.abs(x) < halfW + 1.5 * D && g.vIndex !== hiddenV;
      g.visible = vis;
      if (!vis) continue;
      const o = smooth(Math.max(0, 1 - Math.abs(r)));
      const liftT = g.vIndex === hover && Math.abs(r) > 0.5 ? 1 : 0;
      g.lift += (liftT - g.lift) * kl;
      const h = g.dims.H;
      // Fareyle üstüne gelince kapak hafifçe aralanır, içinden ışık sızar
      const peekT = onCover && Math.abs(r) < 0.5 ? 1 : 0;
      g.peek += (peekT - g.peek) * (1 - Math.exp(-6 * dt));
      g.hinge.rotation.y = -0.38 * smooth(Math.min(1, g.peek)) - Math.sin(time * 2.2) * 0.02 * g.peek;
      g.position.set(x, -0.5 + h / 2 + o * 0.045 + g.lift * 0.05 + Math.sin(time * 1.4) * 0.006 * o, o * 0.2);
      g.rotation.set(tiltX * o, -Math.PI / 2 * o + tiltY * o, 4.5 * DEG * o);
      if (Math.abs(r) < 0.5) {
        tmp.set(g.dims.T / 2 + 0.03, 0, 0); g.localToWorld(tmp);
        peekLight.position.copy(tmp);
        peekLight.intensity = 1.6 * g.peek;
      }
    }

    reader.tick(dt, time);
    hero.classList.toggle("is-reading", reader.active);
    stage.render();
  }

  addView({ el: hero, tick });

  return {
    isOpen: () => reader.active,
    coverQuad: () => coverQuad(),
    close: () => {},
    activeBook: () => BOOKS[active],
    goTo: (id) => { const i = BOOKS.findIndex((b) => b.id === id); if (i >= 0) jumpTo(i); },
    openBook,
    closeReader: () => { if (reader.active) closeReader(); },
    coverCanvas: (id) => masters[BOOKS.findIndex((b) => b.id === id)]?.coverCanvas,
  };
}
