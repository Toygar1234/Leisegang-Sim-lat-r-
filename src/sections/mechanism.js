/**
 * 02 · NASIL OLUŞUR? — Parçacık görünümü.
 * Jel bloğundaki parçacıkların sayısı, gerçek simülasyonun derişimlerinden hesaplanır:
 *   turkuaz = dış iyon (a), turuncu = iç iyon (b), beyaz kristal = çökelti (d).
 * Kaydırma ilerledikçe zaman ilerler; dört adım sırayla vurgulanır.
 */
import * as THREE from "three";
import { createStage } from "../core/stage.js";
import { addView } from "../core/loop.js";
import { mulberry32 } from "../sim/engine.js";
import { computeFrames, whenNear } from "../sim/precompute.js";
import { glass } from "../three/materials.js";

const BUCKETS = 120, PER_A = 16, PER_B = 12, PER_D = 8;
const LEN = 4.4, HALF_W = 0.42, HALF_D = 0.42;

export function initMechanism() {
  const viewEl = document.getElementById("mechView");
  const pin = document.getElementById("mechPin");
  const steps = [...document.querySelectorAll("#mechSteps .step")];
  const prog = document.getElementById("mechProg");
  const stage = createStage(viewEl, { bloom: { strength: 0.85, radius: 0.6, threshold: 0.6 }, fov: 34, clear: 0x060d20, envIntensity: 0.6 });
  const { scene, camera } = stage;
  scene.fog = new THREE.Fog(0x060d20, 6, 14);
  scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x0b1228, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 4, 3); scene.add(key);

  // Jel bloğu (cam kutu) ve üstteki dış elektrolit çözeltisi
  const slab = new THREE.Group();
  scene.add(slab);
  const box = new THREE.Mesh(new THREE.BoxGeometry(LEN + 0.06, HALF_W * 2 + 0.06, HALF_D * 2 + 0.06), glass({ thickness: 0.05, transmission: false }));
  slab.add(box);
  const gelBox = new THREE.Mesh(new THREE.BoxGeometry(LEN, HALF_W * 2, HALF_D * 2), new THREE.MeshPhysicalMaterial({ color: 0x9fb8ff, transparent: true, opacity: 0.07, roughness: 0.2, depthWrite: false }));
  slab.add(gelBox);
  const res = new THREE.Mesh(new THREE.BoxGeometry(0.5, HALF_W * 2, HALF_D * 2), new THREE.MeshPhysicalMaterial({ color: 0x63e3f2, emissive: 0x1aa6c0, emissiveIntensity: 0.6, transparent: true, opacity: 0.35, depthWrite: false }));
  res.position.x = -LEN / 2 - 0.28;
  slab.add(res);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LEN, HALF_W * 2, HALF_D * 2)), new THREE.LineBasicMaterial({ color: 0x6f8dff, transparent: true, opacity: 0.35 }));
  slab.add(edge);
  // Yön oku
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-LEN / 2 - 0.2, HALF_W + 0.25, 0), 1.2, 0x63e3f2, 0.18, 0.1);
  slab.add(arrow);

  const rnd = mulberry32(17);
  // Parlak nokta dokusu (iyonlar için)
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const mkPoints = (count, color, size) => {
    const pos = new Float32Array(count * 3).fill(1000);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    m.frustumCulled = false;
    const off = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { off[i * 4] = rnd(); off[i * 4 + 1] = rnd() * 2 - 1; off[i * 4 + 2] = rnd() * 2 - 1; off[i * 4 + 3] = rnd() * 6.28; }
    slab.add(m);
    return { m, off, count, points: true };
  };
  const mkPool = (count, geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const off = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { off[i * 4] = rnd(); off[i * 4 + 1] = rnd() * 2 - 1; off[i * 4 + 2] = rnd() * 2 - 1; off[i * 4 + 3] = rnd() * 6.28; }
    m4.makeScale(0, 0, 0);
    for (let i = 0; i < count; i++) m.setMatrixAt(i, m4);
    slab.add(m);
    return { m, off, count };
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const A = mkPoints(BUCKETS * PER_A, 0x63e3f2, 0.07);
  const Bp = mkPoints(BUCKETS * PER_B, 0xff9a4a, 0.085);
  const D = mkPool(BUCKETS * PER_D, new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.2, flatShading: true }));

  let frames = null;
  whenNear(pin, () => computeFrames({ N: 480, a0: 20, b0: 1, qNuc: 0.6, qHet: 0.45, noise: 0.03 }, 70, 0.85).then((f) => { frames = f; }));

  function place(pool, perBucket, counts, size, time, jitter, spin) {
    const { m, off } = pool;
    const P = pool.points ? m.geometry.attributes.position : null;
    for (let k = 0; k < BUCKETS; k++) {
      const c = counts[k];
      for (let j = 0; j < perBucket; j++) {
        const i = k * perBucket + j;
        if (j >= c) {
          if (P) P.setXYZ(i, 1000, 1000, 1000); else { m4.makeScale(0, 0, 0); m.setMatrixAt(i, m4); }
          continue;
        }
        const ph = off[i * 4 + 3];
        const x = -LEN / 2 + ((k + off[i * 4]) / BUCKETS) * LEN + Math.sin(time * 1.7 + ph) * jitter;
        const y = off[i * 4 + 1] * (HALF_W - 0.03) + Math.cos(time * 1.3 + ph * 2) * jitter;
        const z = off[i * 4 + 2] * (HALF_D - 0.03) + Math.sin(time * 1.1 + ph * 3) * jitter;
        if (P) { P.setXYZ(i, x, y, z); continue; }
        e.set(spin ? ph : 0, spin ? ph * 2 + time * 0.3 : 0, 0); q.setFromEuler(e);
        m4.compose(v.set(x, y, z), q, sc.set(size, size * (spin ? 1.6 : 1), size));
        m.setMatrixAt(i, m4);
      }
    }
    if (P) P.needsUpdate = true; else m.instanceMatrix.needsUpdate = true;
  }

  let cur = -1;
  addView({ el: viewEl, tick: (dt, time) => {
    const r = pin.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
    prog.style.width = (p * 100).toFixed(1) + "%";
    const step = Math.min(3, Math.floor(p * 4));
    if (step !== cur) { cur = step; steps.forEach((s, i) => s.classList.toggle("is-on", i === step)); }

    // Kamera kaydırmayla bloğun etrafında döner
    const wide = stage.width > 1000;
    const ox = wide ? 1.25 : 0;
    const R = wide ? 6.4 : 7.6;
    const ang = -0.5 + p * 1.0;
    camera.position.set(Math.sin(ang) * R + ox - 0.4, 1.9 - p * 0.5, Math.cos(ang) * R);
    camera.lookAt(ox - 0.2, wide ? 0 : -0.6, 0);
    slab.rotation.y = Math.sin(time * 0.2) * 0.04;

    if (frames) {
      const tp = Math.min(1, p * 1.05);
      const f = frames[Math.min(frames.length - 1, Math.round(tp * (frames.length - 1)))];
      const N = f.a.length, per = N / BUCKETS;
      let dmax = 1e-9; for (let i = 0; i < N; i++) if (f.d[i] > dmax) dmax = f.d[i];
      const ca = new Array(BUCKETS), cb = new Array(BUCKETS), cd = new Array(BUCKETS);
      for (let k = 0; k < BUCKETS; k++) {
        let sa = 0, sb = 0, sd = 0;
        for (let i = Math.floor(k * per); i < Math.floor((k + 1) * per); i++) { sa += f.a[i]; sb += f.b[i]; sd = Math.max(sd, f.d[i]); }
        sa /= per; sb /= per;
        ca[k] = Math.round(Math.min(1, sa / 20) * PER_A * 1.4);
        cb[k] = Math.round(Math.min(1, sb / 1) * PER_B);
        cd[k] = Math.round(Math.min(1, sd / (dmax * 0.35)) * PER_D);
      }
      place(A, PER_A, ca, 0.022, time, 0.02, false);
      place(Bp, PER_B, cb, 0.026, time * 0.6, 0.012, false);
      place(D, PER_D, cd, 0.03, time, 0, true);
    }
    stage.render();
  } });
}
