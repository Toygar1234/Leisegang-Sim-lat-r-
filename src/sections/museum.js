/**
 * 05 · 3B MALZEME MÜZESİ — her alet döndürülebilir, yakınlaştırılabilir, bazıları parçalara ayrılabilir.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import * as LW from "../three/models/labware.js";
import { MUSEUM } from "../data/content.js";
import { sfx } from "../core/audio.js";
import { store } from "../core/store.js";
import { toast } from "./chrome.js";

const outBack = (t) => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/** Petri kabı için halka deseni (Jablczynski dizisi: rₙ = r₁·1,28ⁿ). */
function ringTexture() {
  const S = 512, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, "#f4d6a6"); grd.addColorStop(0.55, "#eda24a"); grd.addColorStop(1, "#e8902e");
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  let r = 16;
  for (let k = 0; k < 12 && r < S / 2; k++) { g.strokeStyle = `rgba(110,24,20,${0.9 - k * 0.04})`; g.lineWidth = 2 + r * 0.045; g.beginPath(); g.arc(S / 2, S / 2, r, 0, Math.PI * 2); g.stroke(); r *= 1.28; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function make(id) {
  switch (id) {
    case "tube": { const g = LW.testTube({ H: 0.95, colors: { gel: "#cfe8ff", outer: "#9fd3ff" } }); g.position.y = 0.0; return g; }
    case "rack": { const r = LW.rack({ n: 4 }); for (let i = 0; i < 4; i++) { const t = LW.testTube({ H: 0.95, colors: { gel: ["#F2D23A", "#EDB9C6", "#BFE3B5", "#BFDDF0"][i], outer: "#F2F5F7" } }); t.position.set(r.userData.slotX(i), 0.05, 0); r.add(t); } return r; }
    case "petri": return LW.petriDish({ R: 0.5, texture: ringTexture(), colors: { gel: "#E89A3A", outer: "#eef1f4" } });
    case "beaker": return LW.beaker({ fill: 0.45, color: 0x7fd8ff });
    case "flask": return LW.flask({ fill: true, color: 0xff8a5b });
    case "cylinder": return LW.cylinder({ fill: 0.55, color: 0xa8ffcf });
    case "dropper": { const d = LW.dropper({ color: 0x9fd3ff }); d.scale.setScalar(1.4); return d; }
    case "bottle": return LW.bottle({ amber: true, color: 0xf2f5f7, label: { name: "Gümüş nitrat", formula: "AgNO3", conc: "1,0 mol/L", ghs: ["GHS03", "GHS05", "GHS09"], accent: "#1F3FB0" } });
    case "balance": return LW.balance();
    case "hotplate": { const h = LW.hotplate(); const b = LW.beaker({ R: 0.16, H: 0.32, fill: 0.5, color: 0xffd27a }); b.position.set(0, 0.19, -0.05); h.add(b); return h; }
    case "goggles": { const g = LW.goggles(); g.position.y = 0.3; return g; }
    case "spatula": { const s = LW.spatula(); s.position.y = 0.06; return s; }
    default: return new THREE.Group();
  }
}

export function initMuseum() {
  const viewEl = document.getElementById("museumView");
  const info = document.getElementById("museumInfo");
  const strip = document.getElementById("museumStrip");
  const stage = createStage(viewEl, { bloom: { strength: 0.45, radius: 0.5, threshold: 0.85 }, fov: 32, envIntensity: 0.9 });
  const { scene, camera, renderer } = stage;
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x0b1228, 0.55));
  const key = new THREE.SpotLight(0xffffff, 30, 10, 0.6, 0.5, 1.4); key.position.set(-1.5, 3.4, 2.4); key.castShadow = renderer.shadowMap.enabled; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const rim = new THREE.PointLight(0x63e3f2, 8, 6, 1.5); rim.position.set(1.8, 1.4, -1.6); scene.add(rim);
  const warm = new THREE.PointLight(0xffb070, 4, 4, 1.8); warm.position.set(1.4, 0.5, 1.6); scene.add(warm);
  // Döner sergi platformu
  const ped = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.06, 96), new THREE.MeshPhysicalMaterial({ color: 0x101b3a, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, metalness: 0.2 }));
  top.position.y = -0.03; top.receiveShadow = true; ped.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.008, 12, 120), new THREE.MeshStandardMaterial({ color: 0x63e3f2, emissive: 0x63e3f2, emissiveIntensity: 2.4 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.002; ped.add(ring);
  scene.add(ped);
  const holder = new THREE.Group(); scene.add(holder);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 0.8; controls.maxDistance = 4.5; controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  camera.position.set(1.4, 1.1, 2.1); controls.target.set(0, 0.35, 0);

  strip.innerHTML = MUSEUM.map((m, i) => `<button class="mus-item ${store.get().equipment.includes(m.id) ? "is-seen" : ""}" data-i="${i}" role="tab" data-cursor="btn"><div class="mus-item__ico">${m.ico}</div><div class="lbl">${m.name}</div></button>`).join("");
  let cur = -1, model = null, appear = 1, explode = 0, explodeT = 0;
  const parts = [];

  function select(i) {
    if (i === cur) return;
    cur = i;
    const m = MUSEUM[i];
    strip.querySelectorAll(".mus-item").forEach((b, k) => { b.classList.toggle("is-on", k === i); b.setAttribute("aria-selected", String(k === i)); });
    holder.clear();
    model = make(m.id);
    holder.add(model);
    // Patlatma için doğrudan çocukları kaydet
    parts.length = 0;
    model.children.forEach((c, k) => parts.push({ o: c, base: c.position.clone(), dir: new THREE.Vector3((k % 2 ? 1 : -1) * 0.08 * k, 0.14 * k, 0.05 * k) }));
    explode = 0; explodeT = 0;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length();
    controls.target.set(0, Math.max(0.15, (box.max.y + box.min.y) / 2), 0);
    const fitD = (size / (2 * Math.tan((camera.fov * Math.PI) / 360))) * (camera.aspect < 1 ? 1.5 / camera.aspect : 1.15);
    camera.position.copy(controls.target).add(new THREE.Vector3(0.9, 0.55, 1.4).normalize().multiplyScalar(Math.max(1.3, fitD)));
    appear = 0;
    info.innerHTML = `
      <div class="lbl kicker">Müze · ${i + 1}/${MUSEUM.length}</div>
      <h3>${m.name}</h3>
      <p>${m.p}</p>
      <div class="museum__role"><strong>Liesegang deneyindeki görevi:</strong> ${m.role}</div>
      <div class="museum__specs">${m.specs.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join("")}</div>
      <div class="cmp__btns">
        ${m.explode || model.children.length > 2 ? `<button class="btn btn--sm btn--glow" id="expBtn" data-cursor="btn">Parçalara ayır</button>` : ""}
        <button class="btn btn--sm" id="nextMus" data-cursor="btn">Sonraki →</button>
      </div>
      <p class="tiny">Sürükle: çevir · Tekerlek: yakınlaştır</p>`;
    info.querySelector("#expBtn")?.addEventListener("click", () => { explodeT = explodeT ? 0 : 1; sfx.whoosh(); info.querySelector("#expBtn").textContent = explodeT ? "Birleştir" : "Parçalara ayır"; });
    info.querySelector("#nextMus").addEventListener("click", () => { sfx.click(); select((cur + 1) % MUSEUM.length); });
    if (store.addOnce("equipment", m.id)) {
      strip.children[i].classList.add("is-seen");
      store.addXP(5, "müze");
      if (store.get().equipment.length === MUSEUM.length && store.badge("curator")) { store.addXP(60, "rozet"); toast({ icon: "🏅", title: "Rozet: Müze Rehberi", sub: "Bütün aletleri inceledin!", xp: 60 }); }
    }
  }
  strip.addEventListener("click", (e) => { const b = e.target.closest(".mus-item"); if (b) { sfx.click(); select(+b.dataset.i); } });
  select(0);

  addView({ el: viewEl, tick: (dt, t) => {
    if (model) {
      appear = Math.min(1, appear + dt * 1.6);
      const s = Math.max(0.001, outBack(appear));
      model.scale.setScalar(s * (model.userData.baseScale || 1));
      model.position.y = (1 - appear) * 0.3;
      explode += (explodeT - explode) * (1 - Math.exp(-5 * dt));
      parts.forEach((p) => p.o.position.copy(p.base).addScaledVector(p.dir, explode * 2.2));
    }
    ring.material.emissiveIntensity = 2 + Math.sin(t * 2) * 0.6;
    controls.update();
    stage.render();
  } });
}
