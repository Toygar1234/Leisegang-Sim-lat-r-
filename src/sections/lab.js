/**
 * SANAL LABORATUVAR — kendi deneyini tasarla.
 * Sol: ayarlar · Orta: 3B tezgâh + oynatma · Sağ: canlı grafikler, bant tablosu, yasalar.
 * Alt: tahmin oyunu, iki deneyi karşılaştırma, CSV / PNG dışa aktarma.
 */
import { Chart, LineController, LineElement, PointElement, LinearScale, Filler, Tooltip, Legend, ScatterController } from "chart.js";
import { LAB_BOOKS, bookById, CLOTH } from "../data/books.js";
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import { Experiment } from "../three/experiment.js";
import { fmtDuration, cellMM } from "../three/simview.js";
import { detectBands, analyzeBands } from "../sim/analysis.js";
import { labParams, defaultSettings } from "../sim/labparams.js";
import { fmt } from "../core/formula.js";
import { sfx } from "../core/audio.js";
import { store } from "../core/store.js";
import { toast } from "./chrome.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip, Legend, ScatterController);
Chart.defaults.color = "#AEB9D2";
Chart.defaults.font.family = '"Inter Tight", system-ui, sans-serif';
Chart.defaults.borderColor = "rgba(150,180,255,.12)";

/** Son deneyin sonuçları (Yasalar bölümü bunları kullanır). */
export const lastRun = { result: null, listeners: new Set(), set(r) { this.result = r; this.listeners.forEach((f) => f(r)); }, on(f) { this.listeners.add(f); if (this.result) f(this.result); } };

