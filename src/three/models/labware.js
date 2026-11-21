/**
 * Laboratuvar malzemeleri (3B, kodla modellenmiş): deney tüpü, Petri kabı, reaktif şişesi,
 * tüp sporu, çökelti kristalleri, beher, erlen, mezür, damlalık, terazi, ısıtıcı, gözlük, spatül.
 */
import * as THREE from "three";
import { glass, gel, liquid, plastic, rubber, metal, wood, ceramic, crystal } from "../materials.js";
import { canvas, tex, drawGHS, graduation } from "../textures.js";
import { drawFormula } from "../../core/formula.js";
import { mulberry32 } from "../../sim/engine.js";

const V2 = (x, y) => new THREE.Vector2(x, y);
const SANS = '"Inter Tight", system-ui, sans-serif';
const SERIF = '"Newsreader", Georgia, serif';

function shadows(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

/** Kalın duvarlı cam profili (dönel yüzey). Alt kısım yarım küre. */
function tubeProfile(R, ri, H, lip = 0.006, seg = 12) {
  const pts = [];
  for (let k = 0; k <= seg; k++) { const a = -Math.PI / 2 + (k / seg) * Math.PI / 2; pts.push(V2(Math.max(0.0001, ri * Math.cos(a)), R + ri * Math.sin(a))); }
  pts.push(V2(ri, H));
  pts.push(V2(ri + (R - ri) * 0.5, H + lip * 0.7));
  pts.push(V2(R + lip, H + lip * 0.4));
  pts.push(V2(R + lip, H - lip * 0.6));
  pts.push(V2(R, H - lip * 1.2));
  for (let k = seg; k >= 0; k--) { const a = -Math.PI / 2 + (k / seg) * Math.PI / 2; pts.push(V2(Math.max(0.0001, R * Math.cos(a)), R + R * Math.sin(a))); }
  return pts;
}

/**
 * Deney tüpü (jel + üstteki çözelti + tıpa).
 * @param {object} o { R, H, gelH, liqH, texture, colors, stopper }
 */
export function testTube(o = {}) {
  const R = o.R ?? 0.06, ri = R * 0.88, H = o.H ?? 0.95;
  const gelH = o.gelH ?? H * 0.66, liqH = o.liqH ?? H * 0.1;
  const g = new THREE.Group();
  const glassMesh = new THREE.Mesh(new THREE.LatheGeometry(tubeProfile(R, ri, H), 48), glass({ side: THREE.DoubleSide, thickness: 0.02 }));
  glassMesh.renderOrder = 2;
  g.add(glassMesh);
  const gr = ri * 0.985;
  const gelSideMat = gel(o.texture || null);
  const gelCapMat = new THREE.MeshPhysicalMaterial({ color: o.colors?.gel ?? 0xeeeeee, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const gelMesh = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, gelH, 48, 1, false), [gelSideMat, gelCapMat, gelCapMat]);
  gelMesh.position.y = R + gelH / 2;
  g.add(gelMesh);
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(gr, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gelCapMat);
  bottom.position.y = R;
  g.add(bottom);
  let liq = null;
  if (liqH > 0) {
    liq = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, liqH, 40, 1, false), liquid(o.colors?.outer ?? 0xf2f5f7, { thickness: 0.1, att: 0.6 }));
    liq.position.y = R + gelH + liqH / 2 + 0.001;
    g.add(liq);
  }
  if (o.stopper !== false) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, ri * 0.92, R * 1.3, 32), rubber(0x3b3b40));
    st.position.y = H + R * 0.45;
    g.add(st);
  }
  shadows(g);
  glassMesh.castShadow = false;
  g.userData = { R, H, gelH, gelTop: R + gelH };
  g.gelMesh = gelMesh; g.gelMat = gelSideMat; g.capMat = gelCapMat; g.liquid = liq;
  return g;
}

