/**
 * 04 · YASALAR — laboratuvardaki son deneyin verileriyle dört yasa + 3B uzay-zaman yüzeyi.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Chart, ScatterController, LineController, LineElement, PointElement, LinearScale, Tooltip, Legend } from "chart.js";
import { lastRun } from "./lab.js";
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import { computeFrames, whenNear } from "../sim/precompute.js";
import { LiesegangSim } from "../sim/engine.js";
import { detectBands, analyzeBands } from "../sim/analysis.js";
import { THEORIES } from "../data/content.js";
import { store } from "../core/store.js";
import { toast } from "./chrome.js";

Chart.register(ScatterController, LineController, LineElement, PointElement, LinearScale, Tooltip, Legend);
const nf = (v, d = 3) => (Number.isFinite(v) ? v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–");

const LAWS = [
  { id: "time", name: "Zaman yasası", who: "Morse ve Pierce, 1903", eq: "xₙ ∝ √tₙ", plain: "Bir bandın jeldeki konumu, oluştuğu zamanın kareköküyle artar. Süre 4 katına çıkınca mesafe yalnızca 2 katına çıkar. Bu yüzden cephe giderek yavaşlar.", x: "√tₙ (√saat)", y: "xₙ (mm)" },
  { id: "spacing", name: "Aralık yasası", who: "Jablczynski, 1923", eq: "ln xₙ = n·ln(1+p) + sabit", plain: "Bantların konumları bir geometrik dizi oluşturur. ln xₙ – n grafiği bir doğru çıkar; bu doğrunun eğiminden aralık katsayısı p bulunur.", x: "bant numarası n", y: "ln xₙ" },
  { id: "ratio", name: "Ardışık oran", who: "Jablczynski, 1923", eq: "xₙ₊₁ / xₙ → 1 + p", plain: "Bir bandın konumunu bir öncekine bölersen hep aynı sayıya yaklaşırsın. Bu sayı desenin parmak izidir.", x: "n", y: "xₙ₊₁ / xₙ" },
  { id: "mp", name: "Matalon–Packter yasası", who: "Matalon ve Packter, 1955 · Antal ve ark., 1998", eq: "p = F(b₀) + G(b₀)·b₀/a₀", plain: "Aralık katsayısı p derişimlere bağlıdır: dış elektrolit (a₀) derişikleştikçe bantlar sıklaşır, yani p küçülür. Grafik, motorun bu yasayı kendiliğinden ürettiğini gösteriyor.", x: "b₀ / a₀", y: "p" },
];

function baseOpts(xl, yl) {
  return {
    animation: { duration: 700 }, responsive: true, maintainAspectRatio: false,
    scales: {
      x: { type: "linear", title: { display: true, text: xl }, grid: { color: "rgba(150,180,255,.06)" } },
      y: { title: { display: true, text: yl }, grid: { color: "rgba(150,180,255,.06)" } },
    },
    plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
  };
}

export function initLaws() {
  const root = document.getElementById("laws");
  root.innerHTML = LAWS.map((l) => `
    <article class="law glass reveal" data-law="${l.id}">
      <div class="law__top"><span class="lbl law__name">${l.name}</span><span class="law__val" id="v-${l.id}">–</span></div>
      <div class="law__eq">${l.eq}</div>
      <div class="law__chart"><canvas id="c-${l.id}"></canvas></div>
      <p class="law__plain">${l.plain}</p>
      <div class="law__src">${l.who}</div>
    </article>`).join("");

  const ptStyle = { pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: "#F5B556", pointBorderColor: "#081229", pointBorderWidth: 2 };
  const fitStyle = { type: "line", borderColor: "rgba(99,227,242,.8)", borderWidth: 2, pointRadius: 0, borderDash: [6, 4] };
  const charts = {};
  for (const l of LAWS) {
    charts[l.id] = new Chart(document.getElementById("c-" + l.id), {
      type: "scatter",
      data: { datasets: [{ label: "veri", data: [], ...ptStyle }, { label: "uyum", data: [], ...fitStyle }] },
      options: baseOpts(l.x, l.y),
    });
  }

  function show(r) {
    if (!r || r.n < 3) return;
    const hrs = r.sec.map((s) => Math.sqrt(s / 3600));
    // Zaman yasası
    const ft = fitLine(hrs, r.mm);
    charts.time.data.datasets[0].data = hrs.map((x, i) => ({ x, y: r.mm[i] }));
    charts.time.data.datasets[1].data = [{ x: 0, y: ft.b }, { x: Math.max(...hrs) * 1.05, y: ft.b + ft.m * Math.max(...hrs) * 1.05 }];
    document.getElementById("v-time").textContent = `R² = ${nf(r.time?.r2, 4)}`;
    // Aralık
    const n = r.mm.map((_, i) => i + 1), ln = r.mm.map(Math.log);
    const fs = fitLine(n, ln);
    charts.spacing.data.datasets[0].data = n.map((x, i) => ({ x, y: ln[i] }));
    charts.spacing.data.datasets[1].data = [{ x: 1, y: fs.b + fs.m }, { x: n.length, y: fs.b + fs.m * n.length }];
    document.getElementById("v-spacing").textContent = `p = ${nf(r.spacing?.p)}`;
    // Oran
    charts.ratio.data.datasets[0].data = r.ratios.map((y, i) => ({ x: i + 1, y }));
    charts.ratio.data.datasets[1].data = [{ x: 1, y: 1 + r.spacing.p }, { x: Math.max(2, r.ratios.length), y: 1 + r.spacing.p }];
    charts.ratio.options.scales.y.min = 1; charts.ratio.options.scales.y.max = Math.max(1.6, Math.max(...r.ratios) + 0.1);
    document.getElementById("v-ratio").textContent = `1 + p = ${nf(1 + r.spacing.p)}`;
    for (const k of ["time", "spacing", "ratio"]) charts[k].update();
    if (r.book && r.time && r.time.r2 > 0.999 && store.badge("lawhunter")) { store.addXP(40, "rozet"); toast({ icon: "🏅", title: "Rozet: Yasa Avcısı", sub: "Zaman yasası R² > 0,999!", xp: 40 }); }
    buildSurface(r);
  }

  // Matalon–Packter taraması (zaman dilimli, ekrana yaklaşınca)
  whenNear(root, async () => {
    const series = [];
    for (const b0 of [0.7, 1, 1.6]) {
      const pts = [];
      for (const a0 of [8, 16, 32]) {
        const sim = new LiesegangSim({ N: 360, a0, b0, qNuc: 0.6, qHet: null, noise: 0 });
        let t0 = performance.now();
        while (!sim.finished(0.9)) { sim.step(60); if (performance.now() - t0 > 8) { await new Promise((r) => setTimeout(r, 0)); t0 = performance.now(); } }
        const res = analyzeBands(detectBands(sim.d, sim.tNuc), 0);
        if (res.spacing) pts.push({ x: b0 / a0, y: res.spacing.p });
      }
      series.push({ b0, pts });
    }
    const cols = ["#63E3F2", "#F5B556", "#FF6A8A"];
    charts.mp.data.datasets = series.map((s, i) => ({ label: `b₀ = ${s.b0}`, data: s.pts, type: "line", borderColor: cols[i], backgroundColor: cols[i], pointRadius: 5, borderWidth: 2, tension: 0.2 }));
    charts.mp.options.plugins.legend = { display: true, labels: { boxWidth: 10, usePointStyle: true } };
    charts.mp.update();
    document.getElementById("v-mp").textContent = "motorun ürettiği";
  }, "600px");

  // ── 3B uzay-zaman yüzeyi ──
  const stView = document.getElementById("stView");
  const stage = createStage(stView, { bloom: { strength: 0.7, radius: 0.6, threshold: 0.7 }, fov: 38, clear: 0x060d20 });
  const { scene, camera, renderer } = stage;
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x0b1228, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(2, 5, 3); scene.add(dl);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.6; controls.enablePan = false;
  camera.position.set(2.6, 2.2, 2.8); controls.target.set(0, 0.2, 0);
  const grid = new THREE.GridHelper(3, 12, 0x2a4a9a, 0x16295a); grid.position.y = -0.001; scene.add(grid);
  const surfGroup = new THREE.Group(); scene.add(surfGroup);
  let mode = "d", frames = null;
  document.querySelectorAll("#stSeg [data-mode]").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.querySelectorAll("#stSeg [data-mode]").forEach((x) => x.classList.toggle("is-on", x === b));
    draw();
  }));

  function axisLabel(text, pos) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const g = c.getContext("2d"); g.fillStyle = "#AEB9D2"; g.font = '600 26px "Inter Tight", sans-serif'; g.textAlign = "center"; g.fillText(text, 128, 40);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(0.6, 0.15, 1); s.position.copy(pos);
    return s;
  }

  function draw() {
    if (!frames) return;
    surfGroup.clear();
    const X = 140, Tn = frames.length;
    const N = frames[0].d.length;
    let max = 1e-9;
    const field = (f) => (mode === "a" ? f.a : mode === "b" ? f.b : f.d);
    for (const f of frames) { const F = field(f); for (let i = 0; i < N; i++) if (F[i] > max) max = F[i]; }
    const geo = new THREE.PlaneGeometry(2.6, 2.6, X - 1, Tn - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const c1 = new THREE.Color(mode === "a" ? "#1aa6c0" : mode === "b" ? "#c0561a" : "#2a3f9a"), c2 = new THREE.Color(mode === "a" ? "#9ff6ff" : mode === "b" ? "#ffd08a" : "#FFD68A");
    const tmp = new THREE.Color();
    for (let j = 0; j < Tn; j++) {
      const F = field(frames[j]);
      for (let i = 0; i < X; i++) {
        const k = j * X + i;
        let v = 0;
        const i0 = Math.floor((i / X) * N), i1 = Math.floor(((i + 1) / X) * N);
        for (let q = i0; q < Math.max(i1, i0 + 1); q++) v = Math.max(v, F[q]);
        v /= max;
        pos.setY(k, Math.pow(v, mode === "d" ? 0.6 : 1) * 0.9);
        tmp.copy(c1).lerp(c2, Math.min(1, v * 1.2));
        col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
      }
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.05 }));
    surfGroup.add(mesh);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x63e3f2, transparent: true, opacity: 0.08 }));
    surfGroup.add(wire);
    surfGroup.add(axisLabel("konum →", new THREE.Vector3(0, 0.02, 1.55)), axisLabel("zaman →", new THREE.Vector3(-1.6, 0.02, 0)), axisLabel(mode === "d" ? "çökelti" : mode === "a" ? "dış iyon" : "iç iyon", new THREE.Vector3(-1.35, 1.05, -1.3)));
  }
  function buildSurface() { /* son deney yüzeyi: aynı ön ayarlarla yeniden hesaplanır */ }
  whenNear(stView, async () => {
    frames = await computeFrames({ N: 420, a0: 20, b0: 1, qNuc: 0.6, qHet: 0.45, noise: 0.03 }, 64, 0.9);
    // zaman eksenini doğrusal yapmak için kareleri yeniden örnekle
    draw();
  });
  addView({ el: stView, tick: () => { controls.update(); stage.render(); } });

  // Kuramlar tablosu
  document.getElementById("theories").innerHTML = `<div class="glass" style="padding:28px">
    <div class="lbl kicker">Neden oluşuyor? Kuramlar karşılaştırması</div>
    <h3 class="h3">Olay kesin, açıklaması tartışmalı</h3>
    <p class="muted" style="margin-bottom:16px">Chopard ve arkadaşlarına (1999) göre kuramların çoğu aynı yasaları türetiyor ve aralarında kesin ayrım yapacak bir deney henüz yok. Bu yüzden bu sitede yasalar <span class="tag tag--solid">sağlam</span>, mekanizma ise <span class="tag tag--debate">tartışmalı</span> olarak işaretlendi.</p>
    <div style="overflow-x:auto"><table><thead><tr><th>Kuram</th><th>Ana fikir</th><th>Güçlü yanı</th><th>Zayıf yanı</th><th>Bu sitede</th></tr></thead><tbody>
    ${THEORIES.map((t) => `<tr><td>${t.k}<br><small class="muted">${t.w}</small></td><td>${t.idea}</td><td>${t.plus}</td><td>${t.minus}</td><td>${t.sim ? '<span class="tag tag--solid">motorda var</span>' : '<span class="tag tag--debate">anlatım</span>'}</td></tr>`).join("")}
    </tbody></table></div></div>`;

  // Henüz laboratuvar deneyi yoksa örnek veriyle başla
  let seeded = false;
  lastRun.on((r) => { if (r && r.n >= 3) { seeded = true; show(r); } });
  whenNear(root, async () => {
    if (seeded) return;
    const sim = new LiesegangSim({ N: 600, a0: 20, b0: 1, qNuc: 0.6, qHet: 0.45, noise: 0.03 });
    let t0 = performance.now();
    while (!sim.finished(0.9)) { sim.step(60); if (performance.now() - t0 > 8) { await new Promise((r) => setTimeout(r, 0)); t0 = performance.now(); } }
    if (seeded) return;
    const r = analyzeBands(detectBands(sim.d, sim.tNuc), 0);
    r.mm = r.x.map((v) => v * 0.1);
    const sp = (0.1e-3 * 0.1e-3) / 1.5e-9;
    r.sec = r.t.map((v) => v * sp);
    show(r);
  }, "900px");
}

function fitLine(X, Y) {
  const n = X.length; let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += X[i]; my += Y[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
  const m = sxy / sxx;
  return { m, b: my - m * mx };
}
