'use strict';
// ---------- fighter: state machine, inputs, physics ----------
const NEUTRAL = new Set(['idle', 'walk', 'crouch', 'guard']);
const GRAV = 0.45;
const SEQ = {
  qcf: [[2], [3], [6]],
  qcb: [[2], [1], [4]],
  dp: [[6], [2, 1], [3]],
  qcf2: [[2], [3], [6], [2], [3], [6]],
};

class Fighter {
  constructor(ch, palIdx, side, mods) {
    this.ch = ch;
    this.side = side;
    this.palIdx = palIdx;
    this.pal = ch.pals[palIdx] || ch.pals[0];
    this.mods = Object.assign({ hp: 1, dmg: 1, def: 1, meter: 1, parry: 0, regen: 0 }, mods || {});
    this.maxHp = Math.round(ch.stats.hp * this.mods.hp);
    this.meter = 0;
    this.parryWin = 8 + this.mods.parry;
    this.hist = [];
    this.buf = {};
    this.in = { u: 0, d: 0, fwd: 0, back: 0 };
    this.hitDone = new Set();
    this.moveId = 0;
    this.jumpId = 0;
    this.anim = 0;
    this.reset(STAGE_W / 2, 1);
  }

  reset(x, facing) {
    Object.assign(this, {
      x, y: GROUND, px: x, vx: 0, vy: 0, facing, hp: this.maxHp, dispHp: this.maxHp,
      state: 'idle', t: 0, move: null, mt: 0, stun: 0, inv: 0, parryT: 0, parryCD: 0,
      flash: 0, pflash: 0, armorFlash: 0, combo: 0, juggle: 0, armor: 0, grabbed: null,
      sinceHit: 999, airUsed: false, landT: 0, recT: 0, pushBack: 0, hidden: false, ghost: false,
      connected: false, didHit: false, cancelOK: false, crouchBlock: false, hitLow: false,
    });
    this.R = resolve(this.ch, this.ch.idle[0]);
    this.hist.length = 0;
    this.buf = {};
  }

  get grounded() { return this.y >= GROUND - 0.01; }
  get scale() { return this.ch.scale; }
  dmgMul() { return this.ch.stats.dmg * this.mods.dmg; }
  defMul() { return this.ch.stats.def * this.mods.def; }
  set(s) { this.state = s; this.t = 0; }
  gainMeter(n) { this.meter = Math.min(100, this.meter + n * this.mods.meter); }

  readInput(inp) {
    const fwd = this.facing > 0 ? inp.r : inp.l, back = this.facing > 0 ? inp.l : inp.r;
    this.in = { u: !!inp.u, d: !!inp.d, fwd: !!fwd, back: !!back };
    const dir = inp.d ? (fwd ? 3 : back ? 1 : 2) : inp.u ? (fwd ? 9 : back ? 7 : 8) : fwd ? 6 : back ? 4 : 5;
    this.hist.push(dir);
    if (this.hist.length > 30) this.hist.shift();
    for (const k in this.buf) if (--this.buf[k] <= 0) delete this.buf[k];
    if (inp.e) for (const k of ['lp', 'hp', 'lk', 'pa', 'sp', 'su']) if (inp.e[k]) this.buf[k] = 6;
  }
  motion(seq, win = 16) {
    const h = this.hist;
    let k = 0;
    for (let i = Math.max(0, h.length - win); i < h.length; i++) {
      if (seq[k].includes(h[i])) { k++; if (k === seq.length) return true; }
    }
    return false;
  }
  clearBuf() { this.buf = {}; }

  isInv() {
    if (this.inv > 0) return true;
    if (this.state === 'knockdown' || this.state === 'getup' || this.state === 'ko' || this.state === 'grabbed' || this.state === 'grabbing') return true;
    if (this.state === 'attack' && this.move && this.move.inv && this.mt >= this.move.inv[0] && this.mt < this.move.inv[1]) return true;
    if (this.state === 'airhit' && this.juggle >= 3) return true;
    return false;
  }

