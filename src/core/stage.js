/**
 * 3B sahne kurucusu: her bölüm kendi tuvaline (canvas) sahip bir "sahne" açar.
 * Fiziksel tabanlı ışık (PBR), ortam yansımaları (RoomEnvironment), yumuşak gölgeler
 * ve (koyu bölümlerde) parlama efekti (bloom) burada ayarlanır.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Q } from "./quality.js";

const envCache = new WeakMap();

/** Stüdyo ortam haritası (yansımalar için). Her renderer için bir kez üretilir. */
export function studioEnv(renderer, { warm = false } = {}) {
  if (envCache.has(renderer)) return envCache.get(renderer);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  if (warm) room.traverse((o) => { if (o.material && o.material.color) o.material.color.multiply(new THREE.Color(1.0, 0.96, 0.9)); });
  const tex = pmrem.fromScene(room, 0.035).texture;
  room.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  pmrem.dispose();
  envCache.set(renderer, tex);
  return tex;
}

/**
 * @param {HTMLElement} host  tuvalin yerleşeceği eleman
 * @param {object} o
 */
export function createStage(host, o = {}) {
  const q = Q();
  const canvas = o.canvas || Object.assign(document.createElement("canvas"), { className: "stage-canvas" });
  if (!o.canvas) host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: o.alpha ?? false, powerPreference: "high-performance", preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = o.toneMapping ?? THREE.NeutralToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1;
  renderer.shadowMap.enabled = q.shadows && o.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (o.alpha) renderer.setClearColor(0x000000, 0);
  else renderer.setClearColor(new THREE.Color(o.clear ?? 0x081229), 1);

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer, { warm: o.warmEnv });
  scene.environmentIntensity = o.envIntensity ?? 0.8;
  if (o.fog) scene.fog = o.fog;

  const camera = new THREE.PerspectiveCamera(o.fov ?? 35, 1, o.near ?? 0.05, o.far ?? 100);

  let composer = null, bloom = null;
  if (q.bloom && o.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), o.bloom.strength ?? 0.55, o.bloom.radius ?? 0.6, o.bloom.threshold ?? 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const stage = {
    renderer, scene, camera, composer, bloom, canvas, host,
    width: 1, height: 1,
    resize() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (w === stage.width && h === stage.height) return;
      stage.width = w; stage.height = h;
      renderer.setSize(w, h, false);
      canvas.style.width = "100%"; canvas.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(w, h);
      o.onResize && o.onResize(w, h);
    },
    render() {
      if (composer) composer.render(); else renderer.render(scene, camera);
    },
  };
  new ResizeObserver(() => stage.resize()).observe(host);
  stage.resize();
  // Bölüm ekrana yaklaşınca gölgelendiricileri arka planda derle (ilk görünüşte takılma olmasın)
  stage.warm = () => { try { return renderer.compileAsync(scene, camera); } catch { return Promise.resolve(); } };
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); if (!window.__noWarm) stage.warm(); }
  }, { rootMargin: "1200px 0px" });
  io.observe(host);
  return stage;
}

/** Ekran koordinatına yansıtma (3B nokta → piksel). */
export function toScreen(v, camera, w, h) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, z: p.z };
}
