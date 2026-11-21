/**
 * Canlı kütüphane ortamı (ana ekranın arka planı):
 *  - arkada dolu, sıcak renkli kitaplıklar (instanced)
 *  - pencereden süzülen altın ışık hüzmeleri (titreşen)
 *  - havada uçuşan, ışıkta parlayan toz zerrecikleri
 *  - göz kırpan süs ışıkları ve raflarda ışıldayan renkli sıvılı şişeler
 */
import * as THREE from "three";
import { wood } from "./materials.js";
import { mulberry32 } from "../sim/engine.js";

const WARM_BOOKS = ["#7a1f1a", "#a8401f", "#c9752b", "#d9a441", "#2f5a46", "#1f3a6c", "#5a2a5f", "#9c2f45", "#3b2a20", "#e7cf98", "#1F3FB0", "#D8432A", "#0f6b6b", "#b8862f", "#f0e2c0"];

function shaftMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uStrength: { value: 0.32 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uStrength;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float across = smoothstep(0.0, 0.45, vUv.x) * smoothstep(1.0, 0.55, vUv.x);
        float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        float flick = 0.65 + 0.35 * n(vec2(vUv.x * 6.0 + uTime * 0.15, vUv.y * 2.0 - uTime * 0.05));
        float a = across * along * flick * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

function dustMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: `
      attribute float aSeed; attribute float aSize; uniform float uTime; uniform float uPx; varying float vA; varying float vS;
      void main(){
        vec3 p = position;
        float t = uTime * (0.15 + aSeed * 0.2);
        p.x += sin(t + aSeed * 40.0) * 0.18 + uTime * 0.02;
        p.y += sin(t * 0.7 + aSeed * 17.0) * 0.22 + mod(uTime * 0.03 * (0.5 + aSeed), 4.0) - 2.0;
        p.z += cos(t * 0.9 + aSeed * 9.0) * 0.12;
        p.x = mod(p.x + 7.0, 14.0) - 7.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // pencere ışığında (sol üst) daha parlak
        float lit = smoothstep(2.5, -1.5, p.x + p.y * -0.9);
        vA = (0.12 + 0.5 * lit) * (0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 30.0));
        vS = aSeed;
        gl_PointSize = aSize * uPx * (3.2 / -mv.z);
      }`,
    fragmentShader: `
      varying float vA; varying float vS;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        vec3 c = mix(vec3(1.0, 0.82, 0.5), vec3(1.0, 0.95, 0.85), vS);
        gl_FragColor = vec4(c * a, a);
      }`,
  });
}

function glowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: `
      attribute float aSeed; attribute vec3 aColor; uniform float uTime; uniform float uPx; varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 50.0);
        vC = aColor;
        gl_PointSize = (18.0 + aSeed * 10.0) * uPx * (3.0 / -mv.z);
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.12, 0.0, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.45;
        float a = (core * 1.6 + halo) * vA;
        gl_FragColor = vec4(vC * a * 1.6, a);
      }`,
  });
}

