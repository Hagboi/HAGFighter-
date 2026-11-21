'use strict';
// ---------- a match: two fighters, rounds, hits, HUD, rewards ----------
class Proj {
  constructor(owner, def) {
    Object.assign(this, { hits: 1, hint: 8, hs: 18, bs: 14, push: 2.5, special: 1, life: 220, w: 16, h: 16, hit: 'mid' }, def);
    const s = owner.scale;
    this.owner = owner;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * 22 * s;
    this.y = def.ground ? GROUND - def.h / 2 : owner.y + (def.y || -58) * s;
    this.vx = def.vx * owner.facing;
    this.t = 0; this.hitT = 0; this.maxHits = this.hits;
  }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
}

class Match {
  // cfg: { mode, stage, p:[{id,pal,cpu,level,mods,aiMode}x2], training, coinMult, onEnd(result) }
  constructor(cfg) {
    this.cfg = cfg;
    this.mode = cfg.mode;
    this.training = !!cfg.training;
    this.stage = STAGES[cfg.stage];
    this.stage.ensure();
    this.f = cfg.p.map((p, i) => new Fighter(CHAR[p.id], p.pal || 0, i, p.mods));
    this.f[0].opp = this.f[1]; this.f[1].opp = this.f[0];
    this.ai = cfg.p.map((p, i) => (p.cpu ? new AI(this.f[i], p.level || 3, p.aiMode || 'cpu') : null));
    this.human = cfg.p.map((p) => !p.cpu);
    this.rewardSide = this.human[0] && !this.human[1] ? 0 : -1; // coins only vs CPU
    this.bossFight = !!CHAR[cfg.p[1].id].boss && cfg.mode === 'arcade';
    this.coinMult = cfg.coinMult || 1;
    this.wins = [0, 0];
    this.round = 0;
    this.projs = []; this.fx = []; this.banner = null;
    this.coins = 0;
    this.stats = { hits: 0, maxCombo: 0, parries: 0, perfects: 0, counters: 0 };
    this.time = 0; this.hitstop = 0; this.freeze = 0; this.slow = 0; this.shake = 0;
    this.excite = 0;
    this.comboShow = [null, null];
    this.done = false;
    this.lastAtt = 0;
    this.nextRound();
    Sound.playMusic(this.stage.music);
  }

  nextRound() {
    this.round++;
    const [a, b] = this.f;
    a.reset(STAGE_W / 2 - 64, 1);
    b.reset(STAGE_W / 2 + 64, -1);
    a.state = b.state = 'intro';
    this.timer = 99; this.tick = 0;
    this.phase = 'intro'; this.pt = 0;
    this.projs = [];
    this.camX = (STAGE_W - W) / 2;
    this.dmgTaken = [0, 0];
    this.koSide = -1;
  }

  setBanner(str, col = '#ffe14a', size = 24, life = 70, sub = null) {
    this.banner = { str, col, size, life, t: 0, sub };
  }

