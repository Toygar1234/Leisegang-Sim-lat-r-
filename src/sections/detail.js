/**
 * KİTAP AYRINTISI — kitap açılınca kapaktan bir kâğıt büyür ve tüm ekranı kaplar.
 * Solda deneyin anlatımı (malzemeler, tepkime, adımlar, güvenlik), sağda canlı 3B deney.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BOOKS, GHS, SAFETY_LEVEL, CATEGORIES } from "../data/books.js";
import { fmt, rich } from "../core/formula.js";
import { ghsSVG } from "../three/textures.js";
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import { Experiment } from "../three/experiment.js";
import { fmtDuration } from "../three/simview.js";
import * as NATURE from "../three/models/nature.js";
import { bench } from "../three/models/labware.js";
import { sfx } from "../core/audio.js";
import { store } from "../core/store.js";
import { toast } from "./chrome.js";
import { cursor } from "../core/cursor.js";
import { prefersReducedMotion } from "../core/quality.js";

const BLOBS = [[150, 330, 0], [340, 600, 120], [250, 120, 220], [90, 760, 300], [400, 250, 360], [260, 860, 420], [230, 470, 180], [520, 520, 260], [480, 820, 340]];
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || "";

function bookHTML(b) {
  const lines = [];
  const L = (html) => lines.push(`<div class="mask"><div>${html}</div></div>`);
  L(`<div class="lbl d-kicker"><span>Kitap No. ${b.no}</span><span>·</span><span>${catLabel(b.cat)}</span><span>·</span><span>${b.yearLabel || b.year}</span></div>`);
  L(`<h1 class="d-title" id="dTitle">${b.title}</h1>`);
  if (b.product) L(`<div class="lbl d-meta"><span>${fmt(b.sub)} → ${fmt(b.product)}</span>${b.safety ? `<span>· ${SAFETY_LEVEL[b.safety.level].label}</span>` : ""}</div>`);
  else L(`<div class="lbl d-meta"><span>${b.sub}</span></div>`);
  L(`<p class="d-lead">${rich(b.lead)}</p>`);

  const secs = [];
  const S = (title, html) => secs.push(`<section class="d-sec"><h3>${title}</h3>${html}</section>`);
  if (b.materials) {
    S("Ne gerekir?", `<div class="d-mats">${b.materials.map((m) => `
      <div class="d-mat"><span class="lbl d-mat__role d-mat__role--${m.rol}">${{ jel: "Ortam", iç: "İç elektrolit", dış: "Dış elektrolit", araç: "Araç" }[m.rol]}</span>
      <div class="d-mat__name">${m.ad}</div>${m.f ? `<div class="d-mat__f">${fmt(m.f)}</div>` : ""}${m.not ? `<div class="d-mat__note">${rich(m.not)}</div>` : ""}</div>`).join("")}</div>`);
  }
  if (b.reaction) {
    const r = b.reaction;
    S("Hangi tepkime olur?", `
      <p class="d-words">${rich(r.words)}</p>
      ${r.pre ? `<div class="d-eq d-eq--small">${fmt(r.pre)}</div>` : ""}
      <div class="d-eq">${fmt(r.eq)}</div>
      ${r.ionic ? `<div class="d-eq d-eq--small">${fmt(r.ionic)}</div>` : ""}
      ${r.note ? `<p style="margin-top:12px">${rich(r.note)}</p>` : ""}`);
  }
  if (b.steps) {
    S("Nasıl yapılır?", `<ol class="d-steps">${b.steps.map((s) => `<li>${rich(s)}</li>`).join("")}</ol>
      ${b.recipe ? `<div class="d-recipe"><strong>Gerçek bir tarif:</strong> ${rich(b.recipe.text)}<small>Kaynak: ${b.recipe.src}</small></div>` : ""}`);
  }
  if (b.see) S("Ne görürüz?", `<p>${rich(b.see)}</p><p style="font-size:14px;color:var(--muted);font-family:var(--sans)">Sağdaki 3B tüpte deney canlı olarak yeniden hesaplanıyor. Her yeni bant oluştuğunda bir nota duyarsın.</p>`);
  if (b.sections) b.sections.forEach((s) => S(s.h, `<p>${rich(s.p)}</p>`));
  if (b.why) S("Neden ilginç?", `<p>${rich(b.why)}</p>`);
  if (b.safety) {
    const lv = SAFETY_LEVEL[b.safety.level];
    S("Güvenlik", `<div class="d-safety">
      <div class="d-safety__lvl"><div class="lbl" style="color:${lv.color}">${lv.label}</div><div class="d-safety__meter">${[1, 2, 3, 4].map((i) => `<i style="background:${i <= b.safety.level ? lv.color : ""}"></i>`).join("")}</div></div>
      <div><div class="d-ghs">${b.safety.ghs.map((g) => ghsSVG(g, GHS[g])).join("")}</div><p style="font-size:15px">${rich(b.safety.text)}</p>
      <p style="font-size:13px;color:var(--muted);margin-top:8px;font-family:var(--sans)">Bu deney evde yapılmaz. Gerçek kimyasallarla yalnızca öğretmen gözetiminde, uygun laboratuvarda çalışılır.</p></div></div>`);
  }
  const fact = b.fact ? `<div class="d-fact"><div class="lbl">İlginç bilgi</div><p>${rich(b.fact)}</p></div>` : "";
  const refs = b.refs ? `<details class="d-deep"><summary class="lbl">Kaynaklar</summary><div><ul class="d-refs">${b.refs.map((r) => `<li>${rich(r)}</li>`).join("")}</ul></div></details>` : "";
  const deep = b.sim?.tube || b.sim?.petri ? `<details class="d-deep"><summary class="lbl">Biraz daha derin: simülasyon nasıl hesaplanıyor?</summary><div>
    Jel ince dilimlere (hücrelere) bölünür. Her adımda iyonların komşu hücrelere ne kadar yayılacağı Fick yasasıyla hesaplanır.
    Bir hücrede iyon çarpımı [[Q = a·b]] çekirdeklenme eşiğini aşarsa çökelti oluşur; çökelti varsa çözünürlük sınırının üstündeki her şey çökeltiye katılır.
    ${b.sim?.base === "NH3" ? "Amonyak zayıf baz olduğu için ortamdaki hidroksit iyonu miktarı denge hesabıyla bulunur." : ""}
    ${b.sim?.tube?.complex ? " Fazla amonyak, çökeltiyi çözünen kompleks iyona dönüştürür." : ""}
    Sayılar boyutsuzdur; sonuçlar eğilim ve yasaları gösterir, gerçek bir tüple birebir aynı değildir.</div></details>` : "";
  const actions = `<div class="d-actions">
    ${b.sim?.outer ? `<button class="btn btn--solid" data-act="lab">Sanal laboratuvarda dene</button>` : ""}
    <button class="btn" data-act="next">Sonraki kitap →</button></div>`;
  return lines.join("") + secs.join("") + fact + deep + refs + actions;
}

export function initDetail() {
  const el = document.getElementById("detail");
  const textEl = document.getElementById("detailText");
  const viewEl = document.getElementById("detailView");
  const uiEl = document.getElementById("detailViewUI");
  const blobsG = document.getElementById("inkBlobs");
  const reduced = prefersReducedMotion();
  let shelf = null, host = null, stage = null, exp = null, natureRoot = null, natureControls = null, current = null, isOpen = false, inkT0 = 0, sheetAnim = null, unview = null;
  const listeners = new Set();

  BLOBS.forEach(([cx, cy]) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", 0);
    blobsG.appendChild(c);
  });
  const circles = [...blobsG.children];

  function ensureStage() {
    if (stage) return;
    stage = createStage(viewEl, { bloom: { strength: 0.5, radius: 0.55, threshold: 0.86 }, fov: 32, clear: 0x081229, envIntensity: 0.7 });
    exp = new Experiment(stage, {
      autoRotate: true, duration: 26,
      onBand: (n) => { sfx.band(n - 1); updateUI(); },
      onFinish: () => updateUI(),
    });
    natureRoot = new THREE.Group();
    stage.scene.add(natureRoot);
    unview = addView({ el: viewEl, tick: (dt) => {
      if (!isOpen) return;
      if (current && current.model) {
        natureRoot.rotation.y += dt * 0.15;
        natureControls?.update();
        stage.render();
      } else exp.tick(dt);
      if (exp.sim && (performance.now() % 500) < 20) updateUI();
    } });
  }

  function setupScene(book, geo) {
    ensureStage();
    natureRoot.clear();
    exp.clear();
    if (book.model) {
      exp.controls && (exp.controls.enabled = false);
      if (!natureControls) {
        natureControls = new OrbitControls(stage.camera, stage.renderer.domElement);
        natureControls.enableDamping = true; natureControls.enablePan = false; natureControls.minDistance = 0.7; natureControls.maxDistance = 3.5;
      }
      natureControls.enabled = true;
      const make = { agate: NATURE.agate, rock: NATURE.sandstone, cell: NATURE.tissueSlide, nano: NATURE.nanoRings, paper: NATURE.rungePaper }[book.model];
      const m = make();
      m.position.y = book.model === "rock" ? 0.34 : book.model === "agate" ? 0.45 : 0.05;
      natureRoot.add(m);
      stage.camera.position.set(0, book.model === "agate" ? 0.6 : 1.1, 1.6);
      natureControls.target.set(0, book.model === "agate" ? 0.42 : 0.15, 0);
      natureControls.update();
    } else {
      if (natureControls) natureControls.enabled = false;
      exp.controls && (exp.controls.enabled = true);
      exp.mode = book.colors?.thermal ? "thermal" : "ppt";
      exp.setBook(book, geo || book.sim?.prefer);
    }
    buildUI(book);
  }

  function buildUI(book) {
    uiEl.innerHTML = "";
    if (book.model) {
      uiEl.innerHTML = `<span class="lbl">Sürükle: çevir · Tekerlek: yakınlaştır</span>`;
      return;
    }
    const hasTube = !!book.sim?.tube, hasPetri = !!book.sim?.petri;
    const geoSeg = hasTube && hasPetri ? `<div class="seg" data-ui="geo"><button class="seg__btn ${exp.geometry === "tube" ? "is-on" : ""}" data-geo="tube">Tüp</button><button class="seg__btn ${exp.geometry === "petri" ? "is-on" : ""}" data-geo="petri">Petri</button></div>` : "";
    const modeSeg = `<div class="seg" data-ui="mode"><button class="seg__btn ${exp.mode === "ppt" ? "is-on" : ""}" data-mode="ppt">Gerçek</button><button class="seg__btn ${exp.mode === "a" ? "is-on" : ""}" data-mode="a">Dış iyon</button><button class="seg__btn ${exp.mode === "b" ? "is-on" : ""}" data-mode="b">İç iyon</button>${book.colors?.thermal ? `<button class="seg__btn ${exp.mode === "thermal" ? "is-on" : ""}" data-mode="thermal">Isı kamerası</button>` : ""}</div>`;
    uiEl.innerHTML = `${geoSeg}${modeSeg}<span class="lbl" data-ui="time"></span><button class="btn btn--sm btn--glow" data-ui="restart">↻ Yeniden</button>`;
    uiEl.querySelectorAll("[data-geo]").forEach((b) => b.addEventListener("click", () => { sfx.click(); setupScene(book, b.dataset.geo); }));
    uiEl.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { sfx.click(); exp.setMode(b.dataset.mode); uiEl.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("is-on", x === b)); }));
    uiEl.querySelector("[data-ui=restart]").addEventListener("click", () => { sfx.drip(); exp.restart(); });
    updateUI();
  }
  function updateUI() {
    const t = uiEl.querySelector("[data-ui=time]");
    if (t && exp?.sim) t.textContent = `${fmtDuration(exp.realTime())} · ${exp.bandCount} bant${exp.finished ? " · bitti" : ""}`;
  }

  // ── Açılış ──
  function open(book, quad, h) {
    host = h || { coverQuad: () => shelf.coverQuad(), onClosed: () => {} };
    current = book;
    isOpen = true;
    textEl.innerHTML = bookHTML(book);
    textEl.scrollTop = 0;
    textEl.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.act === "lab") { listeners.forEach((f) => f("lab", book)); close(); }
      else if (b.dataset.act === "next") { const i = BOOKS.indexOf(book); close(() => setTimeout(() => { shelf.goTo(BOOKS[(i + 1) % BOOKS.length].id); }, 100)); }
    }));
    el.hidden = false;
    el.classList.add("is-open");
    document.body.classList.add("is-locked");
    cursor.force(null);

    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    const W = window.innerWidth, H = window.innerHeight;
    const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    const ang = Math.atan2(quad[1].y - quad[0].y, quad[1].x - quad[0].x) * 180 / Math.PI;
    el.style.transformOrigin = `${(l + r) / 2}px ${(t + b) / 2}px`;
    sheetAnim = el.animate([
      { clipPath: `inset(${t}px ${W - r}px ${H - b}px ${l}px round 3px)`, transform: `rotate(${ang}deg)` },
      { clipPath: "inset(0px 0px 0px 0px round 0px)", transform: "rotate(0deg)" },
    ], { duration: reduced ? 1 : 1050, easing: "cubic-bezier(.76,0,.18,1)", fill: "both" });

    const masks = [...textEl.querySelectorAll(":scope > .mask > div")];
    masks.forEach((m, i) => m.animate([{ transform: "translateY(110%)" }, { transform: "translateY(0)" }], { duration: reduced ? 1 : 900, delay: reduced ? 0 : 620 + i * 75, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }));
    [...textEl.querySelectorAll(".d-sec, .d-fact, .d-deep, .d-actions")].forEach((s, i) => s.animate([{ clipPath: "inset(0 0 100% 0)", transform: "translateY(20px)" }, { clipPath: "inset(0 0 -20% 0)", transform: "none" }], { duration: reduced ? 1 : 800, delay: reduced ? 0 : 900 + i * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }));

    circles.forEach((c) => c.setAttribute("r", 0));
    inkT0 = performance.now() + (reduced ? -5000 : 520);
    requestAnimationFrame(inkLoop);
    setTimeout(() => setupScene(book), reduced ? 0 : 250);

    if (store.addOnce("books", book.id)) {
      store.addXP(15, "kitap");
      const cnt = store.get().books.length;
      toast({ icon: "📖", title: `Yeni kitap okundu: ${book.title}`, sub: `${cnt}/${BOOKS.length} kitap`, xp: 15 });
      if (cnt === BOOKS.length && store.badge("bookworm")) { store.addXP(100, "rozet"); toast({ icon: "🏅", title: "Rozet: Kitap Kurdu", sub: "Bütün kitapları okudun!", xp: 100 }); }
    }
  }

  function inkLoop(now) {
    const e = now - inkT0;
    circles.forEach((c, i) => {
      const p = Math.min(1, Math.max(0, (e - BLOBS[i][2]) / 1250));
      c.setAttribute("r", 760 * (1 - Math.pow(1 - p, 3)));
    });
    if (e < 2500 && isOpen) requestAnimationFrame(inkLoop);
  }

  function close(after) {
    if (!isOpen) return;
    sfx.close();
    const quad = host.coverQuad();
    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    const W = window.innerWidth, H = window.innerHeight;
    const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    const ang = Math.atan2(quad[1].y - quad[0].y, quad[1].x - quad[0].x) * 180 / Math.PI;
    el.style.transformOrigin = `${(l + r) / 2}px ${(t + b) / 2}px`;
    const anim = el.animate([
      { clipPath: "inset(0px 0px 0px 0px round 0px)", transform: "rotate(0deg)" },
      { clipPath: `inset(${t}px ${W - r}px ${H - b}px ${l}px round 3px)`, transform: `rotate(${ang}deg)` },
    ], { duration: reduced ? 1 : 850, easing: "cubic-bezier(.76,0,.18,1)", fill: "both" });
    anim.onfinish = () => {
      isOpen = false;
      el.classList.remove("is-open");
      el.hidden = true;
      el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      document.body.classList.remove("is-locked");
      host.onClosed();
      after && after();
    };
  }

  document.getElementById("detailClose").addEventListener("click", () => close());
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) close(); });

  return {
    open, close,
    bindShelf(s) { shelf = s; },
    onAction(fn) { listeners.add(fn); },
    isOpen: () => isOpen,
  };
}
