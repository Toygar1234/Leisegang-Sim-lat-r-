/**
 * LIESEGANG LAB — giriş noktası
 */
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-ext-400.css";
import "@fontsource/newsreader/latin-400-italic.css";
import "@fontsource/newsreader/latin-ext-400-italic.css";
import "@fontsource/newsreader/latin-600.css";
import "@fontsource/newsreader/latin-ext-600.css";
import "@fontsource/inter-tight/latin-500.css";
import "@fontsource/inter-tight/latin-ext-500.css";
import "@fontsource/inter-tight/latin-600.css";
import "@fontsource/inter-tight/latin-ext-600.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/unbounded/latin-600.css";
import "@fontsource/unbounded/latin-ext-600.css";
import "@fontsource/unbounded/latin-700.css";
import "@fontsource/unbounded/latin-ext-700.css";
import "@fontsource-variable/archivo/wdth.css";

import "./styles/base.css";
import "./styles/hero.css";
import "./styles/sections.css";
import "./styles/lab.css";
import "./styles/game.css";

import { initCursor } from "./core/cursor.js";
import { unlockAudio } from "./core/audio.js";
import { initShelf } from "./sections/shelf.js";
import { initDetail } from "./sections/detail.js";
import { initChrome } from "./sections/chrome.js";

const status = document.getElementById("loaderStatus");
const loader = document.getElementById("loader");

async function boot() {
  initCursor();
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  const chrome = initChrome();

  const detail = initDetail();
  let labApi = null;
  const labHook = (book) => {
    const go = () => { document.getElementById("lab").scrollIntoView({ behavior: "smooth" }); labApi && labApi.load(book); };
    setTimeout(go, 1400);
  };
  detail.onAction((act, book) => { if (act === "lab") labHook(book); });
  const shelf = await initShelf({
    onProgress: (i, n) => { status.textContent = `Kitaplar ciltleniyor · ${i}/${n}`; },
    onTextMode: (book, quad, host) => detail.open(book, quad, host),
    onLab: (book) => labHook(book),
  });
  detail.bindShelf(shelf);
  if (import.meta.env && import.meta.env.DEV) window.__shelf = shelf;
  chrome.bindShelf(shelf);

  loader.classList.add("is-done");
  document.body.dataset.ready = "1";

  // Aşağıdaki bölümler, kitaplık göründükten sonra sırayla kurulur
  const later = [
    () => import("./sections/intro.js").then((m) => m.initIntro()),
    () => import("./sections/mechanism.js").then((m) => m.initMechanism()),
    () => import("./sections/lab.js").then((m) => { labApi = m.initLab({ shelf, detail }); }),
    () => import("./sections/laws.js").then((m) => m.initLaws()),
    () => import("./sections/museum.js").then((m) => m.initMuseum()),
    () => import("./sections/nature.js").then((m) => m.initNature({ shelf })),
    () => import("./sections/timeline.js").then((m) => m.initTimeline()),
    () => import("./sections/game.js").then((m) => m.initGame()),
    () => import("./sections/refs.js").then((m) => m.initRefs()),
  ];
  for (const f of later) {
    try { await f(); } catch (err) { console.error("Bölüm kurulamadı:", err); }
    await new Promise((r) => setTimeout(r, 0));
  }
  chrome.refresh();
}

boot().catch((err) => {
  console.error(err);
  status.textContent = "Bir hata oluştu: " + err.message;
});