const fmtN = (v, d = 2) => (Number.isFinite(v) ? v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–");

export function initLab() {
  const controls = document.getElementById("labControls");
  const viewEl = document.getElementById("labView");
  const transport = document.getElementById("labTransport");
  const readout = document.getElementById("labReadout");
  const chartsEl = document.getElementById("labCharts");
  const extra = document.getElementById("labExtra");

  let book = bookById("mgoh2");
  let geo = "tube";
  let S = defaultSettings(book);
  let started = false, prediction = null, lastAnalysis = null;
  const slots = { A: null, B: null };

  // ── 3B sahne ──
  const stage = createStage(viewEl, { bloom: { strength: 0.55, radius: 0.5, threshold: 0.85 }, fov: 32, envIntensity: 0.7 });
  const exp = new Experiment(stage, {
    duration: 28, autoRotate: false,
    onBand: (n) => { sfx.band(n - 1); },
    onFinish: () => finish(),
  });
  exp.running = false;

  // ── Ayarlar paneli ──
  function slider(id, label, min, max, step, value, unit, fmtv = (v) => v) {
    return `<label class="ctl"><span class="ctl__top"><span class="lbl">${label}</span><output id="${id}Out">${fmtv(value)} ${unit}</output></span>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-cursor="btn"></label>`;
  }
  function renderControls() {
    const sys = LAB_BOOKS.map((b) => `<button class="chem ${b.id === book.id ? "is-on" : ""}" data-id="${b.id}" data-cursor="btn" title="${b.title}">
      <i style="background:${b.colors.ppt};box-shadow:0 0 10px ${b.colors.ppt}"></i><span>${b.title}</span><small>${fmt(b.product)}</small></button>`).join("");
    const o = book.sim.outer, n = book.sim.inner;
    const dec = (v) => (v < 0.01 ? 4 : v < 0.1 ? 3 : v < 1 ? 2 : 1);
    controls.innerHTML = `
      <div class="lab__ptitle lbl">1 · Kimyasal sistem</div>
      <div class="chems">${sys}</div>
      <div class="lab__ptitle lbl">2 · Kap</div>
      <div class="seg seg--full" id="geoSeg"><button class="seg__btn ${geo === "tube" ? "is-on" : ""}" data-geo="tube">Deney tüpü</button><button class="seg__btn ${geo === "petri" ? "is-on" : ""}" data-geo="petri">Petri kabı</button></div>
      <div class="lab__ptitle lbl">3 · Derişimler</div>
      ${slider("cOut", `Dış: ${fmt(o.name)}`, o.min, o.max, o.min / 10, S.cOut, o.unit, (v) => (+v).toFixed(dec(o.min)))}
      ${slider("cIn", `İç: ${fmt(n.name)}`, n.min, n.max, n.min / 10, S.cIn, n.unit, (v) => (+v).toFixed(dec(n.min)))}
      ${book.sim.base === "NH3" ? `<div class="lab__ptitle lbl">Baz türü</div><div class="seg seg--full" id="baseSeg"><button class="seg__btn ${S.baseType === "NH3" ? "is-on" : ""}" data-base="NH3">${fmt("NH3")} · zayıf baz</button><button class="seg__btn ${S.baseType === "NaOH" ? "is-on" : ""}" data-base="NaOH">NaOH · kuvvetli</button></div>` : ""}
      <div class="lab__ptitle lbl">4 · Ortam</div>
      ${slider("gel", "Jel yüzdesi", 0.5, 5, 0.5, S.gel, "%")}
      ${slider("temp", "Sıcaklık", 5, 40, 1, S.temp, "°C")}
      ${slider("noise", "Jel düzensizliği", 0, 0.2, 0.01, S.noise, "", (v) => "%" + Math.round(v * 100))}
      <div class="lab__ptitle lbl">5 · Tahmin et</div>
      <div class="predict">
        ${slider("pred", "Kaç bant oluşacak?", 1, 25, 1, prediction ?? 8, "bant")}
        <p class="predict__note">Başlatmadan önce tahmin et. Doğru tahmin (±1) ekstra puan kazandırır!</p>
      </div>
      <button class="btn btn--solid btn--big" id="startBtn" data-cursor="btn">▶ Deneyi başlat</button>
      <button class="btn btn--ghost" id="resetBtn" data-cursor="btn">Varsayılan ayarlar</button>`;

    controls.querySelectorAll(".chem").forEach((b) => b.addEventListener("click", () => { sfx.click(); load(bookById(b.dataset.id)); }));
    controls.querySelectorAll("[data-geo]").forEach((b) => b.addEventListener("click", () => { sfx.click(); geo = b.dataset.geo; renderControls(); setup(); }));
    controls.querySelectorAll("[data-base]").forEach((b) => b.addEventListener("click", () => { sfx.click(); S.baseType = b.dataset.base; renderControls(); setup(); }));
    const bind = (id, key, f = (v) => v) => {
      const inp = controls.querySelector("#" + id), out = controls.querySelector("#" + id + "Out");
      inp.addEventListener("input", () => {
        const v = +inp.value;
        if (key) S[key] = v; else prediction = v;
        out.textContent = out.textContent.replace(/^[^ ]+/, f(v));
        if (id === "noise") out.textContent = "%" + Math.round(v * 100);
        if (key) setupDebounced();
      });
    };
    bind("cOut", "cOut", (v) => v.toFixed(dec(o.min)));
    bind("cIn", "cIn", (v) => v.toFixed(dec(n.min)));
    bind("gel", "gel"); bind("temp", "temp"); bind("noise", "noise"); bind("pred", null);
    controls.querySelector("#startBtn").addEventListener("click", start);
    controls.querySelector("#resetBtn").addEventListener("click", () => { S = defaultSettings(book); renderControls(); setup(); sfx.click(); });
  }

  let deb = 0;
  const setupDebounced = () => { clearTimeout(deb); deb = setTimeout(setup, 220); };

  function setup() {
    const { params, Dreal } = labParams(book, geo, S);
    exp.mode = exp.mode || "ppt";
    exp.setBook(book, geo, params);
    exp.Dreal = Dreal;
    exp.running = false;
    started = false;
    if (prediction === null) prediction = 8;
    renderTransport();
    updateCharts(true);
  }

  function load(b) {
    if (!b || !b.sim?.outer) return;
    book = b;
    geo = b.sim.prefer === "petri" ? "petri" : "tube";
    S = defaultSettings(b);
    renderControls();
    setup();
  }

  function start() {
    if (!exp.sim) return;
    if (started && exp.finished) exp.restart();
    exp.running = true;
    started = true;
    sfx.start(); sfx.drip();
    prediction = +(controls.querySelector("#pred")?.value || 8);
    renderTransport();
  }

  function finish() {
    const r = analyze();
    exp.running = false;
    renderTransport();
    const n = store.inc("runs");
    store.addXP(20, "deney");
    let msg = `${r.n} bant oluştu` + (r.spacing ? ` · p = ${fmtN(r.spacing.p)}` : "");
    toast({ icon: "⚗️", title: "Deney tamamlandı!", sub: msg, xp: 20 });
    if (prediction !== null) {
      const diff = Math.abs(prediction - r.n);
      if (diff <= 1) {
        store.addXP(30, "tahmin");
        store.inc("predictions");
        toast({ icon: "🎯", title: "Harika tahmin!", sub: `Tahminin ${prediction}, sonuç ${r.n}.`, xp: 30 });
        if (store.badge("predictor")) toast({ icon: "🏅", title: "Rozet: Tahminci", sub: "İlk doğru tahminin!" });
      } else toast({ icon: "🤔", title: `Tahmin: ${prediction}, sonuç: ${r.n}`, sub: diff <= 3 ? "Çok yaklaştın!" : "Derişimlerin etkisini düşün ve tekrar dene." });
    }
    if (n === 1 && store.badge("firstrun")) toast({ icon: "🏅", title: "Rozet: İlk Halka", sub: "İlk sanal deneyini tamamladın." });
    store.emit("lab:finish", { book, geo, settings: { ...S }, result: r });
  }

  function analyze() {
    const sim = exp.sim;
    const x0 = geo === "petri" ? sim.p.R0 : 0;
    const bands = detectBands(sim.d, sim.tNuc, { start: geo === "petri" ? Math.ceil(sim.p.R0) : 1 });
    const res = analyzeBands(bands, x0);
    const mm = cellMM(sim);
    const secPer = exp.realTime() / Math.max(1e-9, sim.t);
    res.mm = res.x.map((v) => v * mm);
    res.sec = res.t.map((v) => v * secPer);
    res.book = book; res.geo = geo; res.settings = { ...S };
    lastAnalysis = res;
    lastRun.set(res);
    return res;
  }

  // ── Oynatma çubuğu ──
  const SPEEDS = [0.5, 1, 2, 4];
  function renderTransport() {
    transport.innerHTML = `
      <button class="tbtn tbtn--main" id="tPlay" data-cursor="btn" aria-label="${exp.running ? "Duraklat" : "Oynat"}">${exp.running ? "❚❚" : "▶"}</button>
      <button class="tbtn" id="tRestart" data-cursor="btn" aria-label="Baştan">↺</button>
      <button class="tbtn" id="tStep" data-cursor="btn" aria-label="Biraz ilerlet">⏭</button>
      <div class="tspeed">${SPEEDS.map((s) => `<button class="${exp.speed === s ? "is-on" : ""}" data-s="${s}" data-cursor="btn">${s}×</button>`).join("")}</div>
      <div class="seg tmode">${[["ppt", "Gerçek"], ["a", "Dış iyon"], ["b", "İç iyon"], ["thermal", "Isı"]].map(([m, l]) => `<button class="seg__btn ${exp.mode === m ? "is-on" : ""}" data-m="${m}">${l}</button>`).join("")}</div>`;
    transport.querySelector("#tPlay").addEventListener("click", () => { if (!started || exp.finished) start(); else { exp.running = !exp.running; sfx.click(); renderTransport(); } });
    transport.querySelector("#tRestart").addEventListener("click", () => { exp.restart(); exp.running = true; started = true; sfx.drip(); renderTransport(); });
    transport.querySelector("#tStep").addEventListener("click", () => { if (!exp.sim) return; exp.running = true; started = true; exp.tick(0.6); exp.running = false; renderTransport(); });
    transport.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { exp.speed = +b.dataset.s; sfx.click(); renderTransport(); }));
    transport.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => { exp.setMode(b.dataset.m); sfx.click(); renderTransport(); }));
  }

  // ── Grafikler ──
  chartsEl.innerHTML = `
    <div class="lab__ptitle lbl">Canlı derişim profili</div>
    <div class="chartbox"><canvas id="profChart"></canvas></div>
    <div class="kpis">
      <div class="kpi"><span class="lbl">Bant sayısı</span><b id="kN">0</b></div>
      <div class="kpi"><span class="lbl">Aralık katsayısı p</span><b id="kP">–</b></div>
      <div class="kpi"><span class="lbl">Zaman yasası R²</span><b id="kR">–</b></div>
    </div>
    <div class="lab__ptitle lbl">Bantlar</div>
    <div class="bandtable"><table><thead><tr><th>n</th><th>xₙ (mm)</th><th>tₙ</th><th>xₙ₊₁/xₙ</th></tr></thead><tbody id="bandBody"><tr><td colspan="4" class="muted">Deneyi başlat…</td></tr></tbody></table></div>`;
  const prof = new Chart(document.getElementById("profChart"), {
    type: "line",
    data: { datasets: [
      { label: "Dış iyon", data: [], borderColor: "#63E3F2", borderWidth: 2, pointRadius: 0, tension: 0.2 },
      { label: "İç iyon", data: [], borderColor: "#FF9A4A", borderWidth: 2, pointRadius: 0, tension: 0.2 },
      { label: "Çökelti", data: [], borderColor: "#FFFFFF", backgroundColor: "rgba(255,255,255,.18)", fill: true, borderWidth: 1.5, pointRadius: 0, stepped: false },
    ] },
    options: {
      animation: false, responsive: true, maintainAspectRatio: false, parsing: false,
      interaction: { mode: "index", intersect: false },
      scales: { x: { type: "linear", title: { display: true, text: "konum (mm)" }, grid: { color: "rgba(150,180,255,.06)" } }, y: { min: 0, max: 1.05, title: { display: true, text: "göreli miktar" }, grid: { color: "rgba(150,180,255,.06)" } } },
      plugins: { legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } }, tooltip: { callbacks: { title: (it) => `${(+it[0].parsed.x).toFixed(1)} mm` } } },
    },
  });

  let chartTimer = 0;
  function updateCharts(force) {
    const sim = exp.sim;
    if (!sim) return;
    const N = sim.p.N, mm = cellMM(sim), stride = Math.max(1, Math.floor(N / 160));
    let dmax = 1e-9;
    for (let i = 0; i < N; i++) if (sim.d[i] > dmax) dmax = sim.d[i];
    const A = [], Bv = [], Dv = [];
    for (let i = 0; i < N; i += stride) {
      const x = i * mm;
      A.push({ x, y: sim.a[i] / sim.p.a0 });
      Bv.push({ x, y: sim.b[i] / sim.p.b0 });
      let dd = 0; for (let k = i; k < Math.min(N, i + stride); k++) dd = Math.max(dd, sim.d[k]);
      Dv.push({ x, y: dd / dmax });
    }
    prof.data.datasets[0].data = A; prof.data.datasets[1].data = Bv; prof.data.datasets[2].data = Dv;
    prof.options.scales.x.max = N * mm;
    prof.update("none");
    const r = analyze();
    document.getElementById("kN").textContent = r.n;
    document.getElementById("kP").textContent = r.spacing ? fmtN(r.spacing.p) : "–";
    document.getElementById("kR").textContent = r.time ? fmtN(r.time.r2, 4) : "–";
    const body = document.getElementById("bandBody");
    body.innerHTML = r.n ? r.mm.map((x, i) => `<tr><td>${i + 1}</td><td>${fmtN(x, 1)}</td><td>${fmtDuration(r.sec[i])}</td><td>${i < r.ratios.length ? fmtN(r.ratios[i]) : "–"}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">${started ? "Bantlar bekleniyor…" : "Deneyi başlat…"}</td></tr>`;
    readout.innerHTML = `<span class="lbl">Simüle süre</span><b>${fmtDuration(exp.realTime())}</b><span class="lbl">Cephe</span><b>${fmtN(sim.frontPosition() * mm, 1)} mm</b><span class="lbl">İlerleme</span><b>%${Math.round(exp.progress() * 100)}</b>`;
  }

  // ── Alt bölüm: karşılaştırma ve dışa aktarma ──
  extra.innerHTML = `
    <div class="glass lab__cmp">
      <div class="cmp__head"><div><div class="lbl kicker">Karşılaştır</div><h3 class="h3">İki deneyi yan yana koy</h3><p class="muted">Bir deneyi bitir, A'ya kaydet; ayarları değiştir, yeni deneyi B'ye kaydet. Hangi değişken neyi etkiledi?</p></div>
      <div class="cmp__btns"><button class="btn btn--sm" data-slot="A" data-cursor="btn">A'ya kaydet</button><button class="btn btn--sm" data-slot="B" data-cursor="btn">B'ye kaydet</button></div></div>
      <div class="cmp__grid" id="cmpGrid"></div>
    </div>
    <div class="glass lab__export">
      <div class="lbl kicker">Dışa aktar</div><h3 class="h3">Verini al</h3>
      <p class="muted">Bant konumlarını Excel'de ya da Python'da analiz etmek için CSV olarak indir. 3B görüntüyü PNG olarak kaydet.</p>
      <div class="cmp__btns"><button class="btn btn--sm btn--glow" id="csvBtn" data-cursor="btn">CSV indir</button><button class="btn btn--sm btn--glow" id="pngBtn" data-cursor="btn">PNG kaydet</button></div>
      <p class="tiny">Not: Bu sayılar model sonucudur (örnek/varsayımsal veri), gerçek deney sonucu değildir.</p>
    </div>`;
  extra.querySelectorAll("[data-slot]").forEach((b) => b.addEventListener("click", () => {
    if (!lastAnalysis || !lastAnalysis.n) { toast({ icon: "ℹ️", title: "Önce bir deney yap", sub: "Kaydedecek sonuç yok." }); return; }
    slots[b.dataset.slot] = lastAnalysis;
    sfx.click();
    renderCompare();
    if (slots.A && slots.B && store.badge("comparer")) { store.addXP(40, "karşılaştırma"); toast({ icon: "🏅", title: "Rozet: Karşılaştırmacı", sub: "İki deneyi karşılaştırdın.", xp: 40 }); }
  }));
  function renderCompare() {
    const g = document.getElementById("cmpGrid");
    const col = (k) => {
      const r = slots[k];
      if (!r) return `<div class="cmp__col cmp__col--empty"><b>${k}</b><span class="muted">boş</span></div>`;
      const s = r.settings;
      return `<div class="cmp__col"><b>${k} · ${r.book.title}</b>
        <dl><dt>Kap</dt><dd>${r.geo === "tube" ? "Tüp" : "Petri"}</dd><dt>Dış</dt><dd>${s.cOut} ${r.book.sim.outer.unit}</dd><dt>İç</dt><dd>${s.cIn} ${r.book.sim.inner.unit}</dd>
        ${s.baseType ? `<dt>Baz</dt><dd>${s.baseType}</dd>` : ""}<dt>Jel / T</dt><dd>%${s.gel} · ${s.temp} °C</dd>
        <dt>Bant sayısı</dt><dd class="big">${r.n}</dd><dt>p</dt><dd class="big">${r.spacing ? fmtN(r.spacing.p) : "–"}</dd><dt>R² (√t)</dt><dd>${r.time ? fmtN(r.time.r2, 4) : "–"}</dd></dl></div>`;
    };
    g.innerHTML = col("A") + col("B");
  }
  renderCompare();
  /**
   * Dosya kaydetme: claude.ai'de paylaşılan sayfada "downloads" yeteneği (izleyici onay verir),
   * internetsiz tek dosya sürümünde normal tarayıcı indirmesi kullanılır.
   */
  let dlCap;
  const getDownloads = () => {
    if (dlCap === undefined) dlCap = window.claude && typeof window.claude.use === "function" ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
    return dlCap;
  };
  async function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const dl = await getDownloads();
    if (dl) {
      try { await dl.save({ filename: name, data: blob }); toast({ icon: "💾", title: "Dosya kaydedildi", sub: name }); }
      catch (e) { if (e && e.code !== "declined") toast({ icon: "ℹ️", title: "Dosya kaydedilemedi", sub: "Bu görünümde indirme kullanılamıyor." }); }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  document.getElementById("csvBtn").addEventListener("click", () => {
    const r = lastAnalysis;
    if (!r || !r.n) { toast({ icon: "ℹ️", title: "Önce bir deney yap" }); return; }
    const rows = ["n;x_mm;t_saniye;kok_t;ln_x;oran"].concat(r.mm.map((x, i) => [i + 1, x.toFixed(3), r.sec[i].toFixed(0), Math.sqrt(r.sec[i]).toFixed(3), Math.log(x).toFixed(4), i < r.ratios.length ? r.ratios[i].toFixed(4) : ""].join(";")));
    download(`liesegang_${r.book.id}_${r.geo}.csv`, "﻿" + rows.join("\n"), "text/csv");
    sfx.click();
  });
  document.getElementById("pngBtn").addEventListener("click", () => {
    stage.render();
    stage.renderer.domElement.toBlob((b) => { if (b) download(`liesegang_${book.id}.png`, b, "image/png"); }, "image/png");
    sfx.click();
  });

  // ── Döngü ──
  addView({ el: viewEl, tick: (dt) => {
    exp.tick(dt);
    chartTimer += dt;
    if (chartTimer > 0.25 && (exp.running || chartTimer > 2)) { chartTimer = 0; updateCharts(); }
  } });

  renderControls();
  setup();

  return { load: (b) => { load(b); setTimeout(start, 600); } };
}