/** Petri kabı: cam taban, jel diski (radyal simülasyon dokusu), ortada damla, kapak. */
export function petriDish(o = {}) {
  const R = o.R ?? 0.5, h = o.h ?? 0.075, t = 0.006;
  const g = new THREE.Group();
  const prof = [V2(0.0001, 0), V2(R - 0.01, 0), V2(R, 0.008), V2(R, h), V2(R - t * 0.5, h + t * 0.4), V2(R - t, h), V2(R - t, t + 0.006), V2(R - t - 0.008, t), V2(0.0001, t)];
  const base = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), glass({ side: THREE.DoubleSide, thickness: 0.01 }));
  g.add(base);
  const gelMat = gel(o.texture || null);
  const sideMat = new THREE.MeshPhysicalMaterial({ color: o.colors?.gel ?? 0xeeeeee, roughness: 0.35, clearcoat: 0.6 });
  const gh = h * 0.42;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R - t - 0.002, R - t - 0.002, gh, 96, 1, false), [sideMat, gelMat, sideMat]);
  disc.position.y = t + gh / 2;
  g.add(disc);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(R * (o.dropR ?? 0.05), 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), liquid(o.colors?.outer ?? 0xf2f5f7, { thickness: 0.05 }));
  drop.scale.y = 0.45;
  drop.position.y = t + gh;
  g.add(drop);
  const lidR = R + 0.012;
  const lidProf = [V2(0.0001, h * 0.55 + t), V2(lidR - 0.01, h * 0.55 + t), V2(lidR, h * 0.55), V2(lidR, 0.02), V2(lidR - t, 0.02), V2(lidR - t, h * 0.55 - 0.001), V2(0.0001, h * 0.55)];
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidProf, 72), glass({ side: THREE.DoubleSide, thickness: 0.008 }));
  lid.position.y = h * 0.75;
  lid.visible = o.lid !== false;
  g.add(lid);
  shadows(g);
  base.castShadow = false; lid.castShadow = false;
  g.userData = { R, h };
  g.gelMat = gelMat; g.lid = lid; g.drop = drop; g.disc = disc;
  return g;
}

/** Şişe etiketi dokusu. */
export function labelTexture({ name = "", formula = "", conc = "", ghs = [], accent = "#1F3FB0" }) {
  const W = 1024, H = 360, c = canvas(W, H), x = c.getContext("2d");
  x.fillStyle = "#F7F3E8"; x.fillRect(0, 0, W, H);
  x.fillStyle = accent; x.fillRect(0, 0, W, 54);
  x.fillStyle = "#fff"; x.font = `600 26px ${SANS}`; x.fillText("LIESEGANG LAB · REAKTİF", 34, 37);
  x.fillStyle = "#141414";
  drawFormula(x, formula, 34, 150, { size: 84, family: SERIF, weight: 600 });
  x.font = `500 34px ${SANS}`; x.fillText(name, 36, 210);
  x.fillStyle = "#6D6A63"; x.font = `500 26px ${SANS}`; x.fillText(conc, 36, 260);
  ghs.slice(0, 4).forEach((code, i) => drawGHS(x, code, W - 90 - i * 108, 200, 120));
  x.fillStyle = "#141414"; x.fillRect(34, H - 46, W - 68, 2);
  x.font = `600 20px ${SANS}`; x.fillText("YALNIZCA ÖĞRETMEN GÖZETİMİNDE KULLANILIR", 34, H - 16);
  return tex(c);
}

