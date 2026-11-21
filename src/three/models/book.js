/**
 * 3B kitap modeli.
 * Yerel eksenler: Y = yükseklik, X = kalınlık (sırt genişliği), Z = derinlik (kapak genişliği).
 * Sırt +Z yönüne bakar (rafta görünen yüz). Ön kapak +X tarafındadır;
 * kitap Y ekseninde −90° döndürülünce ön kapak izleyiciye döner (şablondaki kasetle aynı).
 */
import * as THREE from "three";
import { clothNormal, pageEdge, marble } from "../textures.js";
import { CLOTH } from "../../data/books.js";

const geoCache = new Map();
function cachedGeo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

export function bookDims(book, H = 1) {
  const n = parseInt(book.no, 10) || 1;
  const h = H * (0.9 + ((n * 37) % 11) / 110);      // 0.90–1.0 arası farklı boylar
  return { H: h, T: H * 0.165, D: H * 0.68 };
}

/**
 * @param {object} book  kitap verisi
 * @param {object} tex   { front:{color,orm}, spine:{color,orm}, title }
 */
export function createBook(book, tex, opts = {}) {
  const { H, T, D } = bookDims(book, opts.H ?? 1);
  const cloth = CLOTH[book.cloth];
  const board = T * 0.075;          // kapak kartonu kalınlığı
  const ov = T * 0.06;              // kapağın sayfalardan taşma payı
  const bulge = T * 0.26;           // sırtın yuvarlak çıkıntısı
  const zs = D / 2 - bulge;         // sırt yayının merkezi (menteşe çizgisi)
  const L = zs + D / 2;             // kapak kartonunun derinliği

  const normal = clothNormal();
  const clothMat = new THREE.MeshPhysicalMaterial({
    color: cloth.base, roughness: 0.82, metalness: 0, normalMap: normal, normalScale: new THREE.Vector2(0.55, 0.55),
    sheen: 0.5, sheenColor: new THREE.Color(0xffffff).lerp(new THREE.Color(cloth.base), 0.4), sheenRoughness: 0.6, envMapIntensity: 0.7,
  });
  const coverMat = new THREE.MeshPhysicalMaterial({
    map: tex.front.color, roughnessMap: tex.front.orm, metalnessMap: tex.front.orm, roughness: 1, metalness: 1,
    normalMap: normal, normalScale: new THREE.Vector2(0.35, 0.35),
    sheen: 0.35, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6,
    clearcoat: 0.12, clearcoatRoughness: 0.4, envMapIntensity: 1,
  });
  const spineMat = new THREE.MeshPhysicalMaterial({
    map: tex.spine.color, roughnessMap: tex.spine.orm, metalnessMap: tex.spine.orm, roughness: 1, metalness: 1,
    normalMap: normal, normalScale: new THREE.Vector2(0.35, 0.35),
    sheen: 0.35, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6, envMapIntensity: 1,
  });
  const pageMat = new THREE.MeshStandardMaterial({ map: pageEdge(), roughness: 0.92, color: 0xffffff });
  const pageFlat = new THREE.MeshStandardMaterial({ color: 0xf4ebd7, roughness: 0.95 });
  const titleMat = new THREE.MeshStandardMaterial({ map: tex.title || null, color: 0xffffff, roughness: 0.9 });
  const endMat = new THREE.MeshStandardMaterial({ map: marble(parseInt(book.no, 10)), roughness: 0.75 });

  const group = new THREE.Group();
  group.name = "book";
  const body = new THREE.Group();
  body.name = "body";
  group.add(body);

  // Sayfa bloğu: [+x, -x, +y, -y, +z, -z]
  const pw = T - 2 * board - T * 0.02, ph = H - 2 * ov, pd = L - ov - bulge * 0.2;
  const pages = new THREE.Mesh(cachedGeo(`p${pw.toFixed(4)}_${ph.toFixed(4)}_${pd.toFixed(4)}`, () => new THREE.BoxGeometry(pw, ph, pd)),
    [titleMat, pageFlat, pageMat, pageMat, pageFlat, pageMat]);
  pages.position.set(0, 0, zs - pd / 2 - bulge * 0.1);
  body.add(pages);

  // Arka kapak (−X)
  const boardGeo = cachedGeo(`b${H.toFixed(4)}_${L.toFixed(4)}_${board.toFixed(4)}`, () => new THREE.BoxGeometry(board, H, L));
  const back = new THREE.Mesh(boardGeo, [endMat, clothMat, clothMat, clothMat, clothMat, clothMat]);
  back.position.set(-T / 2 + board / 2, 0, zs - L / 2);
  body.add(back);

  // Ön kapak (+X), menteşeden açılabilir
  const hinge = new THREE.Group();
  hinge.name = "hinge";
  hinge.position.set(T / 2 - board / 2, 0, zs);
  const front = new THREE.Mesh(boardGeo, [coverMat, endMat, clothMat, clothMat, clothMat, clothMat]);
  front.position.set(0, 0, -L / 2);
  front.name = "frontBoard";
  hinge.add(front);
  body.add(hinge);

  // Yuvarlak sırt (yarım silindir, basık)
  const spineGeo = cachedGeo(`s${T.toFixed(4)}_${H.toFixed(4)}`, () => new THREE.CylinderGeometry(T / 2, T / 2, H, 28, 1, true, -Math.PI / 2, Math.PI));
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.set(0, 0, zs);
  spine.scale.z = bulge / (T / 2);
  body.add(spine);
  // Sırtın iç yüzü (kapanış) — boşluk görünmesin
  const capGeo = cachedGeo(`c${T.toFixed(4)}_${H.toFixed(4)}`, () => new THREE.PlaneGeometry(T, H));
  const cap = new THREE.Mesh(capGeo, pageFlat);
  cap.position.set(0, 0, zs - 0.0005);
  cap.rotation.y = Math.PI;
  body.add(cap);

  body.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // Not: userData kopyalanırken JSON'a çevrildiği için nesne referansları düz özellik olarak tutulur.
  group.bookData = book;
  group.dims = { H, T, D };
  group.hinge = hinge;
  group.body = body;
  return group;
}

/** Aynı geometri ve malzemeleri paylaşan bir kopya üretir (sonsuz raf için). */
export function cloneBook(master) {
  const g = master.clone(true);
  g.bookData = master.bookData;
  g.dims = master.dims;
  g.hinge = g.getObjectByName("hinge");
  g.body = g.getObjectByName("body");
  return g;
}

/** Kapağın dünya koordinatlarındaki 4 köşesi (ayrıntı sayfasının "kâğıttan büyüme" animasyonu için). */
export function coverCorners(group) {
  const { T, D, H } = group.dims;
  const zs = D / 2 - T * 0.26;
  const L = zs + D / 2;
  const x = T / 2 + 0.002;
  const pts = [
    new THREE.Vector3(x, H / 2, zs), new THREE.Vector3(x, H / 2, zs - L),
    new THREE.Vector3(x, -H / 2, zs - L), new THREE.Vector3(x, -H / 2, zs),
  ];
  group.updateMatrixWorld(true);
  return pts.map((p) => p.applyMatrix4(group.matrixWorld));
}
