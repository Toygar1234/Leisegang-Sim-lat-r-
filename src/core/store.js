/**
 * İlerleme kaydı: XP, seviye, rozetler, açılan kitaplar, görevler, quiz sonuçları, ayarlar.
 * Tarayıcının localStorage'ında saklanır (yalnızca bu bilgisayarda). Erişim yoksa bellekte tutulur.
 */

export const LEVELS = [
  { xp: 0, name: "Çırak" },
  { xp: 120, name: "Laborant" },
  { xp: 320, name: "Araştırmacı" },
  { xp: 650, name: "Bilim İnsanı" },
  { xp: 1100, name: "Doçent" },
  { xp: 1700, name: "Profesör" },
];

const KEY = "liesegang-lab-v1";
const blank = () => ({
  xp: 0,
  badges: [],
  books: [],
  equipment: [],
  missions: [],
  labBooks: [],
  bases: [],
  quiz: {},
  runs: 0,
  predictions: 0,
  settings: { sound: true, quality: "auto" },
});

let state = blank();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...blank(), ...JSON.parse(raw) };
} catch { /* gizli pencere vb. — bellekte devam */ }

const bus = new EventTarget();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* yok say */ } };

export const store = {
  get: () => state,
  on: (ev, fn) => bus.addEventListener(ev, (e) => fn(e.detail)),
  emit: (ev, detail) => bus.dispatchEvent(new CustomEvent(ev, { detail })),

  level(xp = state.xp) {
    let i = 0;
    while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
    const cur = LEVELS[i], next = LEVELS[i + 1];
    const frac = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
    return { index: i, name: cur.name, next, frac };
  },

  addXP(amount, reason = "") {
    const before = this.level().index;
    state.xp += amount;
    save();
    const lv = this.level();
    this.emit("xp", { amount, reason, total: state.xp, level: lv, levelUp: lv.index > before });
  },

  /** Listeye bir kez ekler; ilk kez eklendiyse true döner. */
  addOnce(list, id) {
    if (state[list].includes(id)) return false;
    state[list].push(id);
    save();
    this.emit(list, { id, count: state[list].length });
    return true;
  },

  badge(id) {
    if (state.badges.includes(id)) return false;
    state.badges.push(id);
    save();
    this.emit("badge", { id });
    return true;
  },

  setQuiz(id, score, total) {
    const prev = state.quiz[id];
    if (!prev || score > prev.score) state.quiz[id] = { score, total };
    save();
  },

  inc(key) { state[key] = (state[key] || 0) + 1; save(); return state[key]; },

  setting(key, value) {
    if (value === undefined) return state.settings[key];
    state.settings[key] = value;
    save();
    this.emit("setting", { key, value });
  },

  reset() { state = blank(); save(); this.emit("reset", {}); },
};
