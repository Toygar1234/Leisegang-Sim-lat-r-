/**
 * 3B KİTAP OKUYUCU
 * Kitap raftan uçup önümüze gelir, kapağı açılır; sayfalar kâğıt gibi kıvrılarak çevrilir.
 * "Canlı deney" sayfasında 3B deney sayfadan dışarı çıkar ve simülasyon canlı hesaplanır.
 *
 * Kitabın yerel ekseni: sırt x = 0'da, sayfalar +X yönünde, sayfa yüzü +Z'ye (kameraya) bakar.
 * Sayfa kıvrılması: sayfa 30 dilime ayrılır; i. dilimin açısı aᵢ = φ·(1 − c·sin(πp)·xᵢ/W),
 * konumlar bu açıların toplanmasıyla bulunur (X += Δ·cos a, Z += Δ·sin a).
 */
import * as THREE from "three";
import { buildPages } from "./pages.js";
import { pageEdge, marble } from "./textures.js";
import { LiesegangSim } from "../sim/engine.js";
import { detectBands } from "../sim/analysis.js";
import { SimTexture } from "./simview.js";
import { testTube, petriDish, crystalCluster } from "./models/labware.js";
import * as NATURE from "./models/nature.js";
import { sfx } from "../core/audio.js";
import { CLOTH } from "../data/books.js";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const SEG = 30, EPS = 0.0016;

export class Reader {
  constructor({ scene, camera, renderer, ui }) {
    this.scene = scene; this.camera = camera; this.renderer = renderer; this.ui = ui;
    this.state = "idle";
    this.dim = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ color: 0x0a0402, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.dim.renderOrder = 5;
    this.dim.visible = false;
    scene.add(this.dim);
    this.glow = new THREE.PointLight(0xffd59a, 0, 3, 1.5);
    scene.add(this.glow);
  }

  get active() { return this.state !== "idle"; }