  // ---- action selection ----
  tryActions(M, o = { specials: 1, normals: 1, parry: 1 }) {
    const b = this.buf, m = this.ch.moves;
    const P = b.lp || b.hp, K = b.lk;
    if (o.specials) {
      if (this.meter >= 100 && (b.su || (P && this.motion(SEQ.qcf2, 28)))) { this.clearBuf(); return this.startMove(m.S, M); }
      let sp = null;
      if (b.sp) sp = this.in.u ? 'C' : this.in.fwd || this.in.back ? 'B' : 'A';
      else if (P && this.motion(SEQ.dp)) sp = 'C';
      else if (P && this.motion(SEQ.qcf)) sp = 'A';
      else if ((P || K) && this.motion(SEQ.qcb)) sp = 'B';
      if (sp) { this.clearBuf(); return this.startMove(m[sp], M); }
    }
    if (!o.normals) return false;
    if (b.lp && b.lk && o.parry) { this.grabDir = this.in.back ? -1 : 1; this.clearBuf(); return this.startMove(m.T, M); }
    if (b.pa && o.parry) {
      delete b.pa;
      this.set('parry'); this.parryT = this.parryWin; this.vx = 0;
      return true;
    }
    const cr = this.in.d;
    if (b.hp) { delete b.hp; return this.startMove(cr ? m.cH : m.sH, M); }
    if (b.lk) { delete b.lk; return this.startMove(cr ? m.cK : m.sK, M); }
    if (b.lp) { delete b.lp; return this.startMove(cr ? m.cL : m.sL, M); }
    return false;
  }
  tryAir(M) {
    const b = this.buf, m = this.ch.moves;
    if (b.pa && this.parryCD <= 0) { delete b.pa; this.parryT = this.parryWin; this.parryCD = this.parryWin + 14; this.pflash = 0; return false; }
    if (this.airUsed) return false;
    let mv = null;
    if (b.hp) mv = m.jH; else if (b.lk) mv = m.jK; else if (b.lp) mv = m.jL;
    if (mv) { this.clearBuf(); this.airUsed = true; return this.startMove(mv, M); }
    return false;
  }

  startMove(m, M) {
    if (!m) return false;
    if (m.super) {
      if (this.meter < 100) return false;
      this.meter = 0;
      M.superFlash(this, m);
    }
    this.move = m; this.mt = 0;
    this.set('attack');
    this.hitDone.clear();
    this.connected = false; this.didHit = false; this.cancelOK = false;
    this.fromR = this.R;
    this.armor = m.armor || 0;
    this.moveId++;
    if (!m.air) this.vx = 0;
    if (m.key === 'T' && !this.grabDir) this.grabDir = 1;
    if (!m.super) Sound.sfx(m.special ? 'special' : m.dmg >= 60 ? 'whoosh2' : 'whoosh');
    return true;
  }

  toNeutral(cr) {
    this.move = null;
    this.set(cr && this.in.d ? 'crouch' : 'idle');
    this.vx = 0;
  }

  threatened(M) {
    const o = this.opp;
    const d = Math.abs(o.x - this.x);
    if (o.state === 'attack' && d < 170) return true;
    for (const p of M.projs) if (p.owner === o && Math.abs(p.x - this.x) < 150 && sign(this.x - p.x) === p.dir) return true;
    return false;
  }

  canBlock(type) {
    if (!(NEUTRAL.has(this.state) || this.state === 'blockstun')) return false;
    if (!this.in.back && this.state !== 'blockstun') return false;
    if (this.state === 'blockstun' && !this.in.back) return false;
    const cr = this.in.d;
    if (type === 'low' && !cr) return false;
    if (type === 'over' && cr) return false;
    return true;
  }

