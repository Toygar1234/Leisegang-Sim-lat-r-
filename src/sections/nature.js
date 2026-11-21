/**
 * 06 · DOĞADA VE TEKNOLOJİDE — tek bir 3B sahnede seçilebilen modeller (akik, kumtaşı, doku, nano, Runge).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import * as NATURE from "../three/models/nature.js";
import { bookById } from "../data/books.js";
import { rich } from "../core/formula.js";
import { sfx } from "../core/audio.js";

const ITEMS = [
  { id: "agate", make: NATURE.agate, y: 0.5, cam: [0, 0.75, 2.4], t: [0, 0.5, 0] },
  { id: "rocks", make: NATURE.sandstone, y: 0.34, cam: [1.5, 1.2, 2.0], t: [0, 0.3, 0] },
  { id: "medicine", make: NATURE.tissueSlide, y: 0.05, cam: [0.3, 1.5, 1.5], t: [0, 0.05, 0] },
  { id: "nano", make: NATURE.nanoRings, y: 0.05, cam: [0.4, 1.6, 1.6], t: [0, 0.05, 0] },
  { id: "runge", make: NATURE.rungePaper, y: 0.05, cam: [0.3, 1.7, 1.3], t: [0, 0.05, 0] },
];

export function initNature({ shelf }) {
  const root = document.getElementById("nature");
  root.style.gridTemplateColumns = "1.35fr 1fr";
  root.innerHTML = `
    <div class="view3d" id="natView" style="min-height:560px" data-cursor="drag"></div>
    <div class="nat-list" id="natList"></div>`;
  const list = root.querySelector("#natList");
  list.innerHTML = ITEMS.map((it, i) => {
    const b = bookById(it.id);
    return `<button class="nat-card glass ${i === 0 ? "is-on" : ""}" data-i="${i}" data-cursor="btn">
      <span class="lbl" style="color:var(--glow)">${b.yearLabel || b.year} · ${b.sub}</span>
      <h3>${b.title}</h3><p>${rich(b.lead)}</p>
      <span class="nat-card__more lbl">Kitabı kitaplıkta göster →</span></button>`;
  }).join("");
  const viewEl = root.querySelector("#natView");
  const stage = createStage(viewEl, { bloom: { strength: 0.5, radius: 0.55, threshold: 0.85 }, fov: 34, envIntensity: 1 });
  const { scene, camera, renderer } = stage;
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x0b1228, 0.7));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(-2, 4, 3); key.castShadow = renderer.shadowMap.enabled; scene.add(key);
  const rim = new THREE.PointLight(0x63e3f2, 6, 6, 1.6); rim.position.set(1.5, 1.2, -1.5); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 96), new THREE.MeshPhysicalMaterial({ color: 0x0e1a3a, roughness: 0.3, clearcoat: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const holder = new THREE.Group(); scene.add(holder);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 0.8; controls.maxAzimuthAngle = Infinity; controls.minDistance = 0.6; controls.maxDistance = 3.5;
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  let appear = 1, model = null;
  const cache = {};

  function select(i) {
    const it = ITEMS[i];
    holder.clear();
    model = cache[it.id] || (cache[it.id] = it.make());
    model.position.y = it.y;
    holder.add(model);
    camera.position.set(...it.cam); controls.target.set(...it.t);
    appear = 0;
    list.querySelectorAll(".nat-card").forEach((c, k) => c.classList.toggle("is-on", k === i));
  }
  list.addEventListener("click", (e) => {
    const c = e.target.closest(".nat-card");
    if (!c) return;
    sfx.click();
    if (e.target.closest(".nat-card__more")) { document.getElementById("raf").scrollIntoView({ behavior: "smooth" }); setTimeout(() => shelf.goTo(ITEMS[+c.dataset.i].id), 700); return; }
    select(+c.dataset.i);
  });
  select(0);
  addView({ el: viewEl, tick: (dt) => {
    if (model) { appear = Math.min(1, appear + dt * 1.4); const s = 1 - Math.pow(1 - appear, 3); model.scale.setScalar(0.4 + 0.6 * s); }
    controls.update();
    stage.render();
  } });
}