export function createLibrary(scene, renderer) {
  const group = new THREE.Group();
  scene.add(group);
  const rnd = mulberry32(2026);
  const px = renderer.getPixelRatio();

  // Arka duvar (koyu ceviz lambri, sıcak degrade)
  const wc = document.createElement("canvas"); wc.width = 32; wc.height = 512;
  const wg = wc.getContext("2d");
  const grd = wg.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#1a0b06"); grd.addColorStop(0.45, "#2e160b"); grd.addColorStop(1, "#120805");
  wg.fillStyle = grd; wg.fillRect(0, 0, 32, 512);
  const wtex = new THREE.CanvasTexture(wc); wtex.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.9 }));
  wall.position.set(0, 0.5, -4.4);
  group.add(wall);

  // Arka kitaplıklar
  const woodMat = wood();
  const shelfYs = [-1.75, -0.45, 0.85, 2.15, 3.45];
  const BW = 26, Z = -3.5;
  for (const y of shelfYs) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.07, 0.6), woodMat);
    b.position.set(0, y, Z);
    group.add(b);
  }
  for (let x = -BW / 2; x <= BW / 2; x += 2.6) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7, 0.62), woodMat);
    post.position.set(x, 0.8, Z);
    group.add(post);
  }
  const bookGeo = new THREE.BoxGeometry(1, 1, 1);
  const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.0 });
  const items = [];
  for (const y of shelfYs.slice(0, 4)) {
    let x = -BW / 2 + 0.1;
    while (x < BW / 2 - 0.1) {
      if (Math.abs(((x + BW / 2) % 2.6)) < 0.1) { x += 0.12; continue; }
      const w = 0.06 + rnd() * 0.08, h = 0.62 + rnd() * 0.5, d = 0.42 + rnd() * 0.12;
      if (rnd() < 0.05) { x += 0.25 + rnd() * 0.3; continue; }
      const tilt = rnd() < 0.06 ? (rnd() - 0.5) * 0.5 : 0;
      items.push({ x: x + w / 2, y: y + 0.035 + h / 2, w, h, d, tilt, c: WARM_BOOKS[Math.floor(rnd() * WARM_BOOKS.length)] });
      x += w + 0.004;
    }
  }
  const inst = new THREE.InstancedMesh(bookGeo, bookMat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  items.forEach((it, i) => {
    e.set(0, 0, it.tilt); q.setFromEuler(e);
    m.compose(new THREE.Vector3(it.x, it.y, Z + 0.02), q, new THREE.Vector3(it.w, it.h, it.d));
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, col.set(it.c).multiplyScalar(0.42 + rnd() * 0.22));
  });
  group.add(inst);

  // Raflarda ışıldayan renkli sıvılı şişeler (kimya dokunuşu)
  const flaskColors = [0x45f0ff, 0xff4fa3, 0xffb23f, 0x8dff6a, 0x9a7bff, 0xff6a3d];
  const flasks = [];
  const flaskProf = [];
  for (let k = 0; k <= 16; k++) { const t = k / 16; flaskProf.push(new THREE.Vector2(t < 0.75 ? 0.11 * Math.sin(Math.PI * (0.15 + t * 0.9)) + 0.03 : 0.035, t * 0.32)); }
  const flaskGeo = new THREE.LatheGeometry(flaskProf, 24);
  for (let k = 0; k < 9; k++) {
    const c = flaskColors[k % flaskColors.length];
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.2 });
    const f = new THREE.Mesh(flaskGeo, mat);
    const row = shelfYs[1 + (k % 3)];
    f.position.set(-9 + k * 2.25 + (rnd() - 0.5) * 0.6, row + 0.035, Z + 0.18);
    f.scale.setScalar(0.9 + rnd() * 0.5);
    flasks.push({ mesh: f, seed: rnd() * 10 });
    group.add(f);
    const pl = new THREE.PointLight(c, 0.35, 1.4, 2);
    pl.position.copy(f.position).add(new THREE.Vector3(0, 0.15, 0.2));
    group.add(pl);
  }

  // Süs ışıkları (kitaplıkların üstünde sarkan zincirler)
  const glowPos = [], glowSeed = [], glowCol = [];
  const lampCols = [new THREE.Color(1, 0.78, 0.42), new THREE.Color(1, 0.62, 0.35), new THREE.Color(1, 0.9, 0.7)];
  for (const [y0, x0, x1, sag] of [[2.0, -8, 8, 0.45], [1.1, -9, 9, 0.35], [2.7, -7, 7, 0.5]]) {
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, x = x0 + (x1 - x0) * t;
      const y = y0 - sag * 4 * t * (1 - t) - (Math.sin(t * Math.PI * 6) ** 2) * 0.08;
      glowPos.push(x, y, -3.0 + Math.sin(k) * 0.05);
      glowSeed.push(rnd());
      const c = lampCols[k % 3];
      glowCol.push(c.r, c.g, c.b);
    }
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute("position", new THREE.Float32BufferAttribute(glowPos, 3));
  gGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(glowSeed, 1));
  gGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(glowCol, 3));
  const gMat = glowMaterial();
  gMat.uniforms.uPx.value = px;
  const glows = new THREE.Points(gGeo, gMat);
  group.add(glows);

  // Işık hüzmeleri (sol üstteki pencereden)
  const shafts = [];
  for (let k = 0; k < 4; k++) {
    const mat = shaftMaterial(k % 2 ? 0xffc77a : 0xffe2a8);
    mat.uniforms.uStrength.value = 0.06 + rnd() * 0.05;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + rnd() * 0.9, 11), mat);
    s.position.set(-4.2 + k * 1.5, 1.6, -2.4 - k * 0.2);
    s.rotation.set(0, 0.25, 0.62);
    shafts.push(s);
    group.add(s);
  }

  // Toz zerrecikleri
  const N = 900;
  const dPos = new Float32Array(N * 3), dSeed = new Float32Array(N), dSize = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dPos[i * 3] = (rnd() - 0.5) * 14; dPos[i * 3 + 1] = (rnd() - 0.5) * 6 + 0.5; dPos[i * 3 + 2] = -2.6 + rnd() * 3.2;
    dSeed[i] = rnd(); dSize[i] = 4 + rnd() * 10;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute("aSeed", new THREE.BufferAttribute(dSeed, 1));
  dGeo.setAttribute("aSize", new THREE.BufferAttribute(dSize, 1));
  const dMat = dustMaterial();
  dMat.uniforms.uPx.value = px;
  const dust = new THREE.Points(dGeo, dMat);
  dust.frustumCulled = false;
  group.add(dust);

  // Işıklar
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x2a1208, 0.32));
  const sun = new THREE.DirectionalLight(0xffc98a, 1.15);
  sun.position.set(-4, 5, 4);
  scene.add(sun, sun.target);
  const cool = new THREE.DirectionalLight(0x8fb0ff, 0.45);
  cool.position.set(5, 1.5, 2);
  scene.add(cool);
  const back = new THREE.PointLight(0xff9a4a, 2.5, 8, 1.8);
  back.position.set(2, 1.5, -2.6);
  scene.add(back);

  scene.fog = new THREE.Fog(0x170905, 4.6, 10.5);

  return {
    group, sun,
    tick(t) {
      dMat.uniforms.uTime.value = t;
      gMat.uniforms.uTime.value = t;
      shafts.forEach((s, i) => { s.material.uniforms.uTime.value = t + i * 3; });
      flasks.forEach((f) => { f.mesh.material.emissiveIntensity = 1.2 + 0.6 * Math.sin(t * 1.3 + f.seed); });
      back.intensity = 2.3 + Math.sin(t * 0.7) * 0.5;
    },
  };
}