  // ---------- main update ----------
  update(inputs) {
    this.time++;
    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.2) this.shake = 0;
    this.excite = Math.max(0, this.excite - 0.004);
    const ins = [0, 1].map((i) => (this.ai[i] ? this.ai[i].think(this) : inputs[i]));
    if (this.freeze > 0) {
      this.freeze--;
      this.f.forEach((f, i) => f.readInput(ins[i]));
      this.updateFx();
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop--;
      this.f.forEach((f, i) => f.readInput(ins[i]));
      this.updateFx();
      return;
    }
    if (this.slow > 0) {
      this.slow--;
      if (this.slow % 3) { this.updateFx(); return; }
    }
    this.pt++;
    const live = this.phase === 'fight' || this.phase === 'ko';
    for (let i = 0; i < 2; i++) this.f[i].step(this.phase === 'fight' ? ins[i] : NOINPUT, this);
    this.separate();
    this.clampAll();
    if (live) {
      // detect both directions first so simultaneous hits trade fairly
      const h0 = this.detectHit(this.f[0], this.f[1]);
      const h1 = this.detectHit(this.f[1], this.f[0]);
      if (h0) this.resolveHit(this.f[0], this.f[1], h0.m, h0.idx, null, h0.hb);
      if (h1) this.resolveHit(this.f[1], this.f[0], h1.m, h1.idx, null, h1.hb);
    }
    this.updateProjs();
    this.updateFacing();
    for (const f of this.f) {
      f.updatePose();
      if (f.dispHp > f.hp) f.dispHp = Math.max(f.hp, f.dispHp - (f.sinceHit > 30 ? 6 : 0));
      if (f.dispHp < f.hp) f.dispHp = f.hp;
      // combo counter ends
      if (f.combo > 0 && !['hitstun', 'airhit', 'grabbed'].includes(f.opp.state)) {
        if (f.combo >= 2) this.comboEnd(f);
        f.combo = 0;
      }
      if (f.meter >= 100 && this.time % 4 === 0) this.fx.push(new Fx({ type: 'dot', x: f.x + rand(-12, 12), y: f.y - rand(5, 70), vy: -0.6, life: 26, col: f.pal.fx, size: 2 }));
    }
    this.updateCamera();
    this.updateFx();
    this.updatePhase();
  }

  updatePhase() {
    const [a, b] = this.f;
    if (this.phase === 'intro') {
      if (this.pt === 1) {
        const last = this.wins[0] === 1 && this.wins[1] === 1;
        this.setBanner(last ? 'FINAL ROUND' : 'ROUND ' + this.round, '#ffe14a', 24, 60);
        Sound.say(last ? 'Final round' : 'Round ' + this.round);
        Sound.sfx('round');
      }
      if (this.pt === 62) { this.setBanner('FIGHT!', '#ff5a3a', 32, 40); Sound.say('Fight!'); Sound.sfx('round'); }
      if (this.pt >= 75) {
        this.phase = 'fight'; this.pt = 0;
        a.set('idle'); b.set('idle');
      }
    } else if (this.phase === 'fight') {
      this.tick++;
      if (!this.training && this.tick % 55 === 0 && this.timer > 0) {
        this.timer--;
        if (this.timer === 0) this.timeOver();
      }
      for (const f of this.f) {
        if (f.mods.regen > 0 && f.sinceHit > 180 && f.hp > 0 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + f.mods.regen / 60);
      }
      if (this.training) {
        for (const f of this.f) {
          if (f.sinceHit > 70 && f.hp < f.maxHp && NEUTRAL.has(f.state)) { f.hp = f.maxHp; f.dispHp = f.maxHp; }
          if (this.human[f.side]) f.meter = 100;
        }
      }
    } else if (this.phase === 'ko') {
      const settled = this.f.every((f) => f.grounded && !['airhit', 'attack', 'grabbing', 'grabbed', 'hitstun', 'blockstun'].includes(f.state));
      if (this.pt > 70 && settled && !this.winPosed) {
        this.winPosed = true;
        const w = this.roundWinner;
        if (w >= 0) {
          const wf = this.f[w];
          if (wf.hp > 0) wf.set('win');
          if (this.timeOverFlag && this.f[1 - w].hp > 0) this.f[1 - w].set('lose');
          this.setBanner(wf.ch.name + ' WINS', '#ffe14a', 16, 120);
          Sound.say(wf.ch.name + ' wins');
          if (this.dmgTaken[w] === 0) {
            setTimeout(() => Sound.say('Perfect'), 900);
            this.banner.sub = 'PERFECT!';
          }
        } else { this.setBanner('DRAW GAME', '#fff', 16, 120); Sound.say('Draw game'); }
        this.awaitT = 140;
      }
      if (this.winPosed && --this.awaitT <= 0) { this.winPosed = false; this.endRound(); }
    }
  }

  koEvent(loser) {
    if (this.phase !== 'fight') return;
    this.phase = 'ko'; this.pt = 0; this.winPosed = false; this.timeOverFlag = false;
    this.slow = 70;
    this.koSide = loser.side;
    const other = this.f[1 - loser.side];
    this.roundWinner = other.hp > 0 ? other.side : -1;
    this.setBanner('K.O.', '#ff3a3a', 40, 80);
    Sound.sfx('ko'); Sound.say('K.O.');
    this.shake = 6;
    this.excite = 1;
    this.fx.push(new Fx({ type: 'ring', x: loser.x, y: loser.y - 40, size: 60, life: 30, col: '#fff' }));
  }
  timeOver() {
    this.phase = 'ko'; this.pt = 0; this.winPosed = false; this.timeOverFlag = true;
    const [a, b] = this.f;
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    this.roundWinner = Math.abs(ra - rb) < 0.001 ? -1 : ra > rb ? 0 : 1;
    this.setBanner('TIME OVER', '#fff', 24, 80);
    Sound.say('Time over');
  }
  endRound() {
    const w = this.roundWinner;
    if (w >= 0) {
      this.wins[w]++;
      if (w === this.rewardSide) {
        const perfect = this.dmgTaken[w] === 0;
        this.award(60, 'ROUND WIN');
        this.award(this.timer * 2, 'TIME BONUS');
        if (perfect) { this.award(150, 'PERFECT'); this.stats.perfects++; }
      }
    } else { this.wins[0]++; this.wins[1]++; }
    const over = this.wins[0] >= 2 || this.wins[1] >= 2 || this.round >= 5;
    if (over && !this.training) {
      this.done = true;
      this.phase = 'over';
      const winner = this.wins[0] === this.wins[1] ? -1 : this.wins[0] > this.wins[1] ? 0 : 1;
      if (this.cfg.onEnd) this.cfg.onEnd({ winner, stats: this.stats, coins: this.coins, wins: this.wins.slice(), breakdown: this.breakdown || [] });
    } else {
      if (this.training) this.wins = [0, 0];
      this.nextRound();
    }
  }

  // coin rewards (incremental layer)
  award(n, label) {
    n = Math.round(n * this.coinMult * Save.coinMult());
    if (n <= 0) return;
    this.coins += n;
    Save.add(n);
    (this.breakdown = this.breakdown || []).push([label, n]);
  }
  coinPop(n, x, y) {
    n = Math.round(n * this.coinMult * Save.coinMult());
    if (n <= 0) return;
    this.coins += n;
    Save.add(n);
    this.fx.push(new Fx({ type: 'text', str: '+' + fmt(n), x, y, vy: -0.5, life: 40, col: '#ffd84a', fs: 8 }));
    if (this.time % 3 === 0) Sound.sfx('coin');
  }
  comboEnd(f) {
    if (f.side === this.rewardSide) {
      this.stats.maxCombo = Math.max(this.stats.maxCombo, f.combo);
      this.coinPop(Math.pow(f.combo, 1.6) * 4, f.opp.x, f.opp.y - 90);
      Save.data.best.combo = Math.max(Save.data.best.combo, f.combo);
    }
  }

  // ---------- combat ----------
  detectHit(a, d) {
    if (a.state !== 'attack') return null;
    const m = a.move;
    if (!m || m.noBox || m.grab) return null;
    const t = a.mt;
    if (t <= m.s || t > m.s + m.a) return null;
    const idx = m.hits > 1 ? Math.min(m.hits - 1, Math.floor((t - m.s - 1) / m.hint)) : 0;
    if (a.hitDone.has(idx)) return null;
    const hb = a.box(m.box);
    const hu = d.hurtbox();
    if (!hu) return null;
    if (!overlap(hb, hu)) {
      const ex = d.limbBox();
      if (!ex || d.isInv() || !overlap(hb, ex)) return null;
    }
    a.hitDone.add(idx);
    return { m, idx, hb };
  }

  resolveHit(a, d, m, idx, proj, hb) {
    const total = (proj ? proj.maxHits : m.hits) || 1;
    const last = idx >= total - 1;
    const type = m.hit || 'mid';
    const cx = proj ? proj.x : clamp(d.x - a.facing * 6, hb.x, hb.x + hb.w);
    const cy = proj ? proj.y : clamp(hb.y + hb.h / 2, d.y - 90, d.y - 6);
    const away = proj ? proj.dir : a.facing;
    this.lastAtt = a.side;

    // ----- PARRY -----
    if (d.parryT > 0 && !['hitstun', 'airhit', 'grabbed', 'knockdown', 'ko'].includes(d.state)) {
      d.parryT = 10; d.parryCD = 0;
      if (d.grounded) { d.set('idle'); d.vx = 0; }
      d.pflash = 14;
      d.gainMeter(12);
      this.hitstop = Math.max(this.hitstop, 14);
      this.fx.push(new Fx({ type: 'ring', x: cx, y: cy, size: 22, life: 16, col: '#8ff8ff' }));
      this.fx.push(new Fx({ type: 'spark', x: cx, y: cy, size: 14, life: 10, col: '#c8ffff', rot: 0.4 }));
      this.fx.push(new Fx({ type: 'text', str: 'PARRY!', x: cx, y: cy - 22, vy: -0.4, life: 45, col: '#8ff8ff', fs: 8 }));
      Sound.sfx('parry');
      a.connected = true; a.cancelOK = false;
      if (d.side === this.rewardSide) { this.stats.parries++; this.coinPop(12, cx, cy - 34); Save.data.best.parries = Math.max(Save.data.best.parries, this.stats.parries); }
      if (proj) proj.hits = 0;
      this.excite = Math.min(1, this.excite + 0.3);
      return;
    }
    // ----- BLOCK -----
    if (d.canBlock(type)) {
      d.crouchBlock = d.in.d;
      d.set('blockstun'); d.stun = m.bs || 12;
      d.vx = away * (m.push || 2.5) * 0.9;
      const chip = m.special ? Math.round((m.dmg || 0) * 0.15 * a.dmgMul()) : 0;
      if (chip) { d.hp = Math.max(1, d.hp - chip); d.sinceHit = 0; }
      a.connected = true; a.cancelOK = true;
      a.gainMeter(3); d.gainMeter(2.5);
      this.hitstop = Math.max(this.hitstop, 6);
      this.fx.push(new Fx({ type: 'block', x: cx, y: cy, life: 10, col: '#9ad8ff' }));
      if (!proj && d.grounded) a.pushBack = Math.max(a.pushBack, (m.push || 2.5) * 0.35);
      Sound.sfx('block');
      return;
    }
    // ----- ARMOR -----
    if (d.state === 'attack' && d.armor > 0 && d.mt <= d.move.s + d.move.a) {
      d.armor--;
      const dmg = Math.round((m.dmg || 0) * a.dmgMul() * d.defMul() * 0.5);
      d.hp = Math.max(1, d.hp - dmg); d.sinceHit = 0;
      d.armorFlash = 10;
      this.hitstop = Math.max(this.hitstop, 8);
      this.fx.push(new Fx({ type: 'spark', x: cx, y: cy, size: 10, life: 8, col: '#ffcf6a', rot: 0 }));
      Sound.sfx('armor');
      a.connected = true;
      return;
    }
    // ----- HIT -----
    const comboing = ['hitstun', 'airhit', 'grabbed'].includes(d.state);
    if (!comboing) a.combo = 0;
    a.combo++;
    const scale = Math.max(0.35, 1 - 0.1 * (a.combo - 1));
    const counter = d.state === 'attack' && d.move && d.mt <= d.move.s && !comboing;
    let dmg = (m.dmg || 0) * a.dmgMul() * d.defMul() * scale * (counter ? 1.25 : 1);
    dmg = Math.max(1, Math.round(dmg));
    d.hp = Math.max(0, d.hp - dmg);
    d.sinceHit = 0; d.flash = 6;
    d.move = null; d.hidden = false;
    this.dmgTaken[d.side] += dmg;
    a.connected = true; a.cancelOK = true; a.didHit = true;
    a.gainMeter(dmg * 0.11); d.gainMeter(dmg * 0.07);
    const heavy = dmg >= 60 || m.super;
    const airborne = !d.grounded || d.state === 'airhit';
    if (d.hp <= 0 || (m.kd && last) || m.launch || airborne) {
      d.juggle = airborne ? d.juggle + 1 : 0;
      d.set('airhit');
      d.vy = d.hp <= 0 ? -6 : m.launch ? -6.5 : airborne ? -4 : -5;
      d.vx = away * (m.launch ? 1.2 : 2.4);
      d.y = Math.min(d.y, GROUND - 2);
    } else {
      d.set('hitstun'); d.stun = m.hs || 16;
      d.hitLow = d.in.d && d.grounded; d.hitAlt = !d.hitAlt;
      d.vx = away * (m.push || 2.5);
      if (!proj) a.pushBack = Math.max(a.pushBack, (m.push || 2.5) * 0.25);
    }
    this.hitstop = Math.max(this.hitstop, heavy ? 9 : 6);
    this.shake = Math.max(this.shake, heavy ? 3.5 : 1.5);
    this.excite = Math.min(1, this.excite + (heavy ? 0.25 : 0.1));
    this.fx.push(new Fx({ type: 'spark', x: cx, y: cy, size: heavy ? 16 : 10, life: heavy ? 12 : 8, col: heavy ? '#ffe680' : '#ffffff', rot: Math.random() }));
    if (heavy) this.fx.push(new Fx({ type: 'ring', x: cx, y: cy, size: 18, life: 10, col: a.pal.fx }));
    for (let i = 0; i < (heavy ? 8 : 4); i++) this.fx.push(new Fx({ type: 'dot', x: cx, y: cy, vx: rand(-2, 2) + away, vy: rand(-2.5, 1), g: 0.15, life: 16, col: a.pal.fx, size: 2 }));
    Sound.sfx(heavy ? 'heavy' : 'light');
    if (counter) {
      this.fx.push(new Fx({ type: 'text', str: 'COUNTER', x: cx, y: cy - 20, vy: -0.4, life: 40, col: '#ff7a3a' }));
      Sound.sfx('counter');
      if (a.side === this.rewardSide) this.stats.counters++;
    }
    if (a.combo >= 2) this.comboShow[a.side] = { n: a.combo, t: 70 };
    if (a.side === this.rewardSide) { this.stats.hits++; this.coinPop(Math.ceil(dmg / 12), cx, cy - 12); }
    if (d.hp <= 0) this.koEvent(d);
  }

  grabDamage(a, d, g) {
    if (!(['hitstun', 'airhit', 'grabbed'].includes(d.state) && a.combo > 0)) a.combo = 0;
    a.combo++;
    const dmg = Math.max(1, Math.round(g.dmg * a.dmgMul() * d.defMul()));
    d.hp = Math.max(0, d.hp - dmg);
    d.sinceHit = 0; d.flash = 6;
    this.dmgTaken[d.side] += dmg;
    a.gainMeter(dmg * 0.1); d.gainMeter(dmg * 0.06);
    this.hitstop = 10;
    this.excite = 1;
    this.fx.push(new Fx({ type: 'spark', x: d.x, y: d.y - 40, size: 18, life: 12, col: '#ffe680', rot: 0 }));
    this.fx.push(new Fx({ type: 'ring', x: d.x, y: d.y - 40, size: 24, life: 12, col: a.pal.fx }));
    Sound.sfx('heavy');
    if (a.side === this.rewardSide) { this.stats.hits++; this.coinPop(Math.ceil(dmg / 10), d.x, d.y - 70); }
    if (d.hp <= 0) { d.set('airhit'); this.koEvent(d); }
  }

  superFlash(f, m) {
    this.freeze = 40;
    this.superBy = f;
    this.superName = m.name;
    this.superT = 0;
    Sound.sfx('super');
    Sound.say(m.name.toLowerCase());
    this.burst(f.x, f.y - 45, f.pal.fx, 24);
    this.fx.push(new Fx({ type: 'ring', x: f.x, y: f.y - 45, size: 50, life: 30, col: f.pal.fx }));
  }

  spawnProj(f, def) {
    this.projs.push(new Proj(f, def));
    Sound.sfx('proj');
  }

  updateProjs() {
    for (const p of this.projs) {
      p.t++; p.x += p.vx; p.life--;
      if (p.hitT > 0) p.hitT--;
      if (p.x < this.camX - 80 || p.x > this.camX + W + 80 || p.life <= 0) { p.dead = true; continue; }
      if (p.type === 'quake' && p.t % 4 === 0) this.dust(p.x, 1);
      const d = p.owner.opp;
      if (p.hitT <= 0 && (this.phase === 'fight' || this.phase === 'ko')) {
        const hu = d.hurtbox();
        if (hu && overlap(p.box(), hu)) {
          this.resolveHit(p.owner, d, p, p.maxHits - p.hits, p, p.box());
          p.hits--; p.hitT = p.hint;
          if (p.hits <= 0) p.dead = true;
        }
      }
    }
    // projectile clashes
    for (let i = 0; i < this.projs.length; i++) {
      for (let j = i + 1; j < this.projs.length; j++) {
        const a = this.projs[i], b = this.projs[j];
        if (a.dead || b.dead || a.owner === b.owner) continue;
        if (overlap(a.box(), b.box())) {
          const n = Math.min(a.hits, b.hits);
          a.hits -= n; b.hits -= n;
          if (a.hits <= 0) a.dead = true;
          if (b.hits <= 0) b.dead = true;
          this.fx.push(new Fx({ type: 'spark', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, size: 16, life: 12, col: '#fff', rot: 0 }));
          Sound.sfx('block');
        }
      }
    }
    for (const p of this.projs) if (p.dead) this.burst(p.x, p.y, p.owner.pal.fx, 6);
    this.projs = this.projs.filter((p) => !p.dead);
  }

  separate() {
    const [a, b] = this.f;
    if (a.state === 'grabbed' || b.state === 'grabbed') return;
    if ((a.state === 'attack' && a.move && a.move.noPush) || (b.state === 'attack' && b.move && b.move.noPush)) return;
    if (a.hidden || b.hidden) return;
    const minD = 11 * a.ch.scale * Math.sqrt(a.ch.bulk) + 11 * b.ch.scale * Math.sqrt(b.ch.bulk);
    const dx = b.x - a.x;
    const dy = Math.abs(a.y - b.y);
    if (dy < 45 && Math.abs(dx) < minD) {
      const push = (minD - Math.abs(dx)) / 2;
      const dir = Math.abs(dx) < 0.5 ? (a.x < STAGE_W / 2 ? 1 : -1) : sign(dx);
      a.x -= dir * push; b.x += dir * push;
    }
  }

  clampAll() {
    const [a, b] = this.f;
    const maxD = W - 32;
    const dx = b.x - a.x;
    if (Math.abs(dx) > maxD) {
      const over = Math.abs(dx) - maxD, s = sign(dx);
      const am = (a.x - a.px) * -s, bm = (b.x - b.px) * s;
      if (am > 0 && bm > 0) { a.x += s * over / 2; b.x -= s * over / 2; }
      else if (am >= bm) a.x += s * over;
      else b.x -= s * over;
    }
    for (const f of this.f) {
      if (f.state === 'grabbed') continue;
      const nx = clamp(f.x, 14, STAGE_W - 14);
      const pushed = Math.abs(nx - f.x);
      f.x = nx;
      // cornered victims push the attacker back
      if (pushed > 0 && ['hitstun', 'blockstun', 'airhit'].includes(f.state) && f.opp.grounded) f.opp.x -= sign(f.x - f.opp.x) * pushed;
    }
  }

  updateFacing() {
    for (const f of this.f) {
      const ok = f.grounded && (NEUTRAL.has(f.state) || f.state === 'prejump' || f.state === 'land' || f.state === 'intro');
      if (ok && Math.abs(f.opp.x - f.x) > 2) f.facing = f.opp.x > f.x ? 1 : -1;
    }
  }

  updateCamera() {
    const [a, b] = this.f;
    const tgt = clamp((a.x + b.x) / 2 - W / 2, 0, STAGE_W - W);
    this.camX = lerp(this.camX, tgt, 0.25);
  }

  burst(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.6, 2.6);
      this.fx.push(new Fx({ type: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rint(12, 24), col, size: 2 }));
    }
  }
  dust(x, n) {
    for (let i = 0; i < n; i++) this.fx.push(new Fx({ type: 'dust', x: x + rand(-10, 10), y: GROUND - 2, vx: rand(-0.6, 0.6), vy: -rand(0.1, 0.5), life: 20, col: '#d8d0c0', size: 3 }));
  }
  updateFx() {
    this.fx = this.fx.filter((e) => e.update());
    if (this.banner && ++this.banner.t > this.banner.life) this.banner = null;
    for (let i = 0; i < 2; i++) if (this.comboShow[i] && --this.comboShow[i].t <= 0) this.comboShow[i] = null;
    if (this.freeze > 0) this.superT = (this.superT || 0) + 1;
  }

  // ---------- drawing ----------
  draw(c) {
    const sx = this.shake ? Math.round(rand(-1, 1) * this.shake) : 0, sy = this.shake ? Math.round(rand(-1, 1) * this.shake * 0.6) : 0;
    c.save();
    c.translate(sx, sy);
    const cam = Math.round(this.camX);
    this.stage.draw(c, cam, this.time, this.excite);
    if (this.freeze > 0) {
      c.fillStyle = 'rgba(8,0,24,0.6)'; c.fillRect(-8, -8, W + 16, H + 16);
      const f = this.superBy;
      c.save(); c.translate(-cam, 0);
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63 + this.time * 0.05;
        c.strokeStyle = rgba(f.pal.fx, 0.35); c.lineWidth = 2;
        c.beginPath(); c.moveTo(f.x, f.y - 45); c.lineTo(f.x + Math.cos(a) * 300, f.y - 45 + Math.sin(a) * 300); c.stroke();
      }
      c.restore();
    }
    c.save(); c.translate(-cam, 0);
    for (const f of this.f) if (!f.hidden) drawShadow(c, f);
    const order = this.lastAtt === 0 ? [1, 0] : [0, 1];
    if (this.f[0].state === 'grabbing') order.splice(0, 2, 1, 0);
    if (this.f[1].state === 'grabbing') order.splice(0, 2, 0, 1);
    for (const i of order) drawFighter(c, this.f[i], this.time);
    for (const p of this.projs) drawProj(c, p, this.time);
    for (const e of this.fx) if (e.type !== 'text') e.draw(c);
    if (DEBUG.boxes) this.drawBoxes(c);
    c.restore();
    if (this.stage.drawFront) this.stage.drawFront(c, cam, this.time);
    c.save(); c.translate(-cam, 0);
    for (const e of this.fx) if (e.type === 'text') e.draw(c);
    c.restore();
    c.restore();
    this.drawHUD(c);
  }

  drawBoxes(c) {
    for (const f of this.f) {
      const h = f.hurtbox();
      if (h) { c.strokeStyle = '#0f0'; c.strokeRect(h.x, h.y, h.w, h.h); }
      if (f.state === 'attack' && f.move && !f.move.noBox && f.mt > f.move.s && f.mt <= f.move.s + f.move.a) {
        const b = f.box(f.move.box); c.strokeStyle = '#f00'; c.strokeRect(b.x, b.y, b.w, b.h);
      }
    }
    for (const p of this.projs) { const b = p.box(); c.strokeStyle = '#f0f'; c.strokeRect(b.x, b.y, b.w, b.h); }
  }

  drawHUD(c) {
    const bw = 148, bh = 9, by = 15;
    for (let i = 0; i < 2; i++) {
      const f = this.f[i];
      const x0 = i === 0 ? W / 2 - 16 - bw : W / 2 + 16;
      // frame
      c.fillStyle = OUT; c.fillRect(x0 - 2, by - 2, bw + 4, bh + 4);
      c.fillStyle = '#d4a83a'; c.fillRect(x0 - 1, by - 1, bw + 2, bh + 2);
      c.fillStyle = '#b01818'; c.fillRect(x0, by, bw, bh);
      const k = f.hp / f.maxHp, kd = f.dispHp / f.maxHp;
      const w1 = Math.round(bw * k), wd = Math.round(bw * kd);
      // P1 drains toward the center, P2 mirrored
      const low = k < 0.25 && this.time % 20 < 10;
      if (i === 0) {
        c.fillStyle = '#ffffff'; c.fillRect(x0 + bw - wd, by, wd, bh);
        c.fillStyle = low ? '#ff9a2a' : '#f8d830'; c.fillRect(x0 + bw - w1, by, w1, bh);
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x0 + bw - w1, by + 1, w1, 2);
      } else {
        c.fillStyle = '#ffffff'; c.fillRect(x0, by, wd, bh);
        c.fillStyle = low ? '#ff9a2a' : '#f8d830'; c.fillRect(x0, by, w1, bh);
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x0, by + 1, w1, 2);
      }
      // portrait
      const px = i === 0 ? 4 : W - 30;
      drawPortrait(c, f.ch, f.palIdx, px, 4, 26, 26, { flip: i === 1, zoom: 1.6, t: this.time });
      // name
      text(c, f.ch.name, i === 0 ? x0 : x0 + bw, by + bh + 3, { align: i === 0 ? 'left' : 'right', color: '#9ad8ff' });
      // round wins
      for (let w = 0; w < this.wins[i]; w++) {
        const wx = i === 0 ? W / 2 - 24 - w * 10 : W / 2 + 18 + w * 10;
        c.fillStyle = OUT; c.fillRect(wx - 1, by + bh + 3, 8, 8);
        c.fillStyle = '#ffe14a'; c.fillRect(wx, by + bh + 4, 6, 6);
        c.fillStyle = '#fff'; c.fillRect(wx + 1, by + bh + 5, 2, 2);
      }
      // super meter
      const mw = 80, mx = i === 0 ? 8 : W - 8 - mw, my = H - 13;
      c.fillStyle = OUT; c.fillRect(mx - 2, my - 2, mw + 4, 9);
      c.fillStyle = '#1a2a3a'; c.fillRect(mx, my, mw, 5);
      const full = f.meter >= 100;
      const mwid = Math.round(mw * f.meter / 100);
      c.fillStyle = full ? (this.time % 10 < 5 ? '#ffffff' : f.pal.fx) : '#3a8ad8';
      if (i === 0) c.fillRect(mx, my, mwid, 5); else c.fillRect(mx + mw - mwid, my, mwid, 5);
      text(c, full ? 'SUPER!' : 'SUPER', i === 0 ? mx : mx + mw, my - 10, { align: i === 0 ? 'left' : 'right', color: full ? '#ffe14a' : '#9ab' });
      // combo counter
      const cs = this.comboShow[i];
      if (cs) {
        const cxx = i === 0 ? 10 : W - 10;
        text(c, cs.n + ' HITS', cxx, 60, { size: 16, align: i === 0 ? 'left' : 'right', color: '#ffe14a', outline: '#a01818' });
        text(c, cs.n >= 8 ? 'INCREDIBLE!' : cs.n >= 5 ? 'GREAT!' : 'COMBO', cxx, 80, { align: i === 0 ? 'left' : 'right', color: '#fff' });
      }
    }
    // KO badge + timer
    c.fillStyle = OUT; c.fillRect(W / 2 - 15, by - 4, 30, 14);
    c.fillStyle = '#c01818'; c.fillRect(W / 2 - 14, by - 3, 28, 12);
    text(c, 'KO', W / 2 + 1, by - 1, { align: 'center', color: '#fff', outline: '#600' });
    const tstr = this.training ? '--' : String(this.timer).padStart(2, '0');
    text(c, tstr, W / 2, by + 12, { size: 16, align: 'center', color: this.timer <= 10 && !this.training ? '#ff5a3a' : '#ffd84a', outline: '#401000' });
    // coins earned this match
    if (this.rewardSide >= 0) text(c, 'C ' + fmt(this.coins), W / 2, H - 13, { align: 'center', color: '#ffd84a' });
    if (this.training) text(c, 'TRAINING  DUMMY: ' + (this.ai[1] ? this.ai[1].mode.toUpperCase() : 'P2'), W / 2, H - 24, { align: 'center', color: '#8ff8ff' });
    // banner
    if (this.banner) {
      const b = this.banner;
      const k = Math.min(1, b.t / 6);
      const sz = b.size;
      c.save();
      c.globalAlpha = b.t > b.life - 10 ? (b.life - b.t) / 10 : 1;
      const y = H / 2 - 30;
      text(c, b.str, W / 2 + (1 - k) * 60, y, { size: sz, align: 'center', color: b.col, outline: '#300' });
      if (b.sub) text(c, b.sub, W / 2, y + sz + 8, { size: 16, align: 'center', color: '#8ff8ff' });
      c.restore();
    }
    // super name
    if (this.freeze > 0 && this.superBy) {
      const f = this.superBy;
      const k = ease(Math.min(1, this.superT / 8));
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 44, W, 24);
      c.fillStyle = f.pal.fx; c.fillRect(0, 44, W * k, 1); c.fillRect(W * (1 - k), 67, W * k, 1);
      const side = f.side === 0 ? -1 : 1;
      drawPortrait(c, f.ch, f.palIdx, W / 2 + side * (W / 2 - 34) - 14, 40, 32, 32, { flip: f.side === 1, zoom: 2 });
      text(c, f.ch.moves.S.name, W / 2, 52, { size: 8, align: 'center', color: '#fff', outline: f.pal.fx === '#ffffff' ? '#000' : '#200' });
    }
  }
}
const DEBUG = { boxes: false };
