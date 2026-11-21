/**
 * Doğa & bilim modelleri: akik jeodu, bantlı kumtaşı, doku kesiti (mikroskop lamı),
 * altın nanoparçacık halkaları, Runge'nin kurutma kâğıdı.
 */
import * as THREE from "three";
import { canvas, tex, heightToNormal } from "../textures.js";
import { glass, metal } from "../materials.js";
import { mulberry32 } from "../../sim/engine.js";

const shadows = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

/** Pürüzlü taş yüzeyi için yer değiştirme (basit değer gürültüsü). */
function roughen(geo, amp, seed = 1, freq = 3) {
  const rnd = mulberry32(seed);
  const ph = Array.from({ length: 9 }, () => rnd() * 10);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq + ph[0]) * Math.sin(v.y * freq * 1.3 + ph[1]) * Math.sin(v.z * freq * 0.9 + ph[2])
      + 0.5 * Math.sin(v.x * freq * 2.7 + ph[3]) * Math.sin(v.y * freq * 2.2 + ph[4])
      + 0.25 * Math.sin(v.z * freq * 5.1 + ph[5]) * Math.sin(v.x * freq * 4.3 + ph[6]);
    v.multiplyScalar(1 + n * amp);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Akik kesit yüzeyi dokusu: iç içe dalgalı bantlar. */
function agateFace(seed = 4) {
  const S = 1024, c = canvas(S, S), g = c.getContext("2d");
  const rnd = mulberry32(seed);
  const pal = ["#2b3f6e", "#e9eef7", "#8fa6cf", "#f3e3c3", "#c8743a", "#e9eef7", "#5a77b5", "#ffffff", "#a24f22", "#dfe7f5"];
  const pts = [];
  for (let a = 0; a < Math.PI * 2; a += 0.22) pts.push([Math.cos(a) * (0.82 + rnd() * 0.2), Math.sin(a) * (0.8 + rnd() * 0.2)]);
  g.fillStyle = "#6f5a48"; g.fillRect(0, 0, S, S);
  const bands = 70;
  for (let k = 0; k < bands; k++) {
    const s = 1 - k / bands * 0.97;
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const w = 1 + 0.025 * Math.sin(k * 0.7 + i);
      const px = S / 2 + x * s * w * S * 0.48, py = S / 2 + y * s * w * S * 0.48;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    });
    g.closePath();
    g.fillStyle = pal[(k + Math.floor(k / 7)) % pal.length];
    g.globalAlpha = 0.85 + rnd() * 0.15;
    g.fill();
  }
  g.globalAlpha = 1;
  // ortadaki kuvars kristalleri
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.06;
    g.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.6})`;
    g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    g.lineTo(S / 2 + Math.cos(a + 0.2) * (r + 18), S / 2 + Math.sin(a + 0.2) * (r + 18));
    g.lineTo(S / 2 + Math.cos(a - 0.2) * (r + 18), S / 2 + Math.sin(a - 0.2) * (r + 18));
    g.fill();
  }
  return tex(c);
}

/** Kesilmiş akik jeodu: dış kabuk + parlatılmış kesit yüzeyi. */
export function agate() {
  const g = new THREE.Group();
  const crust = new THREE.Mesh(
    roughen(new THREE.SphereGeometry(0.5, 96, 64, 0, Math.PI * 2, 0, Math.PI / 2), 0.07, 7, 4),
    new THREE.MeshPhysicalMaterial({ color: 0x6d5a4a, roughness: 0.95, metalness: 0, sheen: 0.3 })
  );
  crust.rotation.x = -Math.PI / 2;
  crust.scale.set(1, 1, 0.85);
  g.add(crust);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.47, 128), new THREE.MeshPhysicalMaterial({
    map: agateFace(), roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, transmission: 0.0, sheen: 0, envMapIntensity: 1.3,
  }));
  face.scale.set(1, 1, 1);
  face.position.z = 0.002;
  // Kesik yüzün kenarındaki ince parlak halka (cilalı taş)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.012, 12, 128), new THREE.MeshPhysicalMaterial({ color: 0x8c6a52, roughness: 0.4, clearcoat: 1 }));
  rim.position.z = 0.002;
  g.add(rim);
  g.add(face);
  shadows(g);
  g.rotation.x = -0.25;
  return g;
}

/** Liesegang bantlı kumtaşı bloğu. */
export function sandstone() {
  const S = 1024, c = canvas(S, S), x = c.getContext("2d");
  const rnd = mulberry32(12);
  x.fillStyle = "#d9b98a"; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(${rnd() < 0.5 ? "120,80,40" : "255,240,210"},${rnd() * 0.25})`; x.fillRect(rnd() * S, rnd() * S, 2, 2); }
  // Liesegang bantları (Jablczynski dizisi)
  let r = 30;
  for (let k = 0; k < 16 && r < S * 1.3; k++) {
    x.strokeStyle = `rgba(${150 - k * 3},${60 - k * 2},${25},${0.75 - k * 0.025})`;
    x.lineWidth = 6 + r * 0.06;
    x.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.03) {
      const rr = r * (1 + 0.05 * Math.sin(a * 3 + k) + 0.03 * Math.sin(a * 8));
      const px = S * 0.35 + Math.cos(a) * rr * 1.2, py = S * 0.4 + Math.sin(a) * rr;
      a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.stroke();
    r *= 1.27;
  }
  const map = tex(c);
  const geo = roughen(new THREE.BoxGeometry(1, 0.62, 0.7, 24, 16, 16), 0.035, 3, 6);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map, roughness: 0.92, normalMap: tex(heightToNormal(c, 0.8), { srgb: false }), normalScale: new THREE.Vector2(0.8, 0.8) }));
  const g = new THREE.Group();
  g.add(m);
  shadows(g);
  return g;
}