  // ---- per-frame update ----
  step(inp, M) {
    this.px = this.x;
    this.readInput(inp);
    this.anim++;
    this.t++;
    this.sinceHit++;
    if (this.parryT > 0) this.parryT--;
    if (this.parryCD > 0) this.parryCD--;
    if (this.inv > 0) this.inv--;
    if (this.flash > 0) this.flash--;
    if (this.pflash > 0) this.pflash--;
    if (this.armorFlash > 0) this.armorFlash--;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': case 'guard': this.neutral(M); break;
      case 'prejump':
        if (this.tryActions(M, { specials: 1, normals: 0, parry: 0 })) break;
        if (this.t >= 3) {
          this.set('jump'); this.jumpId++;
          this.vy = this.ch.stats.jumpV; this.y -= 1;
          this.vx = this.jdir * this.ch.stats.jumpX * this.facing;
          this.airUsed = false;
          Sound.sfx('jump');
        }
        break;
      case 'jump': this.tryAir(M); break;
      case 'fall': break;
      case 'land': if (this.t >= (this.landT || 3)) this.toNeutral(); break;
      case 'attack': this.attackStep(M); break;
      case 'hitstun': case 'blockstun':
        if (--this.stun <= 0) this.toNeutral(true);
        break;
      case 'airhit': break;
      case 'knockdown':
        if (this.t >= 34 && this.hp > 0) { this.set('getup'); }
        break;
      case 'getup': if (this.t >= 18) { this.toNeutral(); this.inv = 4; this.combo = 0; } break;
      case 'grabbing': this.grabStep(M); break;
      case 'recover': if (this.t >= this.recT) this.toNeutral(); break;
      case 'parry': if (this.t >= this.parryWin + 10) this.toNeutral(); break;
      case 'grabbed': case 'win': case 'lose': case 'ko': break;
    }
    this.physics(M);
  }

  neutral(M) {
    if (this.tryActions(M)) return;
    const i = this.in;
    const setS = (s) => { if (this.state !== s) { this.state = s; this.t = 0; } };
    if (i.u) { this.set('prejump'); this.jdir = i.fwd ? 1 : i.back ? -1 : 0; this.vx = 0; return; }
    if (i.d) { setS(i.back && this.threatened(M) ? 'guard' : 'crouch'); this.crouchBlock = true; this.vx = 0; return; }
    if (i.back && this.threatened(M)) { setS('guard'); this.crouchBlock = false; this.vx = 0; return; }
    if (i.fwd) { setS('walk'); this.walkDir = 1; this.vx = this.facing * this.ch.stats.walk; }
    else if (i.back) { setS('walk'); this.walkDir = -1; this.vx = -this.facing * this.ch.stats.back; }
    else { setS('idle'); this.vx = 0; }
  }

  attackStep(M) {
    const m = this.move;
    this.mt++;
    const t = this.mt;
    if (this.cancelOK && m.cancel && t <= m.s + m.a + 8) {
      if (this.tryActions(M, { specials: 1, normals: m.cancel >= 2, parry: 0 })) return;
    }
    if (m.vx) {
      if (t >= m.vxFrom && t <= m.vxTo) this.vx = m.vx * this.facing;
      else if (t > m.vxTo && this.grounded) this.vx *= 0.6;
    } else if (!m.air && this.grounded) this.vx *= 0.7;
    if (m.vy && t === m.vyAt) { this.vy = m.vy; this.y -= 1; }
    if (m.proj && t === m.proj.at) M.spawnProj(this, m.proj);
    if (m.teleport && t === m.teleport.at) this.doTeleport(M);
    if (m.teleport) this.hidden = t >= 7 && t < m.teleport.at;
    if (m.grab && t > m.s && t <= m.s + m.a) { if (this.tryGrab(M)) return; }
    if (m.air) {
      if (this.grounded && t > 2) { this.move = null; this.set('land'); this.landT = 4; Sound.sfx('land'); return; }
      if (t >= m.s + m.a + m.r) { this.move = null; this.set('jump'); }
      return;
    }
    if (t >= m.s + m.a + m.r) {
      this.hidden = false;
      if (!this.grounded) { this.move = null; this.set('fall'); }
      else this.toNeutral(m.crouch);
    }
  }

  doTeleport(M) {
    const o = this.opp;
    let nx = o.x + (o.x > this.x ? 34 : -34) * this.scale;
    const lo = Math.max(16, M.camX + 16), hi = Math.min(STAGE_W - 16, M.camX + W - 16);
    if (nx < lo || nx > hi) nx = o.x - (o.x > this.x ? 34 : -34);
    M.burst(this.x, this.y - 40, this.pal.fx, 10);
    this.x = clamp(nx, lo, hi);
    this.facing = o.x > this.x ? 1 : -1;
    this.hidden = false;
    M.burst(this.x, this.y - 40, this.pal.fx, 10);
    Sound.sfx('teleport');
  }

  tryGrab(M) {
    const o = this.opp, g = this.move.grab;
    if (Math.abs(o.x - this.x) > g.range * this.scale) return false;
    if (!o.grounded) return false;
    if (['hitstun', 'blockstun', 'knockdown', 'getup', 'airhit', 'ko', 'grabbed', 'grabbing'].includes(o.state)) return false;
    if (o.isInv()) return false;
    this.gMove = this.move;
    this.set('grabbing');
    this.grabbed = o;
    o.set('grabbed'); o.move = null; o.vx = o.vy = 0; o.hidden = false;
    this.vx = 0;
    Sound.sfx('grab');
    if (this.gMove.super) M.burst(this.x, this.y - 50, this.pal.fx, 16);
    return true;
  }
  grabStep(M) {
    const o = this.grabbed, g = this.gMove.grab, s = this.scale, t = this.t;
    if (!o) { this.toNeutral(); return; }
    const lift = Math.min(1, t / (g.hold * 0.5));
    if (g.spin) {
      const a = t * 0.35;
      o.x = this.x + Math.cos(a) * 16 * s;
      o.y = GROUND - lift * 46 * s - Math.abs(Math.sin(a)) * 8;
      o.facing = Math.sin(a) > 0 ? 1 : -1;
      if (t % 8 === 0) M.burst(this.x, GROUND - 40, this.pal.fx, 4);
    } else {
      o.x = this.x + this.facing * 14 * s;
      o.y = GROUND - lift * 30 * s;
      o.facing = -this.facing;
    }
    if (t >= g.hold) {
      const dir = (this.grabDir || 1) < 0 ? -1 : 1;
      o.x = this.x + this.facing * dir * 18 * s;
      M.grabDamage(this, o, g);
      if (o.state !== 'ko') o.set('airhit');
      o.vy = g.throwVy || -5;
      o.vx = this.facing * dir * (g.throwVx || 3);
      o.y = Math.min(o.y, GROUND - 4);
      this.grabbed = null;
      this.grabDir = 1;
      this.set('recover'); this.recT = 16;
      M.shake = 5;
    }
  }

  physics(M) {
    if (this.state === 'grabbed') return;
    this.x += this.vx;
    if (this.pushBack > 0.05) { this.x -= this.facing * this.pushBack; this.pushBack *= 0.7; }
    if (!this.grounded || this.vy < 0) {
      this.y += this.vy;
      this.vy += this.state === 'airhit' || this.state === 'ko' ? 0.4 : GRAV;
      if (this.y >= GROUND) {
        this.y = GROUND; this.vy = 0;
        this.onLand(M);
      }
    }
    if (this.grounded && (this.state === 'hitstun' || this.state === 'blockstun' || this.state === 'knockdown' || this.state === 'recover' || this.state === 'land' || this.state === 'parry' || this.state === 'getup' || this.state === 'win' || this.state === 'lose')) this.vx *= 0.8;
  }

  onLand(M) {
    switch (this.state) {
      case 'jump': case 'fall': {
        const wasFall = this.state === 'fall';
        this.set('land'); this.landT = wasFall ? 10 : 3; this.vx = 0;
        Sound.sfx('land'); M.dust(this.x, 3);
      }
        break;
      case 'airhit':
        this.vx *= 0.3;
        if (this.hp <= 0) { this.set('ko'); }
        else this.set('knockdown');
        this.juggle = 0;
        Sound.sfx('land'); M.dust(this.x, 6); M.shake = Math.max(M.shake, 2);
        break;
      case 'ko':
        this.vx *= 0.3; M.dust(this.x, 4);
        break;
      case 'attack':
        if (this.move && !this.move.air && this.mt > this.move.vyAt) { /* rising move landed early */ this.vx = 0; }
        break;
    }
  }

  // ---- boxes ----
  box(b) {
    const s = this.scale;
    const x0 = b[0] * s, w = b[2] * s;
    return { x: this.facing > 0 ? this.x + x0 : this.x - x0 - w, y: this.y + b[1] * s, w, h: b[3] * s };
  }
  hurtbox() {
    if (this.isInv()) return null;
    if (this.hidden) return null;
    const crouchy = this.state === 'crouch' || (this.state === 'guard' && this.crouchBlock) || (this.state === 'blockstun' && this.crouchBlock) ||
      (this.state === 'attack' && this.move && this.move.crouch) || (this.state === 'hitstun' && this.hitLow);
    if (!this.grounded || this.state === 'airhit') return this.box([-12, -72, 24, 58]);
    if (crouchy) return this.box([-13, -56, 26, 56]);
    return this.box([-11, -80, 22, 80]);
  }
  limbBox() {
    const m = this.move;
    if (this.state !== 'attack' || !m || m.noBox || this.mt <= m.s) return null;
    const b = m.box;
    return this.box([b[0], b[1], b[2] * 0.75, b[3]]);
  }

  // ---- animation ----
  updatePose() {
    const ch = this.ch, st = this.state;
    let target;
    const r = (p) => resolve(ch, p);
    switch (st) {
      case 'idle': case 'intro': {
        const ph = (Math.sin(this.anim * (ch.id === 'volta' ? 0.05 : 0.08)) + 1) / 2;
        target = lerpR(r(ch.idle[0]), r(ch.idle[1]), ph);
        break;
      }
      case 'walk': {
        const cyc = ((this.anim * 0.11 * this.walkDir) % 4 + 4) % 4;
        const i = Math.floor(cyc);
        target = lerpR(r(P.walk[i]), r(P.walk[(i + 1) % 4]), cyc - i);
        break;
      }
      case 'crouch': target = r(P.crouch); break;
      case 'guard': target = r(this.crouchBlock ? P.cguard : P.guard); break;
      case 'blockstun': target = r(this.crouchBlock ? P.cguard : P.guard); break;
      case 'prejump': target = r(P.prejump); break;
      case 'jump': case 'fall':
        target = r(this.vy < -2.5 ? P.jumpUp : this.vy < 2.5 ? P.jumpTuck : P.jumpFall);
        break;
      case 'land': target = r(P.land); break;
      case 'attack': this.R = this.attackPose(); return;
      case 'hitstun': target = r(this.hitLow ? P.chit : this.hitAlt ? P.hit2 : P.hit); break;
      case 'airhit': case 'grabbed': target = r(P.airhit); break;
      case 'knockdown': case 'ko': target = r(P.down); break;
      case 'getup': target = lerpR(r(P.down), r(P.crouch), ease(this.t / 18)); this.R = target; return;
      case 'grabbing': {
        const a = this.gMove.anim, hold = this.gMove.grab.hold;
        target = this.t < hold * 0.7 ? r(a.g) : r(a.t);
        break;
      }
      case 'recover': target = r(this.gMove ? this.gMove.anim.t : P.land); break;
      case 'parry': target = r(P.parry); break;
      case 'win': target = lerpR(r(P.win), r(P.win2), (Math.sin(this.anim * 0.1) + 1) / 2); break;
      case 'lose': target = r(P.lose); break;
      default: target = r(ch.idle[0]);
    }
    const k = st === 'hitstun' || st === 'airhit' || st === 'parry' ? 0.6 : st === 'knockdown' || st === 'ko' ? 0.3 : 0.35;
    this.R = lerpR(this.R, target, k);
  }
  attackPose() {
    const m = this.move, a = m.anim, t = this.mt, ch = this.ch;
    const Wp = resolve(ch, a.w), Ap = resolve(ch, a.a);
    if (t <= m.s) {
      const k = m.s <= 1 ? 1 : t / m.s;
      if (k < 0.55) return lerpR(this.fromR, Wp, ease(k / 0.55));
      return lerpR(Wp, Ap, ease((k - 0.55) / 0.45));
    }
    if (t <= m.s + m.a) {
      if (a.a2) {
        const hint = m.hint || m.a;
        const i = Math.floor((t - m.s - 1) / hint);
        const ph = ((t - m.s - 1) % hint) / hint;
        const A2 = resolve(ch, a.a2);
        const from = i % 2 ? Ap : A2, to = i % 2 ? A2 : Ap;
        return lerpR(from, to, ease(Math.min(1, ph * 2.5)));
      }
      return Ap;
    }
    const k = (t - m.s - m.a) / m.r;
    const end = this.grounded ? resolve(ch, m.crouch ? P.crouch : ch.idle[0]) : resolve(ch, P.jumpFall);
    const last = a.a2 && Math.floor((m.a - 1) / (m.hint || m.a)) % 2 ? resolve(ch, a.a2) : Ap;
    return lerpR(last, end, ease(k));
  }
}
