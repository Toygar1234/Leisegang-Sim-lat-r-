/**
 * Deney sahnesi: tezgâh, tüp sporu + deney tüpü (ya da Petri kabı), reaktif şişeleri,
 * çökelti kristalleri ve canlı Liesegang simülasyonu.
 *
 * Zaman akışı: simülasyon zamanı, duvar saatinin karesiyle ilerler (t ∝ w²).
 * Cephe x ∝ √t olduğundan, ekranda cephe sabit hızla ilerler ve bütün bantlar rahatça izlenir.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LiesegangSim } from "../sim/engine.js";
import { detectBands } from "../sim/analysis.js";
import { SimTexture, realSeconds } from "./simview.js";
import { testTube, petriDish, bottle, rack, crystalCluster, bench, dropper } from "./models/labware.js";
import { CLOTH } from "../data/books.js";

export class Experiment {
  /**
   * @param {object} stage  createStage çıktısı
   * @param {object} o  { bench, bottles, controls, autoRotate, duration, onBand, onFinish, onTick, texSize }
   */
  constructor(stage, o = {}) {
    this.stage = stage;
    this.o = o;
    this.scene = stage.scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.duration = o.duration ?? 24;
    this.speed = 1;
    this.running = true;
    this.mode = "ppt";
    this.lights();
    if (o.bench !== false) { const b = bench({ W: 8, D: 5 }); this.scene.add(b); }
    if (o.controls !== false) {
      const c = new OrbitControls(stage.camera, stage.renderer.domElement);
      c.enableDamping = true; c.dampingFactor = 0.08;
      c.minDistance = 0.5; c.maxDistance = 4;
      c.maxPolarAngle = Math.PI * 0.49;
      c.enablePan = false;
      c.autoRotate = !!o.autoRotate; c.autoRotateSpeed = 0.5;
      c.addEventListener("start", () => { c.autoRotate = false; clearTimeout(this._ar); });
      c.addEventListener("end", () => { if (o.autoRotate) this._ar = setTimeout(() => { c.autoRotate = true; }, 6000); });
      this.controls = c;
    }
  }

  lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x9fb4ff, 0x0b1228, 0.5));
    const key = new THREE.SpotLight(0xffffff, 26, 9, 0.62, 0.55, 1.4);
    key.position.set(-1.6, 3.2, 2.2);
    key.castShadow = this.stage.renderer.shadowMap.enabled;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    s.add(key, key.target);
    const rim = new THREE.PointLight(0x63e3f2, 7, 5, 1.6);
    rim.position.set(1.6, 1.2, -1.4);
    s.add(rim);
    const back = new THREE.DirectionalLight(0x8fa8ff, 1.4);
    back.position.set(0, 2, -3);
    s.add(back);
    const warm = new THREE.PointLight(0xffb070, 3, 3, 1.8);
    warm.position.set(1.2, 0.6, 1.4);
    s.add(warm);
    this.keyLight = key;
  }

  /** Dar (dikey) ekranlarda kamerayı geri çeker. */
  fit(v) {
    const a = this.stage.camera.aspect || 1;
    const k = a < 1.2 ? Math.pow(1.2 / a, 0.75) : 1;
    const t = this.controls ? this.controls.target : new THREE.Vector3();
    return v.clone().sub(t).multiplyScalar(k).add(t);
  }

  clear() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.root.clear();
    if (this.simTex) this.simTex.texture.dispose();
    this.sim = null; this.simTex = null; this.vessel = null;
  }

  /** Kitaba göre sahneyi kurar. */
  setBook(book, geometry, params = null) {
    this.clear();
    this.book = book;
    this.geometry = geometry || book.sim?.prefer || "tube";
    const preset = params || book.sim?.[this.geometry] || book.sim?.petri || book.sim?.tube;
    if (!preset) return;
    this.preset = preset;
    this.colors = book.colors;
    this.sim = new LiesegangSim(preset);
    this.simTex = new SimTexture(this.sim, book.colors, { aging: book.sim?.aging || 0, size: this.o.texSize || 384, mode: this.mode });
    const ghsOf = (i) => book.safety?.ghs?.slice(i * 2, i * 2 + 3) || [];
    const accent = CLOTH[book.cloth]?.base || "#1F3FB0";

    if (this.geometry === "tube") {
      const r = rack({ n: 3 });
      r.position.set(0, 0, 0);
      this.root.add(r);
      const tube = testTube({ texture: this.simTex.texture, colors: book.colors, H: 0.95 });
      tube.position.set(r.userData.slotX(1), 0.05, 0);
      this.root.add(tube);
      // Yan tüpler: kontrol tüpü (iç elektrolitsiz) ve boş tüp
      const ctrl = testTube({ texture: null, colors: { gel: "#E9EDEC", outer: book.colors.outer }, H: 0.95 });
      ctrl.position.set(r.userData.slotX(0), 0.05, 0);
      this.root.add(ctrl);
      const empty = testTube({ texture: null, colors: { gel: book.colors.gel }, H: 0.95, liqH: 0 });
      empty.position.set(r.userData.slotX(2), 0.05, 0);
      empty.gelMesh.scale.y = 0.001; empty.gelMesh.visible = false;
      this.root.add(empty);
      this.vessel = tube;
      if (this._lastGeo !== "tube") {
        if (this.controls) { this.controls.target.set(0, 0.45, 0); }
        this.stage.camera.position.copy(this.fit(new THREE.Vector3(0.7, 1.05, 2.35)));
      }
    } else {
      const dish = petriDish({ texture: this.simTex.texture, colors: book.colors, R: 0.5 });
      dish.position.set(0, 0, 0.05);
      this.root.add(dish);
      this.vessel = dish;
      const dr = dropper({ color: book.colors.outer });
      dr.rotation.z = Math.PI / 2.4;
      dr.position.set(0.72, 0.05, 0.25);
      this.root.add(dr);
      if (this._lastGeo !== "petri") {
        if (this.controls) { this.controls.target.set(0, 0.05, 0); }
        this.stage.camera.position.copy(this.fit(new THREE.Vector3(0.2, 1.45, 1.6)));
      }
    }

    if (this.o.bottles !== false && book.materials) {
      const inner = book.materials.find((m) => m.rol === "iç");
      const outer = book.materials.find((m) => m.rol === "dış");
      const mk = (m, x, z, amber) => {
        if (!m) return;
        const unit = m === inner ? book.sim?.inner : book.sim?.outer;
        const b = bottle({ amber, R: 0.13, H: 0.36, color: m === outer ? book.colors.outer : book.colors.gel, level: 0.6, label: { name: m.ad, formula: m.f || "", conc: unit ? `${unit.ref} ${unit.unit}` : "", ghs: ghsOf(m === inner ? 0 : 1), accent } });
        b.position.set(x, 0, z);
        b.rotation.y = -x * 0.6;
        this.root.add(b);
      };
      mk(inner, -0.78, -0.35, /Cr|Ag|Co|Ni/.test(inner?.f || ""));
      mk(outer, 0.78, -0.4, /Ag|NH3/.test(outer?.f || ""));
    }
    if (this.o.crystal !== false) {
      const cr = crystalCluster(book.colors.ppt, { seed: parseInt(book.no, 10), size: 0.045, glow: 0.15 });
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.02, ior: 1.5, clearcoat: 1 }));
      const grp = new THREE.Group();
      grp.add(dish); cr.position.y = 0.01; grp.add(cr);
      grp.position.set(this.geometry === "tube" ? 0.55 : -0.75, 0.01, this.geometry === "tube" ? 0.38 : 0.3);
      this.crystal = cr;
      this.root.add(grp);
    }
    if (this._lastGeo !== this.geometry) this.stage.camera.lookAt(this.controls ? this.controls.target : new THREE.Vector3(0, 0.4, 0));
    this._lastGeo = this.geometry;
    this.restart();
  }

  restart() {
    if (!this.sim) return;
    this.sim.reset();
    this.wall = 0;
    this.Tend = Math.pow((0.9 * this.sim.p.N) / (this.geometry === "tube" ? 2.6 : 2.2), 2);
    this.bandCount = 0;
    this.finished = false;
    this._bandTimer = 0;
    this._texTimer = 0;
    this.simTex.update();
  }

  setMode(mode) {
    this.mode = mode;
    if (this.simTex) { this.simTex.mode = mode; this.simTex.update(); }
  }

  progress() { return this.sim ? Math.min(1, this.sim.frontPosition() / (this.sim.p.N * 0.9)) : 0; }
  realTime() { return this.sim ? realSeconds(this.sim, this.Dreal || 1.5e-9) : 0; }

  tick(dt) {
    if (this.sim && this.running && !this.finished) {
      this.wall += dt * this.speed;
      const prog = Math.min(1, this.wall / this.duration);
      const target = this.Tend * prog * prog;
      const t0 = performance.now();
      while (this.sim.t < target && performance.now() - t0 < 7) this.sim.step(40);
      const front = this.sim.frontPosition();
      if (front > 25) {
        const est = this.sim.t * Math.pow((0.92 * this.sim.p.N) / front, 2);
        this.Tend += (est - this.Tend) * 0.05;
      }
      this._bandTimer += dt;
      if (this._bandTimer > 0.2) {
        this._bandTimer = 0;
        const bands = detectBands(this.sim.d, this.sim.tNuc, { start: this.geometry === "tube" ? 1 : Math.ceil(this.sim.p.R0) });
        if (bands.length > this.bandCount) { this.bandCount = bands.length; this.o.onBand && this.o.onBand(this.bandCount, bands); }
      }
      if (this.sim.finished(0.9)) { this.finished = true; this.o.onFinish && this.o.onFinish(this); }
      this._texTimer += dt;
      if (this.geometry === "tube" || this._texTimer > 1 / 24) { this._texTimer = 0; this.simTex.update(); }
    }
    if (this.crystal) this.crystal.rotation.y += dt * 0.35;
    if (this.controls) this.controls.update();
    this.o.onTick && this.o.onTick(this);
    this.stage.render();
  }
}
