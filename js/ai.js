'use strict';
// ---------- CPU opponent ----------
// level 1..10. mode: 'cpu' | 'stand' | 'block' | 'parry' | 'jump' (training dummies)
class AI {
  constructor(f, level, mode = 'cpu') {
    this.f = f;
    this.lv = clamp(level, 1, 12);
    this.mode = mode;
    this.react = Math.max(3, Math.round(20 - this.lv * 1.7));
    this.seenBuf = [];
    this.plan = [];
    this.wait = rint(20, 40);
    this.defFor = -1; this.defMode = null;
    this.projSeen = new WeakMap();
    this.aaFor = -1;
    this.confirmFor = -1;
    this.parryAt = -1;
  }

  think(M) {
    const f = this.f, o = f.opp;
    const res = { u: 0, d: 0, l: 0, r: 0, e: {} };
    const dir = (s) => {
      if (s.includes('u')) res.u = 1;
      if (s.includes('d')) res.d = 1;
      if (s.includes('f')) { if (f.facing > 0) res.r = 1; else res.l = 1; }
      if (s.includes('b')) { if (f.facing > 0) res.l = 1; else res.r = 1; }
    };
    const press = (b) => { res.e[b] = true; };

    // delayed perception of the opponent
    this.seenBuf.push({ state: o.state, moveId: o.moveId, move: o.move, mt: o.mt, x: o.x, grounded: o.grounded, vy: o.vy, jumpId: o.jumpId });
    if (this.seenBuf.length > 32) this.seenBuf.shift();
    const seen = this.seenBuf[Math.max(0, this.seenBuf.length - 1 - this.react)];
    const dist = Math.abs(o.x - f.x);
    const ai = f.ch.ai || {};
    const free = NEUTRAL.has(f.state) || f.state === 'blockstun';

    // ----- training dummy modes -----
    if (this.mode === 'stand') return res;
    if (this.mode === 'jump') { if (free && f.grounded) dir('u'); return res; }
    if (this.mode === 'block' || this.mode === 'parry') {
      const att = o.state === 'attack' && o.move;
      if (this.mode === 'parry' && free) {
        if (att && !o.move.noBox && o.mt >= o.move.s - 2 && o.mt <= o.move.s) press('pa');
        for (const p of M.projs) if (p.owner === o && Math.abs(p.x - f.x) < 30 + Math.abs(p.vx) * 2) press('pa');
        if (f.state === 'parry') return res;
      }
      dir('b');
      if (att && o.move.hit === 'low') dir('d');
      return res;
    }

    // ----- defense -----
    if (free) {
      // react to melee attack startup
      if (seen.state === 'attack' && seen.move && !seen.move.noBox && seen.moveId !== this.defFor) {
        const reach = (seen.move.box[0] + seen.move.box[2]) * o.scale + (seen.move.vx ? 70 : 18);
        if (dist < reach) {
          this.defFor = seen.moveId;
          const pParry = Math.min(0.55, 0.035 * this.lv + (M.bossFight ? 0.08 : 0));
          const pBlock = Math.min(0.92, 0.25 + 0.075 * this.lv);
          const r = Math.random();
          this.defMode = r < pParry ? 'parry' : r < pParry + pBlock ? 'block' : 'none';
          this.plan = [];
        }
      }
      const activeThreat = o.state === 'attack' && o.move && o.moveId === this.defFor;
      if (activeThreat && this.defMode === 'parry') {
        if (o.mt >= o.move.s - 2 && f.state !== 'parry') press('pa');
        return res;
      }
      if ((activeThreat && this.defMode === 'block') || f.state === 'blockstun') {
        dir('b');
        const hit = o.move ? o.move.hit : 'mid';
        if (hit === 'low' || (hit === 'mid' && f.crouchBlock && chance(0.5))) dir('d');
        return res;
      }
      // projectiles
      for (const p of M.projs) {
        if (p.owner !== o) continue;
        const pd = (f.x - p.x) * p.dir;
        if (pd < 0 || pd > 160) continue;
        let d = this.projSeen.get(p);
        if (!d) {
          const r = Math.random();
          const pParry = Math.min(0.5, 0.04 * this.lv);
          d = r < pParry ? 'parry' : r < pParry + 0.25 && p.type !== 'quake' && pd > 60 ? 'jump' : r < 0.85 ? 'block' : 'none';
          if (p.type === 'quake' && d === 'jump') d = 'block';
          this.projSeen.set(p, d);
        }
        if (d === 'parry' && pd < 18 + Math.abs(p.vx) * 3) { press('pa'); return res; }
        if (d === 'jump' && pd < 90 && f.grounded) { dir('uf'); return res; }
        if (d === 'block' && pd < 120) { dir('b'); if (p.hit === 'low') dir('d'); return res; }
      }
      // anti-air
      if (!seen.grounded && seen.jumpId !== this.aaFor && dist < 110 && f.grounded) {
        this.aaFor = seen.jumpId;
        if (chance(0.1 + 0.07 * this.lv)) {
          this.plan = [{ wait: Math.max(0, 8 - this.lv) }, chance(0.55) ? { d: 'u', b: 'sp' } : { d: 'd', b: 'hp' }];
        }
      }
    }

    // ----- offense -----
    // hit confirm into special / super
    if (f.state === 'attack' && f.didHit && f.move && f.move.cancel && f.moveId !== this.confirmFor) {
      this.confirmFor = f.moveId;
      if (chance(0.08 + this.lv * 0.07)) {
        if (f.meter >= 100 && chance(0.6)) press('su');
        else { if (f.move.cancel >= 2 && chance(0.4)) press('hp'); else { press('sp'); if (chance(0.5)) dir('f'); } }
      }
      return res;
    }
    // air attacks while jumping in
    if (f.state === 'jump' && !f.airUsed && f.vy > -1 && dist < 60 + this.lv * 2) press(choice(['lk', 'hp', 'lk']));

    if (!free) return res;

    // punish recovering opponent
    if (o.state === 'attack' && o.move && o.mt > o.move.s + o.move.a && dist < 70 && chance(0.03 * this.lv)) {
      press(f.meter >= 100 && chance(0.4) ? 'su' : choice(['hp', 'sp']));
      return res;
    }
    if ((o.state === 'land' || o.state === 'recover' || o.state === 'parry') && dist < 55 && chance(0.02 * this.lv)) {
      press(choice(['lp', 'hp', 'lk'])); return res;
    }

    // execute current plan
    if (this.plan.length) {
      const st = this.plan[0];
      if (st.wait) { st.wait--; if (st.d) dir(st.d); return res; }
      if (st.hold) { st.hold--; dir(st.d || ''); if (st.hold <= 0) this.plan.shift(); return res; }
      if (st.d) dir(st.d);
      if (st.b) press(st.b);
      this.plan.shift();
      return res;
    }
    if (this.wait > 0) {
      this.wait--;
      // idle drift
      if (this.drift) dir(this.drift);
      return res;
    }
    this.choosePlan(M, dist, ai);
    return res;
  }