/** Reaktif şişesi (amber veya şeffaf cam, vida kapak, etiket, içinde sıvı/katı). */
export function bottle(o = {}) {
  const R = o.R ?? 0.16, H = o.H ?? 0.42;
  const g = new THREE.Group();
  const neckR = R * 0.42;
  const prof = [V2(0.0001, 0), V2(R - 0.02, 0), V2(R, 0.02), V2(R, H * 0.72), V2(R * 0.92, H * 0.8), V2(neckR * 1.08, H * 0.9), V2(neckR, H * 0.93), V2(neckR, H), V2(neckR - 0.008, H), V2(neckR - 0.008, H * 0.93), V2(R - 0.012, H * 0.72), V2(R - 0.012, 0.014), V2(0.0001, 0.014)];
  const amber = o.amber;
  const glassMat = glass({ side: THREE.DoubleSide, thickness: 0.05, tint: amber ? 0x8a4a12 : 0xeaf6f1, attDist: amber ? 0.12 : 1.2, color: amber ? 0xffcf9a : 0xffffff });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), glassMat);
  g.add(body);
  if (o.fill !== false) {
    const fh = H * (o.level ?? 0.55);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.016, R - 0.016, fh, 48), o.solid ? new THREE.MeshPhysicalMaterial({ color: o.color ?? 0xffffff, roughness: 0.8, sheen: 0.5 }) : liquid(o.color ?? 0xf2f5f7, { thickness: 0.2, att: 0.3 }));
    inner.position.y = 0.016 + fh / 2;
    g.add(inner);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(neckR * 1.18, neckR * 1.18, H * 0.13, 40, 1), plastic(o.capColor ?? 0x15161a, 0.5));
  cap.position.y = H + H * 0.05;
  g.add(cap);
  // tırtıklı kapak çizgileri
  const ribs = new THREE.Mesh(new THREE.CylinderGeometry(neckR * 1.2, neckR * 1.2, H * 0.1, 40, 1, true), plastic(o.capColor ?? 0x15161a, 0.35));
  ribs.position.y = cap.position.y;
  g.add(ribs);
  if (o.label) {
    const lbl = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.002, R + 0.002, H * 0.36, 48, 1, true, -Math.PI * 0.62, Math.PI * 1.24), new THREE.MeshPhysicalMaterial({ map: labelTexture(o.label), roughness: 0.6, clearcoat: 0.3 }));
    lbl.position.y = H * 0.36;
    g.add(lbl);
  }
  shadows(g);
  body.castShadow = false;
  return g;
}

/** Ahşap tüp sporu (delikli üst tabla). */
export function rack(o = {}) {
  const n = o.n ?? 4, W = o.W ?? 0.18 * n + 0.1, Dd = 0.2, Hh = o.H ?? 0.42;
  const g = new THREE.Group();
  const w = wood();
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, -Dd / 2); shape.lineTo(W / 2, -Dd / 2); shape.lineTo(W / 2, Dd / 2); shape.lineTo(-W / 2, Dd / 2); shape.closePath();
  for (let i = 0; i < n; i++) {
    const hole = new THREE.Path();
    hole.absarc(-W / 2 + 0.1 + i * ((W - 0.2) / Math.max(1, n - 1)), 0, o.holeR ?? 0.072, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 32 }), w);
  top.rotation.x = -Math.PI / 2;
  top.position.y = Hh;
  g.add(top);
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, Dd + 0.06), w);
  base.position.y = 0.02;
  g.add(base);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.035, Hh + 0.02, Dd), w);
    side.position.set(sx * (W / 2 - 0.018), Hh / 2 + 0.02, 0);
    g.add(side);
  }
  const mid = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.025, Dd * 0.9), w);
  mid.position.y = Hh * 0.35;
  g.add(mid);
  shadows(g);
  g.userData = { slotX: (i) => -W / 2 + 0.1 + i * ((W - 0.2) / Math.max(1, n - 1)), H: Hh };
  return g;
}