  /** Okuma konumu: kitabın açık hâli ekranın ~%80'ini kaplar. */
  pose() {
    const cam = this.camera;
    const fov = cam.fov * Math.PI / 180;
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const Wb = this.pageW * 2 + 0.04, Hb = this.pageH + 0.04;
    const dH = Hb / (0.74 * 2 * Math.tan(fov / 2));
    const dW = Wb / (0.9 * 2 * Math.tan(fov / 2) * cam.aspect);
    const d = Math.max(dH, dW);
    const pos = cam.position.clone().addScaledVector(fwd, d);
    pos.y += d * 0.035;
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, cam.position, new THREE.Vector3(0, 1, 0)));
    // lookAt +Z'yi kameraya çevirmez (−Z'yi çevirir); bu yüzden 180° döndür
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.1));
    return { pos, q, d };
  }

  build(book, shelfGroup) {
    const dims = shelfGroup.dims;
    this.book = book;
    this.pageW = dims.D * 0.96;
    this.pageH = dims.H * 0.95;
    const res = window.innerWidth < 900 ? 0.75 : 1;
    const { pages } = buildPages(book, this.pageH / this.pageW, res);
    this.pages = pages;
    const n = pages.length / 2;
    this.n = n;
    const root = new THREE.Group();
    const inner = new THREE.Group();
    root.add(inner);
    this.root = root; this.inner = inner;

    // Kapak malzemeleri raftaki kitaptan alınır
    let coverMat = null, endMat = new THREE.MeshStandardMaterial({ map: marble(parseInt(book.no, 10)), roughness: 0.75 }), clothMat = null;
    shelfGroup.traverse((o) => { if (o.name === "frontBoard") { coverMat = o.material[0]; clothMat = o.material[2]; } });
    const board = 0.012, Wb = this.pageW + 0.018, Hb = dims.H;
    this.Tp = dims.T * 0.72; // sayfa bloğu toplam kalınlığı

    const edge = pageEdge();
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xc9bfae, roughness: 0.95 });
    const edgeMat = new THREE.MeshStandardMaterial({ map: edge, color: 0xcfc8bb, roughness: 0.95 });
    const stackGeo = new THREE.BoxGeometry(1, 1, 1);
    this.stackR = new THREE.Mesh(stackGeo, [edgeMat, paperMat, edgeMat, edgeMat, paperMat, paperMat]);
    this.stackL = new THREE.Mesh(stackGeo, [paperMat, edgeMat, edgeMat, edgeMat, paperMat, paperMat]);
    inner.add(this.stackR, this.stackL);

    const boardGeo = new THREE.BoxGeometry(Wb, Hb, board);
    this.backCover = new THREE.Mesh(boardGeo, [clothMat, clothMat, clothMat, clothMat, endMat, clothMat]);
    this.backCover.position.x = Wb / 2;
    inner.add(this.backCover);
    this.leftBoard = new THREE.Mesh(boardGeo, [clothMat, clothMat, clothMat, clothMat, endMat, clothMat]);
    this.leftBoard.visible = false;

    this.frontPivot = new THREE.Group();
    const front = new THREE.Mesh(boardGeo, [clothMat, clothMat, clothMat, clothMat, coverMat, endMat]);
    front.position.set(Wb / 2, 0, (n + 1) * EPS + board / 2);
    this.frontPivot.add(front);
    inner.add(this.frontPivot);
    this.board = board;

    // Sayfa yaprakları
    this.leaves = [];
    for (let k = 0; k < n; k++) {
      const geo = new THREE.PlaneGeometry(this.pageW, this.pageH, SEG, 1);
      geo.translate(this.pageW / 2, 0, 0);
      const fm = new THREE.MeshStandardMaterial({ map: pages[2 * k].texture, color: 0xcfc8bb, roughness: 0.95, envMapIntensity: 0.2, side: THREE.FrontSide });
      const bm = new THREE.MeshStandardMaterial({ map: pages[2 * k + 1].texture, color: 0xcfc8bb, roughness: 0.95, envMapIntensity: 0.2, side: THREE.BackSide });
      const pivot = new THREE.Group();
      pivot.add(new THREE.Mesh(geo, fm), new THREE.Mesh(geo, bm));
      inner.add(pivot);
      this.leaves.push({ pivot, geo, p: 0, target: 0, last: -1, k });
    }
    this.leaves.forEach((l) => this.deform(l, 0));
    this.spread = 0;
    this.stack(0);

    // Pop-up nesnesi
    this.popupIndex = pages.findIndex((p) => p.popup);
    this.popup = new THREE.Group();
    this.popup.position.set(this.pageW * 0.5, -this.pageH * 0.04, 0.01);
    this.popup.scale.setScalar(0.0001);
    inner.add(this.popup);
    this.buildPopup(book);
    this.pu = 0;

    this.scene.add(root);
  }

  buildPopup(book) {
    const g = this.popup;
    this.sim = null;
    if (book.model) {
      const make = { agate: NATURE.agate, rock: NATURE.sandstone, cell: NATURE.tissueSlide, nano: NATURE.nanoRings, paper: NATURE.rungePaper }[book.model];
      const m = make();
      const s = book.model === "agate" ? 0.42 : book.model === "rock" ? 0.42 : 0.36;
      m.scale.setScalar(s);
      if (book.model === "cell" || book.model === "nano" || book.model === "paper") m.rotation.x = 1.1;
      g.add(m);
      this.popModel = m;
      return;
    }
    const geo = book.sim?.prefer || "tube";
    const params = book.sim[geo] || book.sim.tube || book.sim.petri;
    this.sim = new LiesegangSim(params);
    this.simTex = new SimTexture(this.sim, book.colors, { aging: book.sim.aging || 0, size: 320, mode: book.colors?.thermal ? "thermal" : "ppt" });
    if (geo === "tube" && params.geometry !== "radial") {
      const t = testTube({ texture: this.simTex.texture, colors: book.colors, H: 0.95, R: 0.07 });
      t.position.y = -0.3;
      t.scale.setScalar(0.5);
      const holder = new THREE.Group();
      holder.add(t);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 12, 48), new THREE.MeshPhysicalMaterial({ color: 0xd9b46a, metalness: 1, roughness: 0.25 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = -0.06;
      holder.add(ring);
      g.add(holder);
      this.popModel = holder;
    } else {
      const d = petriDish({ texture: this.simTex.texture, colors: book.colors, R: 0.5, lid: false });
      d.scale.setScalar(0.44);
      d.rotation.x = 1.0;
      g.add(d);
      this.popModel = d;
    }
    const cr = crystalCluster(book.colors.ppt, { seed: parseInt(book.no, 10), size: 0.018, glow: 0.25, count: 7 });
    cr.position.set(0.21, -0.3, 0.04);
    g.add(cr);
    this.crystal = cr;
    this.simWall = 0;
    this.simTend = Math.pow((0.9 * this.sim.p.N) / 2.4, 2);
    this.bandCount = 0;
    this.bandTimer = 0;
  }

  /** Sayfa yaprağını kıvırır (CPU'da geometri güncellenir). */
  deform(leaf, p) {
    if (Math.abs(leaf.last - p) < 1e-5) return;
    leaf.last = p;
    const pos = leaf.geo.attributes.position;
    const phi = p * Math.PI;
    const c = 0.42 * Math.sin(Math.PI * p);
    const d = this.pageW / SEG;
    let X = 0, Z = 0;
    const xs = [0], zs = [0];
    for (let i = 0; i < SEG; i++) {
      const u = (i + 0.5) / SEG;
      const a = phi * (1 - c * Math.pow(u, 1.2));
      X += d * Math.cos(a); Z += d * Math.sin(a);
      xs.push(X); zs.push(Z);
    }
    for (let v = 0; v < pos.count; v++) {
      const col = v % (SEG + 1);
      pos.setX(v, xs[col]); pos.setZ(v, zs[col]);
    }
    pos.needsUpdate = true;
    leaf.geo.computeVertexNormals();
    const n = this.n;
    leaf.pivot.position.z = (n - leaf.k) * EPS * (1 - p) + (leaf.k + 1) * EPS * p;
  }

  /** Sağ ve sol sayfa yığınlarının kalınlığı. */
  stack(f) {
    const tL = Math.max(0.002, this.Tp * 0.9 * f), tR = Math.max(0.004, this.Tp * (0.96 - 0.9 * f));
    this.stackR.scale.set(this.pageW, this.pageH, tR); this.stackR.position.set(this.pageW / 2, 0, -tR / 2);
    this.stackL.scale.set(this.pageW, this.pageH, tL); this.stackL.position.set(-this.pageW / 2, 0, -tL / 2);
    this.backCover.position.z = -tR - this.board / 2;
    this.tL = tL;
  }

  open(book, shelfGroup) {
    if (this.active) return;
    this.build(book, shelfGroup);
    shelfGroup.updateMatrixWorld(true);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    shelfGroup.matrixWorld.decompose(p, q, s);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    this.from = { p, q };
    this.root.position.copy(p); this.root.quaternion.copy(q);
    this.inner.position.set(-this.pageW / 2, 0, 0.06);
    this.state = "opening";
    this.pending = 0;
    this.t = 0;
    this.dim.visible = true;
    this.ui.show(this);
    sfx.whoosh();
  }

  close(toGroup, done) {
    if (this.state !== "open") return;
    this.state = "closing";
    this.closeTo = toGroup;
    this.closeDone = done;
    this.t = 0;
    this.leaves.forEach((l) => { l.target = 0; });
    this.ui.hide();
    sfx.close();
  }

  next() {
    if (this.state === "opening") { this.pending = (this.pending || 0) + 1; return false; }
    if (this.state !== "open" || this.spread >= this.n) return false;
    const l = this.leaves[this.spread];
    l.target = 1; this.spread++;
    sfx.page();
    this.ui.update(this);
    return true;
  }
  prev() {
    if (this.state !== "open" || this.spread <= 0) return false;
    this.spread--;
    this.leaves[this.spread].target = 0;
    sfx.page();
    this.ui.update(this);
    return true;
  }
  goTo(spread) {
    while (this.spread < spread && this.next());
    while (this.spread > spread && this.prev());
  }

  // ── Sürükleyerek sayfa çevirme ──
  dragStart(x, y, rect) {
    if (this.state !== "open") return;
    this.drag = { x, y, rect, leaf: null, dir: 0 };
  }
  dragMove(x) {
    const d = this.drag;
    if (!d) return;
    const dx = x - d.x;
    const pw = d.rect.width / 2;
    if (!d.leaf) {
      if (dx < -8 && this.spread < this.n) { d.leaf = this.leaves[this.spread]; d.dir = 1; }
      else if (dx > 8 && this.spread > 0) { d.leaf = this.leaves[this.spread - 1]; d.dir = -1; }
      else return;
    }
    const p = d.dir === 1 ? Math.min(1, Math.max(0, -dx / (pw * 1.3))) : 1 - Math.min(1, Math.max(0, dx / (pw * 1.3)));
    d.leaf.target = p; d.leaf.p = p;
    d.moved = true;
  }
  dragEnd(x) {
    const d = this.drag;
    this.drag = null;
    if (!d) return false;
    if (!d.leaf) return false;
    if (d.dir === 1) { if (d.leaf.p > 0.3) { d.leaf.target = 1; this.spread++; sfx.page(); } else d.leaf.target = 0; }
    else { if (d.leaf.p < 0.7) { d.leaf.target = 0; this.spread--; sfx.page(); } else d.leaf.target = 1; }
    this.ui.update(this);
    return true;
  }

  /** Kitabın ekrandaki dikdörtgeni (piksel). */
  screenRect(canvasRect) {
    if (!this.root) return null;
    const pts = [[-this.pageW, this.pageH / 2], [this.pageW, this.pageH / 2], [this.pageW, -this.pageH / 2], [-this.pageW, -this.pageH / 2]].map(([x, y]) => {
      const v = new THREE.Vector3(x, y, 0);
      this.inner.localToWorld(v);
      v.project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left, y: (-v.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top };
    });
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), quad: pts };
  }

  /** Sağ sayfanın köşesi üzerindeyken sayfa hafifçe kalkar. */
  hover(x, y, rect) {
    if (this.state !== "open" || this.drag || !rect) return;
    const l = this.leaves[this.spread];
    if (!l) return;
    const nearEdge = x > rect.left + rect.width * 0.82 && x < rect.right + 20 && y > rect.top && y < rect.bottom;
    if (Math.abs(l.target) < 0.1) l.target = nearEdge ? 0.07 : 0;
  }

  tick(dt, t) {
    if (this.state === "idle") return;
    this.t += dt;
    const P = this.pose();
    const dimTarget = this.state === "closing" ? 0 : 0.7;
    this.dim.material.opacity += (dimTarget - this.dim.material.opacity) * (1 - Math.exp(-6 * dt));
    this.dim.position.copy(P.pos).addScaledVector(new THREE.Vector3().subVectors(this.camera.position, P.pos).normalize(), -0.35);
    this.dim.lookAt(this.camera.position);

    if (this.state === "opening") {
      const a = Math.min(1, this.t / 0.75);
      const e = ease(a);
      this.root.position.lerpVectors(this.from.p, P.pos, e);
      this.root.quaternion.slerpQuaternions(this.from.q, P.q, e);
      const b = Math.min(1, Math.max(0, (this.t - 0.45) / 0.8));
      const eb = ease(b);
      this.frontPivot.rotation.y = -Math.PI * eb;
      this.inner.position.x = -this.pageW / 2 * (1 - eb);
      this.glow.intensity = Math.sin(eb * Math.PI) * 1.2;
      if (b >= 1) {
        this.state = "open"; this.ui.update(this); this.glow.intensity = 0;
        const pend = this.pending || 0; this.pending = 0;
        for (let i = 0; i < pend; i++) setTimeout(() => this.next(), i * 260);
      }
    } else if (this.state === "open") {
      this.root.position.lerp(P.pos, 1 - Math.exp(-8 * dt));
      this.root.quaternion.slerp(P.q, 1 - Math.exp(-8 * dt));
    } else if (this.state === "closing") {
      const allBack = this.leaves.every((l) => l.p < 0.02);
      if (allBack) {
        if (this.tClose === undefined) this.tClose = this.t;
        const b = Math.min(1, (this.t - this.tClose) / 0.6);
        const eb = ease(b);
        this.frontPivot.rotation.y = -Math.PI * (1 - eb);
        this.inner.position.x = -this.pageW / 2 * eb;
        const c = Math.min(1, Math.max(0, (this.t - this.tClose - 0.35) / 0.7));
        if (c > 0) {
          const g = this.closeTo;
          g.updateMatrixWorld(true);
          const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
          g.matrixWorld.decompose(p, q, s);
          q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
          const ec = ease(c);
          this.root.position.lerpVectors(P.pos, p, ec);
          this.root.quaternion.slerpQuaternions(P.q, q, ec);
        }
        if (c >= 1) { this.dispose(); this.closeDone && this.closeDone(); return; }
      } else {
        this.leaves.forEach((l) => { l.target = 0; });
      }
    }

    // Yaprakları hareket ettir
    let flipF = 0;
    for (const l of this.leaves) {
      if (!this.drag || this.drag.leaf !== l) {
        const k = this.state === "closing" ? 9 : 5.5;
        let np = l.p + (l.target - l.p) * (1 - Math.exp(-k * dt));
        const step = dt * 0.35;
        if (Math.abs(l.target - np) < step) np = l.target; else np += Math.sign(l.target - np) * step * 0.2;
        l.p = np;
      }
      this.deform(l, l.p);
      flipF += l.p;
    }
    this.stack(flipF / this.n);
    const coverOpen = -this.frontPivot.rotation.y > Math.PI * 0.5;
    this.stackL.visible = coverOpen && flipF > 0.02;
    this.glow.position.copy(this.root.position);

    // Pop-up: ilgili sayfa açıkken sayfadan dışarı çıkar
    if (this.popupIndex >= 0) {
      const L = this.popupIndex / 2;
      const prevDone = this.leaves.slice(0, L).every((l) => l.p > 0.97);
      const here = this.state === "open" && prevDone && this.leaves[L].p < 0.04 && this.spread === L;
      this.pu += ((here ? 1 : 0) - this.pu) * (1 - Math.exp(-(here ? 4 : 12) * dt));
      const s = Math.max(0.0001, outBack(Math.min(1, this.pu)));
      this.popup.scale.setScalar(s);
      this.popup.position.z = 0.02 + 0.16 * this.pu;
      this.popup.visible = this.pu > 0.01;
      if (this.popModel) { this.popModel.rotation.y += dt * 0.5; }
      if (this.crystal) { this.crystal.rotation.y -= dt * 0.9; this.crystal.position.y = -0.3 + Math.sin(t * 1.5) * 0.015; }
      if (this.sim && this.pu > 0.5) this.runSim(dt);
    }
  }

  runSim(dt) {
    const sim = this.sim;
    if (sim.finished(0.9)) return;
    this.simWall += dt;
    const prog = Math.min(1, this.simWall / 20);
    const target = this.simTend * prog * prog;
    const t0 = performance.now();
    while (sim.t < target && performance.now() - t0 < 6) sim.step(40);
    const front = sim.frontPosition();
    if (front > 25) this.simTend += (sim.t * Math.pow((0.92 * sim.p.N) / front, 2) - this.simTend) * 0.05;
    this.bandTimer += dt;
    if (this.bandTimer > 0.2) {
      this.bandTimer = 0;
      const n = detectBands(sim.d, sim.tNuc, { start: sim.p.geometry === "radial" ? Math.ceil(sim.p.R0) : 1 }).length;
      if (n > this.bandCount) { this.bandCount = n; sfx.band(n - 1); }
    }
    this.simTex.update();
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => { if (o.geometry && o.geometry.type !== "BoxGeometry") o.geometry.dispose(); });
    this.pages.forEach((p) => p.texture.dispose());
    if (this.simTex) this.simTex.texture.dispose();
    this.root = null; this.sim = null; this.simTex = null; this.popModel = null; this.crystal = null;
    this.tClose = undefined;
    this.state = "idle";
    this.dim.visible = false;
    this.dim.material.opacity = 0;
  }
}