  choosePlan(M, dist, ai) {
    const f = this.f, o = f.opp, lv = this.lv;
    const aggro = (ai.aggro || 0.6) + lv * 0.02 + (M.bossFight ? 0.1 : 0);
    const hasProj = !!f.ch.moves.A.proj;
    const myProj = M.projs.some((p) => p.owner === f);
    const pref = ai.range === 'far' ? 120 : ai.range === 'mid' ? 90 : 40;
    const W8 = [];
    const opt = (w, plan) => W8.push([w, plan]);
    this.drift = null;

    if (f.meter >= 100 && dist < 90 && chance(0.02 * lv + 0.05)) { this.plan = [{ b: 'su' }]; this.wait = 20; return; }

    if (dist > 160) {
      if (hasProj && !myProj) opt(3, [{ b: 'sp' }]);
      opt(4 * aggro, [{ hold: rint(15, 35), d: 'f' }]);
      opt(0.6 * aggro, [{ d: 'uf', b: null }]);
      if (ai.teleport) opt(0.8, [{ d: 'f', b: 'sp' }]);
      if (ai.range === 'far') opt(1.5, [{ hold: rint(10, 25), d: 'f' }]);
    } else if (dist > 85) {
      if (hasProj && !myProj) opt(2.5, [{ b: 'sp' }]);
      opt(3 * aggro, [{ hold: rint(10, 24), d: 'f' }]);
      opt(1 + lv * 0.08, [{ d: 'uf' }]);
      if (f.ch.moves.B.vx) opt(1.2 * aggro, [{ d: 'f', b: 'sp' }]);
      if (f.ch.id === 'suri') opt(dist < 125 ? 4 : 1, [{ b: 'sp' }]);
      if (f.ch.id === 'bronn') opt(1.2, [{ d: 'u', b: 'sp' }]);
      opt(0.6, [{ hold: rint(10, 20), d: 'b' }]);
    } else if (dist > 42) {
      opt(2.2, [{ b: 'lk' }]);
      opt(1.2, [{ d: 'd', b: 'lk' }]);
      opt(2 * aggro, [{ hold: rint(6, 16), d: 'f' }]);
      opt(0.8 + lv * 0.06, [{ d: 'uf' }]);
      if (f.ch.moves.B.vx || f.ch.id === 'duke') opt(1.2, [{ d: 'f', b: 'sp' }]);
      if (f.ch.id === 'suri') opt(3, [{ b: 'sp' }]);
      if (f.ch.id === 'suri') opt(1.5, [{ d: 'f', b: 'sp' }]);
      if (pref > 80) opt(1.5, [{ hold: rint(10, 20), d: 'b' }]);
    } else {
      opt(3, [{ b: 'lp' }, { wait: 2 }, { b: 'lp' }]);
      opt(2, [{ d: 'd', b: 'lp' }, { wait: 3 }, { d: 'd', b: 'lk' }]);
      opt(2, [{ b: 'hp' }]);
      opt(1.2, [{ d: 'd', b: 'lk' }]);
      opt(0.8 + lv * 0.1, [{ multi: 1 }]);
      if (dist < 34) opt(0.8 + lv * 0.08, [{ b: 'throw' }]);
      if (ai.grab) opt(2.5, [{ b: 'sp' }]);
      opt(1, [{ b: 'sp', d: chance(0.5) ? 'f' : '' }]);
      opt(0.8, [{ hold: rint(8, 16), d: 'b' }]);
      opt(0.6, [{ d: 'ub' }]);
    }
    // weighted pick
    const tot = W8.reduce((a, b) => a + b[0], 0);
    let r = Math.random() * tot, plan = W8[0][1];
    for (const [w, p] of W8) { if ((r -= w) <= 0) { plan = p; break; } }
    // expand special tokens
    this.plan = [];
    for (const st of plan) {
      if (st.multi) { this.plan.push({ b: 'lp' }, { wait: 3 }, { b: 'hp' }); continue; }
      if (st.b === 'throw') { this.plan.push({ both: ['lp', 'lk'] }); continue; }
      this.plan.push(Object.assign({}, st));
    }
    this.wait = Math.max(2, Math.round(rint(8, 30) * (1.4 - aggro * 0.6) - lv * 1.5));
    this.drift = chance(0.3) ? (dist > pref ? 'f' : 'b') : null;
  }
}

// patch plan execution for simultaneous presses
const _think = AI.prototype.think;
AI.prototype.think = function (M) {
  if (this.plan.length && this.plan[0].both && NEUTRAL.has(this.f.state)) {
    const st = this.plan.shift();
    const e = {};
    st.both.forEach((b) => (e[b] = true));
    this.seenBuf.push(this.seenBuf[this.seenBuf.length - 1] || {});
    return { u: 0, d: 0, l: 0, r: 0, e };
  }
  return _think.call(this, M);
};