/** Doku kesiti: cam lam üstünde Liesegang halkalı doku (patoloji). */
export function tissueSlide() {
  const g = new THREE.Group();
  const slide = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.5), glass({ thickness: 0.02 }));
  g.add(slide);
  const S = 1024, c = canvas(S, S), x = c.getContext("2d");
  const rnd = mulberry32(31);
  const grd = x.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  grd.addColorStop(0, "#f1b7cf"); grd.addColorStop(1, "#c86b9b");
  x.fillStyle = grd; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(90,30,120,${rnd() * 0.5})`; x.beginPath(); x.arc(rnd() * S, rnd() * S, 2 + rnd() * 5, 0, Math.PI * 2); x.fill(); }
  let r = 18;
  for (let k = 0; k < 11; k++) { x.strokeStyle = `rgba(70,20,90,${0.85 - k * 0.04})`; x.lineWidth = 4 + r * 0.05; x.beginPath(); x.arc(S / 2 + 20, S / 2 - 10, r, 0, Math.PI * 2); x.stroke(); r *= 1.25; }
  x.globalCompositeOperation = "destination-in"; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); x.fill();
  const tissue = new THREE.Mesh(new THREE.CircleGeometry(0.2, 96), new THREE.MeshPhysicalMaterial({ map: tex(c), transparent: true, roughness: 0.5, clearcoat: 0.5 }));
  tissue.rotation.x = -Math.PI / 2;
  tissue.position.y = 0.0105;
  g.add(tissue);
  const slip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, 0.46), glass({ thickness: 0.004 }));
  slip.position.y = 0.014;
  g.add(slip);
  const lc = canvas(256, 256), lx = lc.getContext("2d");
  lx.fillStyle = "#f4f1ea"; lx.fillRect(0, 0, 256, 256);
  lx.fillStyle = "#141414"; lx.font = '600 34px "Inter Tight", sans-serif'; lx.fillText("PATOLOJİ", 20, 70);
  lx.font = '500 26px "JetBrains Mono", monospace'; lx.fillText("LR-2024", 20, 120);
  lx.fillStyle = "#1F3FB0"; lx.fillRect(20, 160, 216, 8);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({ map: tex(lc), roughness: 0.8 }));
  label.rotation.x = -Math.PI / 2;
  label.position.set(-0.52, 0.0115, 0);
  g.add(label);
  shadows(g);
  return g;
}

/** Altın nanoparçacık halkaları (Jablczynski dizisiyle dizilmiş, instanced). */
export function nanoRings() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 96), new THREE.MeshPhysicalMaterial({ color: 0x0c1430, roughness: 0.25, clearcoat: 1 }));
  g.add(disc);
  const pos = [];
  let r = 0.05;
  for (let k = 0; k < 11 && r < 0.6; k++) {
    const n = Math.floor(r * 340);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.4;
      const jr = r + (Math.random() - 0.5) * r * 0.06;
      pos.push([Math.cos(a) * jr, Math.sin(a) * jr, 0.006 + r * 0.012]);
    }
    r *= 1.24;
  }
  const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), metal(0xffc75a, 0.18), pos.length);
  const m = new THREE.Matrix4();
  pos.forEach(([x, z, s], i) => { m.makeScale(s, s, s); m.setPosition(x, 0.02 + s, z); inst.setMatrixAt(i, m); });
  inst.castShadow = true;
  g.add(inst);
  shadows(g);
  return g;
}

/** Runge'nin kurutma kâğıdı: kâğıda yayılmış renkli halkalar. */
export function rungePaper() {
  const S = 1024, c = canvas(S, S), x = c.getContext("2d");
  const rnd = mulberry32(55);
  x.fillStyle = "#efe6d0"; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 20000; i++) { x.fillStyle = `rgba(120,100,70,${rnd() * 0.08})`; x.fillRect(rnd() * S, rnd() * S, 1, 3); }
  const drops = [[0.33, 0.36, "#8a3d1a", "#2b4fa8"], [0.68, 0.42, "#2b4fa8", "#8a5a1a"], [0.5, 0.72, "#5c7a2a", "#8a3d1a"]];
  for (const [cx, cy, c1, c2] of drops) {
    let r = 10;
    for (let k = 0; k < 12; k++) {
      x.strokeStyle = k % 2 ? c1 : c2; x.globalAlpha = 0.75 - k * 0.04; x.lineWidth = 3 + r * 0.05;
      x.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
        const rr = r * (1 + 0.07 * Math.sin(a * 4 + k) + 0.04 * Math.sin(a * 9 + cx * 10));
        const px = cx * S + Math.cos(a) * rr, py = cy * S + Math.sin(a) * rr;
        a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
      r *= 1.28;
    }
  }
  x.globalAlpha = 1;
  const geo = new THREE.PlaneGeometry(1.2, 1.2, 40, 40);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i); p.setZ(i, 0.04 * Math.sin(X * 2.2) * Math.cos(Y * 1.7) + 0.05 * (X + 0.6) * (X + 0.6) * 0.2); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex(c), roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  shadows(g);
  return g;
}
