/**
 * 08 · GÖREVLER, ROZETLER VE QUIZ — oyunlaştırma.
 * XP kazandıran eylemler: kitap okumak (+15), deney (+20), doğru tahmin (+30), görev (+30–50),
 * doğru cevap (+10), rozetler (+40–100), müze (+5).
 */
import { store, LEVELS } from "../core/store.js";
import { BADGES, MISSIONS, QUIZZES, SAFETY_GAME } from "../data/content.js";
import { BOOKS, GHS } from "../data/books.js";
import { ghsSVG } from "../three/textures.js";
import { sfx } from "../core/audio.js";
import { toast } from "./chrome.js";

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export function initGame() {
  const root = document.getElementById("game");
  root.innerHTML = `
    <div class="game__grid">
      <div class="glass g-profile" id="gProfile"></div>
      <div class="glass g-badges"><div class="lbl kicker">Rozetler</div><div class="badges" id="gBadges"></div></div>
      <div class="glass g-missions"><div class="lbl kicker">Görevler · sanal laboratuvarda tamamla</div><ul class="missions" id="gMissions"></ul></div>
      <div class="glass g-quiz" id="gQuiz"></div>
    </div>`;
  const profile = root.querySelector("#gProfile"), badges = root.querySelector("#gBadges"), missions = root.querySelector("#gMissions"), quiz = root.querySelector("#gQuiz");

  function renderProfile() {
    const st = store.get(), lv = store.level();
    const best = Object.values(st.quiz).reduce((s, q) => s + q.score, 0);
    profile.innerHTML = `
      <div class="lbl kicker">Profilin</div>
      <div class="g-level"><div class="g-level__ring" style="--p:${Math.round(lv.frac * 100)}"><span>${lv.index + 1}</span></div>
        <div><div class="g-level__name">${lv.name}</div><div class="muted">${st.xp} XP${lv.next ? ` · sonraki seviye ${lv.next.name}: ${lv.next.xp} XP` : " · en yüksek seviye!"}</div></div></div>
      <div class="g-levels">${LEVELS.map((l, i) => `<span class="${i <= lv.index ? "is-on" : ""}" title="${l.name} · ${l.xp} XP">${l.name}</span>`).join("")}</div>
      <div class="g-stats">
        <div><b>${st.books.length}/${BOOKS.length}</b><span class="lbl">Kitap</span></div>
        <div><b>${st.runs}</b><span class="lbl">Deney</span></div>
        <div><b>${st.badges.length}/${Object.keys(BADGES).length}</b><span class="lbl">Rozet</span></div>
        <div><b>${best}</b><span class="lbl">Doğru cevap</span></div>
      </div>
      <button class="btn btn--sm btn--ghost" id="resetProg" data-cursor="btn">İlerlemeyi sıfırla</button>`;
    profile.querySelector("#resetProg").addEventListener("click", () => { if (confirm("Bütün puanların ve rozetlerin silinsin mi?")) { store.reset(); renderAll(); } });
  }
  function renderBadges() {
    const got = store.get().badges;
    badges.innerHTML = Object.entries(BADGES).map(([id, b]) => `<div class="badge ${got.includes(id) ? "is-on" : ""}" title="${b.d}"><div class="badge__coin"><span>${b.ico}</span></div><b>${b.name}</b><small>${b.d}</small></div>`).join("");
  }
  function renderMissions() {
    const done = store.get().missions;
    missions.innerHTML = MISSIONS.map((m) => `<li class="mission ${done.includes(m.id) ? "is-done" : ""}"><span class="mission__check">${done.includes(m.id) ? "✓" : ""}</span><div><b>${m.t}</b><small>${m.d}</small></div><span class="mission__xp">+${m.xp} XP</span></li>`).join("");
  }
  const renderAll = () => { renderProfile(); renderBadges(); renderMissions(); renderQuizHome(); };

  // Laboratuvar olaylarından görev kontrolü
  store.on("lab:finish", (r) => {
    for (const m of MISSIONS) {
      if (store.get().missions.includes(m.id)) continue;
      let ok = false; try { ok = m.check(r); } catch { ok = false; }
      if (ok && store.addOnce("missions", m.id)) { store.addXP(m.xp, "görev"); toast({ icon: "✅", title: `Görev tamamlandı: ${m.t}`, sub: m.d, xp: m.xp }); }
    }
    store.addOnce("labBooks", r.book.id);
    if (store.get().labBooks.length >= 6 && store.badge("chemist")) { store.addXP(60, "rozet"); toast({ icon: "🏅", title: "Rozet: Renk Kimyacısı", sub: "6 farklı sistemle deney yaptın!", xp: 60 }); }
    if (r.settings.baseType) {
      store.addOnce("bases", r.book.id + ":" + r.settings.baseType);
      const b = store.get().bases;
      if (b.includes(r.book.id + ":NH3") && b.includes(r.book.id + ":NaOH") && store.badge("weakstrong")) { store.addXP(50, "rozet"); toast({ icon: "🏅", title: "Rozet: Zayıf mı Kuvvetli mi?", sub: "Aynı sistemi iki bazla denedin.", xp: 50 }); }
    }
    renderAll();
  });
  store.on("xp", () => { renderProfile(); });
  store.on("badge", () => { renderBadges(); renderProfile(); });

  // ── Quiz ──
  function renderQuizHome() {
    const st = store.get().quiz;
    quiz.innerHTML = `
      <div class="lbl kicker">Quiz ve oyunlar</div>
      <h3 class="h3">Bilgini sına</h3>
      <div class="qsets">
        ${QUIZZES.map((q) => `<button class="qset" data-q="${q.id}" data-cursor="btn"><span class="qset__ico">${q.ico}</span><b>${q.title}</b><small>${st[q.id] ? `En iyi: ${st[q.id].score}/${st[q.id].total}` : `${q.qs.length} soru`}</small></button>`).join("")}
        <button class="qset qset--final" data-q="final" data-cursor="btn"><span class="qset__ico">🏆</span><b>Final testi</b><small>${st.final ? `En iyi: ${st.final.score}/10` : "10 karışık soru"}</small></button>
        <button class="qset qset--safety" data-q="safety-game" data-cursor="btn"><span class="qset__ico">⚠️</span><b>İşaret avı</b><small>Tehlike işaretlerini eşleştir</small></button>
      </div>`;
    quiz.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => { sfx.click(); b.dataset.q === "safety-game" ? safetyGame() : startQuiz(b.dataset.q); }));
  }

  function startQuiz(id) {
    let qs, title;
    if (id === "final") { qs = shuffle(QUIZZES.flatMap((q) => q.qs)).slice(0, 10); title = "Final testi"; }
    else { const set = QUIZZES.find((q) => q.id === id); qs = set.qs; title = set.title; }
    let i = 0, score = 0;
    const order = qs.map((q) => shuffle(q.a.map((text, k) => ({ text, ok: k === q.ok }))));
    const show = () => {
      const q = qs[i];
      quiz.innerHTML = `
        <div class="quiz__top"><span class="lbl kicker">${title}</span><span class="lbl">${i + 1} / ${qs.length} · Puan ${score}</span></div>
        <div class="quiz__bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <div class="quiz__card"><h3 class="quiz__q">${q.q}</h3>
        <div class="quiz__answers">${order[i].map((a, k) => `<button class="ans" data-k="${k}" data-cursor="btn"><span class="ans__k">${"ABCD"[k]}</span>${a.text}</button>`).join("")}</div>
        <div class="quiz__why" id="why"></div></div>
        <div class="quiz__nav"><button class="btn btn--sm btn--ghost" id="qBack" data-cursor="btn">← Setler</button><button class="btn btn--sm btn--solid" id="qNext" data-cursor="btn" disabled>${i + 1 < qs.length ? "Sonraki soru →" : "Sonucu gör"}</button></div>`;
      quiz.querySelector("#qBack").addEventListener("click", renderQuizHome);
      quiz.querySelectorAll(".ans").forEach((b) => b.addEventListener("click", () => {
        if (quiz.querySelector(".ans.is-picked")) return;
        const a = order[i][+b.dataset.k];
        b.classList.add("is-picked", a.ok ? "is-right" : "is-wrong");
        quiz.querySelectorAll(".ans").forEach((x, k) => { if (order[i][k].ok) x.classList.add("is-right"); x.disabled = true; });
        if (a.ok) { score++; sfx.correct(); store.addXP(10, "quiz"); } else sfx.wrong();
        const why = quiz.querySelector("#why");
        why.innerHTML = `<b>${a.ok ? "Doğru!" : "Yanlış."}</b> ${q.why}`;
        why.classList.add("is-on");
        quiz.querySelector("#qNext").disabled = false;
      }));
      quiz.querySelector("#qNext").addEventListener("click", () => { i++; sfx.page(); i < qs.length ? show() : result(); });
    };
    const result = () => {
      store.setQuiz(id, score, qs.length);
      const perfect = score === qs.length;
      if (id === "final" && score >= 8 && store.badge("quizmaster")) { store.addXP(100, "rozet"); toast({ icon: "🏅", title: "Rozet: Quiz Ustası", sub: `Final testinde ${score}/10!`, xp: 100 }); }
      quiz.innerHTML = `
        <div class="quiz__result"><div class="quiz__score">${score}<small>/${qs.length}</small></div>
        <h3 class="h3">${perfect ? "Kusursuz! 🎉" : score >= qs.length * 0.6 ? "Çok iyi!" : "Tekrar denemeye değer!"}</h3>
        <p class="muted">${score * 10} XP kazandın. Yanlış cevapların açıklamalarını okuyarak tekrar dene.</p>
        <div class="cmp__btns" style="justify-content:center"><button class="btn btn--sm btn--solid" id="qAgain" data-cursor="btn">Tekrar çöz</button><button class="btn btn--sm" id="qHome" data-cursor="btn">Diğer setler</button></div></div>`;
      if (perfect) burst(quiz);
      quiz.querySelector("#qAgain").addEventListener("click", () => startQuiz(id));
      quiz.querySelector("#qHome").addEventListener("click", renderQuizHome);
      renderProfile();
    };
    show();
  }

  function safetyGame() {
    const rounds = shuffle(SAFETY_GAME);
    let i = 0, mistakes = 0;
    const all = SAFETY_GAME.map((s) => s.right);
    const show = () => {
      const r = rounds[i];
      const opts = shuffle([r.right, ...shuffle(all.filter((x) => x !== r.right)).slice(0, 3)]);
      quiz.innerHTML = `
        <div class="quiz__top"><span class="lbl kicker">İşaret avı</span><span class="lbl">${i + 1} / ${rounds.length} · Hata ${mistakes}</span></div>
        <div class="quiz__bar"><i style="width:${(i / rounds.length) * 100}%"></i></div>
        <div class="quiz__card quiz__card--ghs"><div class="ghs-big">${ghsSVG(r.code, "")}</div><h3 class="quiz__q">Bu tehlike işareti ne anlama gelir?</h3>
        <div class="quiz__answers">${opts.map((o) => `<button class="ans" data-v="${o}" data-cursor="btn">${o}</button>`).join("")}</div></div>
        <div class="quiz__nav"><button class="btn btn--sm btn--ghost" id="qBack" data-cursor="btn">← Setler</button></div>`;
      quiz.querySelector("#qBack").addEventListener("click", renderQuizHome);
      quiz.querySelectorAll(".ans").forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.v === r.right) {
          b.classList.add("is-right"); sfx.correct(); store.addXP(5, "güvenlik");
          setTimeout(() => { i++; if (i < rounds.length) show(); else end(); }, 650);
        } else { b.classList.add("is-wrong"); b.disabled = true; mistakes++; sfx.wrong(); }
      }));
    };
    const end = () => {
      if (mistakes === 0 && store.badge("safety")) { store.addXP(60, "rozet"); toast({ icon: "🏅", title: "Rozet: Güvenlik Uzmanı", sub: "Bütün işaretleri hatasız buldun!", xp: 60 }); }
      quiz.innerHTML = `<div class="quiz__result"><div class="quiz__score">${rounds.length - mistakes > 0 ? "✓" : "!"}</div><h3 class="h3">${mistakes === 0 ? "Hatasız! Laboratuvara hazırsın." : `${mistakes} hata yaptın.`}</h3><p class="muted">Kitaplıktaki her kitabın güvenlik sayfasında bu işaretleri görebilirsin.</p><div class="cmp__btns" style="justify-content:center"><button class="btn btn--sm btn--solid" id="qAgain" data-cursor="btn">Tekrar oyna</button><button class="btn btn--sm" id="qHome" data-cursor="btn">Diğer setler</button></div></div>`;
      if (mistakes === 0) burst(quiz);
      quiz.querySelector("#qAgain").addEventListener("click", safetyGame);
      quiz.querySelector("#qHome").addEventListener("click", renderQuizHome);
    };
    show();
  }

  /** Konfeti yerine halka patlaması: Jablczynski dizisiyle büyüyen halkalar. */
  function burst(el) {
    const host = document.createElement("div");
    host.className = "burst";
    let r = 12;
    for (let k = 0; k < 9; k++) { const i = document.createElement("i"); i.style.setProperty("--r", r + "px"); i.style.animationDelay = k * 70 + "ms"; host.appendChild(i); r *= 1.32; }
    el.appendChild(host);
    setTimeout(() => host.remove(), 2200);
  }

  renderAll();
  void GHS;
}