/** Çökelti kristal kümesi (bir avuç parıldayan kristal). */
export function crystalCluster(color, o = {}) {
  const g = new THREE.Group();
  const rnd = mulberry32(o.seed ?? 3);
  const mat = crystal(color, { glow: o.glow ?? 0.1 });
  const geo = new THREE.OctahedronGeometry(1, 0);
  for (let i = 0; i < (o.count ?? 9); i++) {
    const m = new THREE.Mesh(geo, mat);
    const s = (o.size ?? 0.05) * (0.5 + rnd());
    m.scale.set(s * 0.55, s * (1.2 + rnd() * 1.4), s * 0.55);
    m.position.set((rnd() - 0.5) * 0.12, s * 0.6, (rnd() - 0.5) * 0.12);
    m.rotation.set((rnd() - 0.5) * 0.9, rnd() * 3, (rnd() - 0.5) * 0.9);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

/** Laboratuvar tezgâhı (koyu taş yüzey, hafif yansımalı). */
export function bench(o = {}) {
  const W = o.W ?? 6, Dd = o.D ?? 3;
  const c = canvas(512, 512), x = c.getContext("2d");
  const rnd = mulberry32(77);
  x.fillStyle = "#1a2133"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},${rnd() * 0.05})`; x.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2); }
  const t = tex(c, { repeat: [W / 1.5, Dd / 1.5] });
  const m = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, Dd), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 0.6 }));
  m.position.y = -0.04;
  m.receiveShadow = true;
  return m;
}

/** Beher (dökme ağızlı, ölçek çizgili). */
export function beaker(o = {}) {
  const R = o.R ?? 0.22, H = o.H ?? 0.5, t = 0.008;
  const g = new THREE.Group();
  const prof = [V2(0.0001, 0), V2(R - 0.02, 0), V2(R, 0.02), V2(R, H), V2(R + 0.01, H + 0.008), V2(R - t, H + 0.004), V2(R - t, t + 0.02), V2(R - 0.02 - t, t), V2(0.0001, t)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glass({ side: THREE.DoubleSide }));
  g.add(body);
  const grad = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, H * 0.8, 48, 1, true, -0.5, 1.0), new THREE.MeshBasicMaterial({ map: graduation({ marks: 5, step: 50 }), transparent: true, opacity: 0.85, depthWrite: false }));
  grad.position.y = H * 0.45;
  g.add(grad);
  if (o.fill) {
    const lq = new THREE.Mesh(new THREE.CylinderGeometry(R - t - 0.002, R - t - 0.002, H * o.fill, 48), liquid(o.color ?? 0x9fd3ff));
    lq.position.y = t + (H * o.fill) / 2;
    g.add(lq);
  }
  shadows(g); body.castShadow = false;
  return g;
}

/** Erlenmeyer. */
export function flask(o = {}) {
  const R = o.R ?? 0.24, H = o.H ?? 0.55, n = R * 0.28;
  const g = new THREE.Group();
  const prof = [V2(0.0001, 0), V2(R - 0.02, 0), V2(R, 0.025), V2(n * 1.05, H * 0.72), V2(n, H * 0.78), V2(n, H), V2(n + 0.012, H + 0.01), V2(n - 0.008, H + 0.006), V2(n - 0.008, H * 0.78), V2(R - 0.012, 0.03), V2(R - 0.03, 0.012), V2(0.0001, 0.012)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glass({ side: THREE.DoubleSide }));
  g.add(body);
  if (o.fill) {
    const fh = H * 0.28;
    const lprof = [V2(0.0001, 0.014), V2(R - 0.03, 0.014), V2(R - 0.014, 0.03), V2((R - 0.014) - (R - n) * (fh / (H * 0.72)), fh), V2(0.0001, fh)];
    const lq = new THREE.Mesh(new THREE.LatheGeometry(lprof, 48), liquid(o.color ?? 0xffb37a));
    g.add(lq);
  }
  shadows(g); body.castShadow = false;
  return g;
}

/** Mezür (ölçekli silindir, altıgen taban). */
export function cylinder(o = {}) {
  const R = o.R ?? 0.07, H = o.H ?? 0.85;
  const g = new THREE.Group();
  const prof = [V2(0.0001, 0.04), V2(R, 0.04), V2(R, H), V2(R + 0.02, H + 0.01), V2(R - 0.006, H + 0.006), V2(R - 0.006, 0.05), V2(0.0001, 0.05)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glass({ side: THREE.DoubleSide }));
  g.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R * 2.4, R * 2.6, 0.04, 6), glass({ thickness: 0.04 }));
  base.position.y = 0.02;
  g.add(base);
  const grad = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, H * 0.85, 32, 1, true, -0.6, 1.2), new THREE.MeshBasicMaterial({ map: graduation({ marks: 10, step: 10 }), transparent: true, opacity: 0.85, depthWrite: false }));
  grad.position.y = H * 0.5;
  g.add(grad);
  if (o.fill) {
    const lq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.008, R - 0.008, H * o.fill, 32), liquid(o.color ?? 0xb7f0d8));
    lq.position.y = 0.05 + (H * o.fill) / 2;
    g.add(lq);
  }
  shadows(g); body.castShadow = false;
  return g;
}

/** Damlalık / pipet (cam gövde + kauçuk puar). Parçalara ayrılabilir. */
export function dropper(o = {}) {
  const g = new THREE.Group();
  const R = 0.028;
  const prof = [V2(0.003, 0), V2(0.006, 0), V2(R * 0.5, 0.18), V2(R, 0.3), V2(R, 0.62), V2(R - 0.004, 0.62), V2(R - 0.004, 0.3), V2(R * 0.5 - 0.004, 0.18), V2(0.002, 0.004)];
  const tube = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), glass({ side: THREE.DoubleSide }));
  g.add(tube);
  const bulbProf = [];
  for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI; bulbProf.push(V2(Math.max(0.0001, Math.sin(a) * 0.05 + (k < 4 ? 0.01 : 0)), 0.6 + (1 - Math.cos(a)) * 0.09)); }
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(bulbProf, 32), rubber(0xb3392b));
  bulb.name = "bulb";
  g.add(bulb);
  const lq = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.4, 0.003, 0.17, 16), liquid(o.color ?? 0x9fd3ff));
  lq.position.y = 0.09;
  g.add(lq);
  shadows(g); tube.castShadow = false;
  g.parts = { bulb };
  return g;
}

/** Hassas terazi (0,01 g). */
export function balance() {
  const g = new THREE.Group();
  const bodyM = ceramic(0xe9ebee);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.78), bodyM);
  body.position.y = 0.06;
  g.add(body);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.2), bodyM);
  front.position.set(0, 0.11, 0.3);
  front.rotation.x = -0.35;
  g.add(front);
  const c = canvas(512, 128), x = c.getContext("2d");
  x.fillStyle = "#0c1a10"; x.fillRect(0, 0, 512, 128);
  x.fillStyle = "#7dffb0"; x.font = '500 84px "JetBrains Mono", monospace'; x.textAlign = "right"; x.fillText("0.357 g", 490, 96);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.08), new THREE.MeshBasicMaterial({ map: tex(c) }));
  screen.position.set(0, 0.145, 0.35);
  screen.rotation.x = -0.35 - Math.PI / 2 + Math.PI / 2;
  screen.rotation.x = -0.35;
  g.add(screen);
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 64), metal(0xd8dbe0, 0.18));
  pan.position.set(0, 0.135, -0.06);
  g.add(pan);
  const btnM = plastic(0x1f3fb0, 0.4);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 24), btnM); b.position.set(-0.2 + i * 0.07, 0.125, 0.37); b.rotation.x = -0.35; g.add(b); }
  shadows(g);
  return g;
}

/** Isıtıcılı manyetik karıştırıcı. */
export function hotplate() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.66), ceramic(0xf1f2f4));
  body.position.y = 0.08;
  g.add(body);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 64), metal(0xbfc4cc, 0.35));
  plate.position.set(0, 0.17, -0.05);
  g.add(plate);
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 12, 64), new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xff4a1a, emissiveIntensity: 2.2 }));
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.set(0, 0.181, -0.05);
  glowRing.name = "heat";
  g.add(glowRing);
  const knobM = plastic(0x222428, 0.35);
  for (const sx of [-0.15, 0.15]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.04, 24), knobM); k.rotation.x = Math.PI / 2; k.position.set(sx, 0.08, 0.35); g.add(k); }
  shadows(g);
  return g;
}

/** Koruyucu gözlük. */
export function goggles() {
  const g = new THREE.Group();
  const lensM = glass({ tint: 0xdff3ff, thickness: 0.02, side: THREE.DoubleSide });
  const frameM = plastic(0x1f3fb0, 0.4);
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.34, 0.15, 0, Math.PI * 2);
  const lens = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, curveSegments: 48 }), lensM);
  g.add(lens);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 12, 80), frameM);
  frame.scale.set(0.345, 0.155, 1);
  frame.position.z = 0.01;
  g.add(frame);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 8, 64, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.8 }));
  strap.rotation.set(Math.PI / 2, 0, 0);
  strap.position.z = -0.2;
  strap.scale.set(1, 0.6, 1);
  g.add(strap);
  shadows(g);
  return g;
}

/** Spatül. */
export function spatula() {
  const g = new THREE.Group();
  const m = metal(0xdfe2e7, 0.22);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 16), m);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.045), m);
  blade.position.x = 0.4;
  g.add(blade);
  const spoon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m);
  spoon.scale.set(1.4, 0.5, 1);
  spoon.position.x = -0.38;
  g.add(spoon);
  shadows(g);
  return g;
}
