/**
 * Fiziksel tabanlı (PBR) malzemeler: cam, jel, sıvı, kitap bezi, metal, plastik, ahşap.
 */
import * as THREE from "three";
import { Q } from "../core/quality.js";
import { walnut } from "./textures.js";

/** Laboratuvar camı: ışığı kırar (transmission), yansıtır (clearcoat), kenarlarda hafif yeşil. */
export function glass(o = {}) {
  const q = Q();
  if (q.transmission && o.transmission !== false) {
    return new THREE.MeshPhysicalMaterial({
      color: o.color ?? 0xffffff,
      metalness: 0,
      roughness: o.roughness ?? 0.03,
      transmission: 1,
      thickness: o.thickness ?? 0.04,
      ior: 1.5,
      dispersion: o.dispersion ?? 0.2,
      attenuationColor: new THREE.Color(o.tint ?? 0xeaf6f1),
      attenuationDistance: o.attDist ?? 1.2,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      specularIntensity: 1,
      envMapIntensity: o.env ?? 1.3,
      side: o.side ?? THREE.FrontSide,
      transparent: false,
    });
  }
  // Düşük kalite: hafif saydam cam
  return new THREE.MeshPhysicalMaterial({
    color: o.color ?? 0xffffff, metalness: 0, roughness: 0.05,
    transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.03,
    envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
  });
}

/** Jel: süt cam gibi yarı mat, hafif parlak; renk haritası simülasyondan gelir. */
export function gel(map, o = {}) {
  return new THREE.MeshPhysicalMaterial({
    map,
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.5,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    emissive: new THREE.Color(o.glow ?? 0x000000),
    emissiveMap: o.glowMap ?? null,
    emissiveIntensity: o.glowIntensity ?? 0,
    envMapIntensity: 0.9,
  });
}

/** Sıvı: renkli, parlak yüzeyli. */
export function liquid(color, o = {}) {
  const q = Q();
  if (q.transmission && o.transmission !== false) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.02, transmission: 0.92, thickness: o.thickness ?? 0.3, ior: 1.33,
      attenuationColor: new THREE.Color(color), attenuationDistance: o.att ?? 0.25,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2,
    });
  }
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, transparent: true, opacity: 0.6, clearcoat: 1, depthWrite: false });
}

export function metal(color = 0xc9ccd2, rough = 0.28) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 1.2, clearcoat: 0.3 });
}
export function plastic(color = 0x222222, rough = 0.45) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: rough, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.8 });
}
export function rubber(color = 0xb73a2b) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.6 });
}
export function wood() {
  const w = walnut();
  return new THREE.MeshPhysicalMaterial({ map: w.map, normalMap: w.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.48, clearcoat: 0.55, clearcoatRoughness: 0.35, envMapIntensity: 0.7 });
}
export function ceramic(color = 0xf3f3f0) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
}

/** Çökelti kristali: yarı saydam, parlak, hafif ışık yayan. */
export function crystal(color, o = {}) {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: o.irid ?? 0.35, iridescenceIOR: 1.6,
    emissive: c, emissiveIntensity: o.glow ?? 0.12, envMapIntensity: 1.4,
    flatShading: true,
  });
}
