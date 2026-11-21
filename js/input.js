'use strict';
// ---------- keyboard / gamepad / touch input ----------
const BTNS = ['u', 'd', 'l', 'r', 'lp', 'hp', 'lk', 'pa', 'sp', 'su', 'ok', 'back', 'start'];
const KEYMAP = {
  p1: {
    u: ['KeyW'], d: ['KeyS'], l: ['KeyA'], r: ['KeyD'],
    lp: ['KeyJ'], hp: ['KeyK'], lk: ['KeyL'], pa: ['KeyU'], sp: ['KeyI'], su: ['KeyO'],
    ok: ['Enter', 'Space'], back: ['Escape', 'Backspace'], start: ['Enter', 'Escape'],
  },
  p2: {
    u: ['ArrowUp'], d: ['ArrowDown'], l: ['ArrowLeft'], r: ['ArrowRight'],
    lp: ['Numpad1', 'Comma'], hp: ['Numpad2', 'Period'], lk: ['Numpad3', 'Slash'],
    pa: ['Numpad4', 'KeyM'], sp: ['Numpad5', 'Semicolon'], su: ['Numpad6', 'Quote'],
    ok: ['NumpadEnter'], back: ['NumpadDecimal'], start: ['NumpadEnter', 'Backslash'],
  },
};
// standard gamepad layout
const GPMAP = { lp: [2], hp: [3], lk: [0], sp: [1], pa: [4, 5], su: [6, 7], ok: [0, 9], back: [1, 8], start: [9] };

const Input = {
  down: new Set(), tap: new Set(),
  touch: {}, touchTap: new Set(),
  prev: [{}, {}], cur: [{}, {}], edge: [{}, {}],
  merge: true, // when true, P1 also listens to P2's keys (single-player modes)
  isTouch: false,

  init() {
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.tap.add(e.code);
      this.down.add(e.code);
      Sound.init();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    addEventListener('pointerdown', () => Sound.init());
    this.initTouch();
  },

  initTouch() {
    const el = document.getElementById('touch');
    if (!el) return;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!this.isTouch) return;
    el.hidden = false;
    el.querySelectorAll('[data-b]').forEach((b) => {
      const k = b.dataset.b;
      const on = (e) => { e.preventDefault(); this.touch[k] = true; this.touchTap.add(k); if (k === 'start') this.touchTap.add('ok'); b.classList.add('on'); Sound.init(); };
      const off = (e) => { e.preventDefault(); this.touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    });
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    let pid = null;
    const upd = (e) => {
      const r = stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy), max = r.width / 2 - 10;
      if (m > max) { dx *= max / m; dy *= max / m; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const dz = r.width * 0.16;
      const nu = dy < -dz, nd = dy > dz, nl = dx < -dz, nr = dx > dz;
      for (const [k, v] of [['u', nu], ['d', nd], ['l', nl], ['r', nr]]) {
        if (v && !this.touch[k]) this.touchTap.add(k);
        this.touch[k] = v;
      }
    };
    stick.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; stick.setPointerCapture(pid); upd(e); Sound.init(); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === pid) upd(e); });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null; knob.style.transform = '';
      this.touch.u = this.touch.d = this.touch.l = this.touch.r = false;
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
  },

  keyState(map) {
    const s = {};
    for (const b of BTNS) s[b] = map[b].some((c) => this.down.has(c) || this.tap.has(c));
    return s;
  },

  poll() {
    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; } catch (e) { pads = []; }
    for (let p = 0; p < 2; p++) {
      const s = this.keyState(KEYMAP['p' + (p + 1)]);
      if (p === 0 && this.merge) {
        const s2 = this.keyState(KEYMAP.p2);
        for (const b of BTNS) s[b] = s[b] || s2[b];
      }
      if (p === 0) for (const b of BTNS) if (this.touch[b] || this.touchTap.has(b)) s[b] = true;
      const gp = pads[p] || (p === 0 && this.merge ? pads[1] : null);
      if (gp) {
        const pr = (i) => gp.buttons[i] && gp.buttons[i].pressed;
        for (const b in GPMAP) if (GPMAP[b].some(pr)) s[b] = true;
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (pr(12) || ay < -0.5) s.u = true;
        if (pr(13) || ay > 0.5) s.d = true;
        if (pr(14) || ax < -0.5) s.l = true;
        if (pr(15) || ax > 0.5) s.r = true;
      }
      const e = {};
      for (const b of BTNS) e[b] = s[b] && !this.prev[p][b];
      this.prev[p] = s;
      this.cur[p] = s;
      this.edge[p] = e;
    }
    this.tap.clear();
    this.touchTap.clear();
  },

  // fighter-facing input frame for player p
  frame(p) {
    const s = this.cur[p], e = this.edge[p];
    return { u: s.u, d: s.d, l: s.l, r: s.r, e: { lp: e.lp, hp: e.hp, lk: e.lk, pa: e.pa, sp: e.sp, su: e.su } };
  },

  // menu navigation from a single player (or both when p undefined)
  nav(p) {
    const r = {};
    const ks = ['u', 'd', 'l', 'r', 'ok', 'back', 'start', 'lp', 'hp', 'lk', 'sp', 'pa', 'su'];
    for (const k of ks) r[k] = p === undefined ? this.edge[0][k] || this.edge[1][k] : this.edge[p][k];
    r.ok = r.ok || r.lp;
    r.back = r.back || r.hp;
    return r;
  },
  held(p) { return p === undefined ? { ...this.cur[0] } : this.cur[p]; },
};
const NOINPUT = { u: 0, d: 0, l: 0, r: 0, e: {} };
