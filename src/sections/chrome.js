/**
 * Sayfa "kabuğu": üst çubuk, tema geçişi (kâğıt → gece), bölüm gezgini, içindekiler,
 * XP göstergesi, bildirimler, ses ve kalite düğmeleri, kaydırınca beliren öğeler.
 */
import { store } from "../core/store.js";
import { sfx } from "../core/audio.js";
import { cycleQuality, qualityTier, TIERS } from "../core/quality.js";

const WARM = [29, 15, 10];
const NAVY = [8, 18, 41];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export function toast({ icon = "✦", title, sub = "", xp = 0 }) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<div class="toast__ico">${icon}</div><div><div class="toast__t"></div><div class="toast__s"></div></div>${xp ? `<div class="toast__xp">+${xp} XP</div>` : ""}`;
  el.querySelector(".toast__t").textContent = title;
  el.querySelector(".toast__s").textContent = sub;
  box.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  setTimeout(() => { el.classList.add("is-out"); setTimeout(() => el.remove(), 600); }, 3800);
}

export function initChrome() {
  const topbar = document.getElementById("topbar");
  const backdrop = document.querySelector(".backdrop");
  const rail = document.getElementById("rail");
  const navList = document.getElementById("navList");
  const overlay = document.getElementById("navOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const sections = [...document.querySelectorAll("[data-rail]")];

  // Bölüm gezgini ve içindekiler
  const items = [{ id: "raf", label: "Kitaplık" }, ...sections.map((s) => ({ id: s.id, label: s.dataset.rail }))];
  items.forEach((it, i) => {
    const a = document.createElement("a");
    a.href = "#" + it.id; a.dataset.cursor = "btn";
    a.innerHTML = `<span class="lbl">${it.label}</span><i></i>`;
    rail.appendChild(a);
    const li = document.createElement("li");
    li.innerHTML = `<a href="#${it.id}" data-cursor="btn"><small>${String(i).padStart(2, "0")}</small>${it.label}</a>`;
    navList.appendChild(li);
  });
  const setMenu = (open) => {
    overlay.hidden = false;
    menuBtn.setAttribute("aria-expanded", String(open));
    requestAnimationFrame(() => overlay.classList.toggle("is-open", open));
    document.body.classList.toggle("is-locked", open);
    sfx.whoosh();
  };
  menuBtn.addEventListener("click", () => setMenu(true));
  document.getElementById("navClose").addEventListener("click", () => setMenu(false));
  navList.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("is-open")) setMenu(false); });

  // Yumuşak kaydırma
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const t = document.querySelector(a.getAttribute("href"));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  // Kaydırmaya bağlı tema: #nedir bölümünün sonunda kâğıt → gece
  const railLinks = [...rail.children];
  function onScroll() {
    const y = window.scrollY, vh = window.innerHeight;
    topbar.classList.toggle("is-scrolled", y > 40);
    rail.classList.toggle("is-on", y > vh * 0.6);
    const heroBottom = document.getElementById("raf").getBoundingClientRect().bottom;
    const t = Math.min(1, Math.max(0, 1 - heroBottom / vh));
    const c = mix(WARM, NAVY, t);
    backdrop.style.background = `rgb(${c[0]},${c[1]},${c[2]})`;
    backdrop.style.setProperty("--aurora", String(Math.min(1, t * 1.4)));
    document.body.dataset.theme = "dark";
    document.body.classList.toggle("on-hero", heroBottom > 70);
    // Etkin bölüm
    let cur = 0;
    const all = [document.getElementById("raf"), ...sections];
    all.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.45) cur = i; });
    railLinks.forEach((a, i) => a.classList.toggle("is-on", i === cur));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  document.body.dataset.theme = "dark";
  onScroll();

  // Kaydırınca beliren öğeler
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.15 });
  const observeReveals = () => document.querySelectorAll(".reveal:not(.is-in)").forEach((el) => io.observe(el));
  observeReveals();

  // Sayılar
  const countIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const end = +e.target.dataset.count, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1600);
      e.target.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.5 });
  document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

  // XP göstergesi
  const lvlEl = document.getElementById("xpLevel"), fill = document.getElementById("xpFill"), num = document.getElementById("xpNum"), chip = document.getElementById("xpChip");
  const renderXP = () => {
    const st = store.get(), lv = store.level();
    lvlEl.textContent = lv.name;
    fill.style.width = Math.round(lv.frac * 100) + "%";
    num.textContent = `${st.xp} XP`;
  };
  renderXP();
  store.on("xp", (d) => {
    renderXP();
    chip.classList.remove("is-bump"); void chip.offsetWidth; chip.classList.add("is-bump");
    if (d.levelUp) { sfx.level(); toast({ icon: "★", title: `Seviye atladın: ${d.level.name}!`, sub: "Yeni unvanın üst çubukta." }); }
    else sfx.xp();
  });
  store.on("reset", renderXP);
  chip.addEventListener("click", () => document.getElementById("gorev").scrollIntoView({ behavior: "smooth" }));

  // Ses
  const soundBtn = document.getElementById("soundBtn");
  const renderSound = () => soundBtn.setAttribute("aria-pressed", String(store.setting("sound") !== false));
  renderSound();
  soundBtn.addEventListener("click", () => { store.setting("sound", store.setting("sound") === false); renderSound(); sfx.click(); });

  // Kalite
  const qLbl = document.getElementById("qualityLbl");
  const renderQ = () => { const s = store.setting("quality") || "auto"; qLbl.textContent = s === "auto" ? `Otomatik · ${TIERS[qualityTier()].label}` : TIERS[s].label; };
  renderQ();
  document.getElementById("qualityBtn").addEventListener("click", () => {
    const next = cycleQuality();
    renderQ();
    toast({ icon: "◐", title: "Grafik kalitesi değişti", sub: next === "auto" ? "Otomatik seçim. Sayfa yenileniyor…" : `${TIERS[next].label}. Sayfa yenileniyor…` });
    setTimeout(() => location.reload(), 1200);
  });

  return {
    bindShelf() {},
    refresh() { observeReveals(); onScroll(); document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el)); },
  };
}
