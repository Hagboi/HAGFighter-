'use strict';
// ---------- persistent progression (the incremental layer) ----------
const UPGRADES = [
  { id: 'vit', name: 'VITALITY', desc: '+5% max health', base: 80, grow: 1.55, max: 20 },
  { id: 'pow', name: 'POWER', desc: '+4% damage dealt', base: 100, grow: 1.6, max: 25 },
  { id: 'def', name: 'IRON SKIN', desc: '-3% damage taken', base: 120, grow: 1.65, max: 15 },
  { id: 'foc', name: 'FOCUS', desc: '+10% super meter gain', base: 90, grow: 1.6, max: 15 },
  { id: 'par', name: 'PARRY MASTERY', desc: '+1 frame parry window', base: 250, grow: 2.2, max: 6 },
  { id: 'for', name: 'FORTUNE', desc: '+10% coins from all sources', base: 150, grow: 1.7, max: 40 },
  { id: 'reg', name: 'SECOND WIND', desc: 'Regen 4 HP/s per level when not hit', base: 300, grow: 1.9, max: 10 },
];
const STUDENTS = [
  { name: 'NOVICE', rate: 0.5, base: 25 },
  { name: 'DISCIPLE', rate: 4, base: 300 },
  { name: 'SENSEI', rate: 30, base: 4000 },
  { name: 'GRANDMASTER', rate: 220, base: 50000 },
  { name: 'LEGEND', rate: 1600, base: 750000 },
  { name: 'MYTHIC', rate: 12000, base: 12000000 },
];
const HEAT_NAMES = ['', 'ROOKIE', 'FIGHTER', 'VETERAN', 'CHAMPION', 'MASTER', 'LEGEND', 'MYTHIC'];
const heatName = (h) => (h < HEAT_NAMES.length ? HEAT_NAMES[h] : 'MYTHIC ' + (h - 6));
const SAVE_KEY = 'hagfighter_save_v1';

const Save = {
  data: null,
  offline: 0,
  defaults() {
    return {
      coins: 0, total: 0, runTotal: 0,
      up: { vit: 0, pow: 0, def: 0, foc: 0, par: 0, for: 0, reg: 0 },
      students: [0, 0, 0, 0, 0, 0],
      heat: 1, maxHeat: 1, clears: 0, bossUnlocked: false,
      mastery: {}, spirit: 0, ascensions: 0,
      best: { combo: 0, parries: 0 },
      settings: { music: true, sfx: true, voice: true },
      last: Date.now(),
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.defaults();
    this.data = d ? Object.assign(def, d, { up: Object.assign(def.up, d.up || {}), settings: Object.assign(def.settings, d.settings || {}) }) : def;
    while (this.data.students.length < STUDENTS.length) this.data.students.push(0);
    // offline earnings (50%, capped at 8 hours)
    const el = clamp((Date.now() - (this.data.last || Date.now())) / 1000, 0, 8 * 3600);
    const earned = this.income() * el * 0.5;
    if (earned >= 1) { this.offline = earned; this.add(earned, true); }
    Sound.musicOn = this.data.settings.music;
    Sound.sfxOn = this.data.settings.sfx;
    Sound.voiceOn = this.data.settings.voice;
  },
  save() {
    this.data.last = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage blocked */ }
  },
  reset() { this.data = this.defaults(); this.save(); },

  // ----- economy -----
  coinMult() { const d = this.data; return (1 + 0.1 * d.up.for) * (1 + 0.1 * d.spirit); },
  income() {
    const d = this.data;
    let s = 0;
    STUDENTS.forEach((st, i) => (s += d.students[i] * st.rate));
    return s * this.coinMult();
  },
  add(n, silent) {
    this.data.coins += n;
    this.data.total += n;
    this.data.runTotal += n;
  },
  tick(dt) { const inc = this.income(); if (inc > 0) this.add(inc * dt, true); },

  upCost(u) { return Math.round(u.base * Math.pow(u.grow, this.data.up[u.id])); },
  buyUp(u) {
    const lv = this.data.up[u.id];
    if (lv >= u.max) return false;
    const c = this.upCost(u);
    if (this.data.coins < c) return false;
    this.data.coins -= c;
    this.data.up[u.id]++;
    this.save();
    return true;
  },
  stCost(i) { return Math.round(STUDENTS[i].base * Math.pow(1.15, this.data.students[i])); },
  buySt(i) {
    const c = this.stCost(i);
    if (this.data.coins < c) return false;
    this.data.coins -= c;
    this.data.students[i]++;
    this.save();
    return true;
  },

  // ----- ascension (prestige) -----
  canAscend() { return this.data.maxHeat >= 3; },
  spiritGain() { return Math.floor(Math.sqrt(this.data.runTotal / 20000)); },
  ascend() {
    const g = this.spiritGain();
    if (!this.canAscend() || g < 1) return false;
    const d = this.data;
    d.spirit += g; d.ascensions++;
    d.coins = 0; d.runTotal = 0;
    for (const k in d.up) d.up[k] = 0;
    d.students = d.students.map(() => 0);
    this.save();
    return true;
  },

  // ----- character mastery -----
  mastery(id) { return this.data.mastery[id] || (this.data.mastery[id] = { lv: 0, xp: 0 }); },
  xpNeed(lv) { return Math.round(150 * Math.pow(lv + 1, 1.5)); },
  addXp(id, xp) {
    const m = this.mastery(id);
    let ups = 0;
    m.xp += xp;
    while (m.lv < 10 && m.xp >= this.xpNeed(m.lv)) { m.xp -= this.xpNeed(m.lv); m.lv++; ups++; }
    if (m.lv >= 10) m.xp = 0;
    return ups;
  },
  palUnlocked(id, i) { if (i === 0) return true; const lv = this.mastery(id).lv; return i === 1 ? lv >= 2 : lv >= 5; },

  // modifiers applied to the human player's fighter
  playerMods(charId) {
    const d = this.data, u = d.up, ml = this.mastery(charId).lv;
    return {
      hp: 1 + 0.05 * u.vit,
      dmg: (1 + 0.04 * u.pow) * (1 + 0.02 * d.spirit) * (1 + 0.02 * ml),
      def: Math.max(0.4, 1 - 0.03 * u.def),
      meter: 1 + 0.1 * u.foc,
      parry: u.par,
      regen: u.reg * 4,
    };
  },
};
