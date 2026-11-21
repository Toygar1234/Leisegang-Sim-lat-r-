/**
 * Grafik kalitesi: okulun akıllı tahtası gibi zayıf cihazlarda site akıcı kalsın diye
 * çözünürlük, gölge, cam kırılması ve parlama efektleri otomatik ayarlanır.
 */
import { store } from "./store.js";

export const TIERS = {
  high: { label: "Yüksek", dpr: 2, shadows: true, shadowSize: 2048, transmission: true, bloom: true, copies: 3, coverRes: 1 },
  medium: { label: "Orta", dpr: 1.5, shadows: true, shadowSize: 1024, transmission: true, bloom: true, copies: 3, coverRes: 0.8 },
  low: { label: "Düşük", dpr: 1, shadows: false, shadowSize: 512, transmission: false, bloom: false, copies: 3, coverRes: 0.6 },
};

function detect() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return "low";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software|basic render/i.test(r)) return "low";
    const mem = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 4;
    if (/mali|adreno [1-5]|powervr|intel\(r\) (hd|uhd) graphics [2-6]/i.test(r) || mem <= 4 || cores <= 4) return "medium";
    return "high";
  } catch {
    return "medium";
  }
}

let auto = null;
export function qualityTier() {
  const s = store.setting("quality");
  if (s && s !== "auto" && TIERS[s]) return s;
  if (!auto) auto = detect();
  return auto;
}
export const Q = () => TIERS[qualityTier()];

export function cycleQuality() {
  const order = ["auto", "high", "medium", "low"];
  const cur = store.setting("quality") || "auto";
  const next = order[(order.indexOf(cur) + 1) % order.length];
  store.setting("quality", next);
  return next;
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
