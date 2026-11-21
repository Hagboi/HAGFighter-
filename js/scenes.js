'use strict';
// ---------- scenes / UI ----------
const Game = {
  scene: null, t: 0,
  go(s) { this.scene = s; if (s.enter) s.enter(); },
};

function drawPosed(c, ch, palIdx, x, y, facing, sc, R, t, f) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(facing * sc, sc);
  renderBody(c, ch, ch.pals[palIdx] || ch.pals[0], R, { t, f });
  c.restore();
}
function idleR(ch, t) { return lerpR(resolve(ch, ch.idle[0]), resolve(ch, ch.idle[1]), (Math.sin(t * 0.08) + 1) / 2); }

function menuBg(c, t, c1 = '#0a0c4a', c2 = '#14062a') {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = -2; i < 14; i++) {
    const x = ((i * 40 + t * 0.4) % (W + 80)) - 40;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 16, 0); c.lineTo(x - 60, H); c.lineTo(x - 76, H); c.fill();
  }
  for (let i = 0; i < 24; i++) {
    const x = (i * 97 + t * (0.2 + (i % 3) * 0.1)) % W, y = H - ((i * 53 + t * (0.3 + (i % 4) * 0.1)) % H);
    c.fillStyle = i % 3 ? 'rgba(255,220,120,0.5)' : 'rgba(140,200,255,0.5)';
    c.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}
function coinHeader(c, y = 4) {
  text(c, 'C ' + fmt(Save.data.coins), W - 6, y, { align: 'right', color: '#ffd84a' });
  const inc = Save.income();
  if (inc > 0) text(c, '+' + fmt(inc) + '/S', W - 6, y + 10, { align: 'right', color: '#9ad8a0' });
}
function panel(c, x, y, w, h, col = 'rgba(0,0,20,0.6)', edge = '#d4a83a') {
  c.fillStyle = col; c.fillRect(x, y, w, h);
  c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function pips(c, x, y, n, max = 5, col = '#ffd84a') {
  for (let i = 0; i < max; i++) {
    c.fillStyle = OUT; c.fillRect(x + i * 6, y, 6, 6);
    c.fillStyle = i < n ? col : '#2a2a4a'; c.fillRect(x + i * 6 + 1, y + 1, 4, 4);
  }
}

// ===================== TITLE =====================
class TitleScene {
  enter() { this.t = 0; Sound.playMusic('menu'); STAGES[0].ensure(); }
  update() {
    this.t++;
    const n = Input.nav();
    if ((n.ok || n.start) && this.t > 10) { Sound.sfx('confirm'); Game.go(new MenuScene()); }
  }
  draw(c) {
    const t = this.t;
    STAGES[0].draw(c, (Math.sin(t * 0.003) + 1) / 2 * (STAGE_W - W), t, 0.2);
    c.fillStyle = 'rgba(10,0,30,0.45)'; c.fillRect(0, 0, W, H);
    drawPosed(c, CHAR.volta, 0, 70, GROUND + 6, 1, 1.5, idleR(CHAR.volta, t), t);
    drawPosed(c, CHAR.tala, 0, W - 70, GROUND + 6, -1, 1.5, idleR(CHAR.tala, t + 40), t);
    const bob = Math.sin(t * 0.05) * 2;
    gradText(c, 'HAG', W / 2, 30 + bob, 32, '#ff7a1a', '#ffd84a');
    gradText(c, 'FIGHTER', W / 2, 66 + bob, 32, '#ff3a3a', '#ffb02a');
    text(c, 'TOURNAMENT OF THE SIX', W / 2, 106, { align: 'center', color: '#9ad8ff' });
    if (Math.floor(t / 30) % 2 === 0) text(c, 'PRESS START', W / 2, 140, { align: 'center', color: '#fff', size: 8 });
    if (Save.offline > 1) text(c, 'YOUR DOJO EARNED ' + fmt(Save.offline) + ' COINS', W / 2, 160, { align: 'center', color: '#ffd84a' });
    text(c, 'WHILE YOU WERE AWAY', W / 2, 170, { align: 'center', color: Save.offline > 1 ? '#ffd84a' : 'rgba(0,0,0,0)', outline: Save.offline > 1 ? '#000' : false });
    text(c, 'ENTER / J TO START', W / 2, H - 12, { align: 'center', color: '#8a8aa8' });
  }
}

// ===================== MAIN MENU =====================
class MenuScene {
  constructor(sel = 0) { this.sel = sel; }
  enter() {
    this.t = 0; Input.merge = true; Sound.playMusic('menu');
    this.items = [
      { id: 'arcade', label: 'ARCADE', desc: 'Fight through 5 rivals, then face the boss. Clear to raise HEAT.' },
      { id: 'vscpu', label: 'VERSUS CPU', desc: 'One match against a CPU fighter of your choice. Half coins.' },
      { id: 'vs2p', label: 'VERSUS PLAYER', desc: 'Local 2 players. P2: arrows + numpad 1-6.' },
      { id: 'training', label: 'TRAINING', desc: 'Practice combos and parries against a dummy.' },
      { id: 'dojo', label: 'DOJO', desc: 'Spend coins on upgrades and students who earn coins for you.' },
      { id: 'howto', label: 'HOW TO PLAY', desc: 'Controls, parrying and every move list.' },
      { id: 'opts', label: 'OPTIONS', desc: 'Sound, voice and save data.' },
    ];
  }
  update() {
    this.t++;
    const n = Input.nav();
    if (n.u) { this.sel = (this.sel + this.items.length - 1) % this.items.length; Sound.sfx('select'); }
    if (n.d) { this.sel = (this.sel + 1) % this.items.length; Sound.sfx('select'); }
    const it = this.items[this.sel];
    if (it.id === 'arcade' && (n.l || n.r)) {
      Save.data.heat = clamp(Save.data.heat + (n.r ? 1 : -1), 1, Save.data.maxHeat);
      Sound.sfx('select');
    }
    if (n.back) { Sound.sfx('back'); Game.go(new TitleScene()); return; }
    if (n.ok) {
      Sound.sfx('confirm');
      switch (it.id) {
        case 'arcade': case 'vscpu': case 'vs2p': case 'training': Game.go(new SelectScene(it.id)); break;
        case 'dojo': Game.go(new DojoScene()); break;
        case 'howto': Game.go(new HowToScene()); break;
        case 'opts': Game.go(new OptionsScene()); break;
      }
    }
  }
  draw(c) {
    menuBg(c, this.t);
    gradText(c, 'HAG FIGHTER', 110, 8, 16, '#ff7a1a', '#ffd84a');
    coinHeader(c);
    const d = Save.data;
    text(c, 'SPIRIT ' + d.spirit + '   CLEARS ' + d.clears, 6, 30, { color: '#b8a8ff' });
    this.items.forEach((it, i) => {
      const y = 50 + i * 18, on = i === this.sel;
      if (on) { c.fillStyle = 'rgba(255,200,60,0.18)'; c.fillRect(20, y - 4, W - 40, 15); c.fillStyle = '#ffd84a'; c.fillRect(20, y - 4, 2, 15); }
      text(c, (on ? '> ' : '  ') + it.label, 30, y, { color: on ? '#ffd84a' : '#d8d8f0' });
      if (it.id === 'arcade') {
        const hs = '< HEAT ' + d.heat + ' ' + heatName(d.heat) + ' >';
        text(c, hs, W - 30, y, { align: 'right', color: on ? '#ff8a5a' : '#8a7a9a' });
      }
      if (it.id === 'dojo' && d.coins >= Math.min(...UPGRADES.map((u) => (d.up[u.id] < u.max ? Save.upCost(u) : 1e99)))) {
        if (this.t % 30 < 20) text(c, '!', 30 + (it.label.length + 3) * 8, y, { color: '#7aff7a' });
      }
    });
    panel(c, 10, H - 34, W - 20, 26);
    const lines = wrapText(this.items[this.sel].desc.toUpperCase(), 44);
    lines.forEach((l, i) => text(c, l, 16, H - 30 + i * 10, { color: '#cfe8ff' }));
  }
}

// ===================== CHARACTER SELECT =====================
class SelectScene {
  constructor(mode) { this.mode = mode; }
  enter() {
    this.t = 0;
    Input.merge = this.mode !== 'vs2p';
    Sound.playMusic('select');
    this.roster = PLAYABLE.slice();
    if (Save.data.bossUnlocked && this.mode !== 'arcade') this.roster.push('zerak');
    this.cur = [0, Math.min(1, this.roster.length - 1)];
    this.pal = [0, 0];
    this.locked = [false, false];
    this.need2 = this.mode !== 'arcade';
    this.p2human = this.mode === 'vs2p';
  }
  active() { return !this.locked[0] ? 0 : this.need2 && !this.locked[1] ? 1 : -1; }
  update() {
    this.t++;
    const players = this.p2human ? [0, 1] : [this.active()];
    for (const p of players) {
      if (p < 0) continue;
      const n = this.p2human ? Input.nav(p) : Input.nav();
      if (this.locked[p]) {
        if (n.back) { this.locked[p] = false; Sound.sfx('back'); }
        continue;
      }
      const len = this.roster.length;
      if (n.l) { this.cur[p] = (this.cur[p] + len - 1) % len; Sound.sfx('select'); this.pal[p] = 0; }
      if (n.r) { this.cur[p] = (this.cur[p] + 1) % len; Sound.sfx('select'); this.pal[p] = 0; }
      const id = this.roster[this.cur[p]];
      if (n.lk) {
        let np = this.pal[p];
        for (let k = 0; k < 3; k++) { np = (np + 1) % 3; if (Save.palUnlocked(id, np) || this.p2human) break; }
        this.pal[p] = np; Sound.sfx('select');
      }
      if (n.ok) {
        this.locked[p] = true; Sound.sfx('confirm');
        Sound.say(CHAR[id].name);
      } else if (n.back) {
        if (!this.p2human && p === 1) { this.locked[0] = false; Sound.sfx('back'); }
        else { Sound.sfx('back'); Game.go(new MenuScene()); return; }
      }
    }
    const done = this.locked[0] && (!this.need2 || this.locked[1]);
    if (done) {
      if (!this.doneT) this.doneT = this.t;
      if (this.t - this.doneT > 25) this.proceed();
    } else this.doneT = 0;
  }
  proceed() {
    const a = this.roster[this.cur[0]], b = this.roster[this.cur[1]];
    let pa = this.pal[0], pb = this.pal[1];
    if (a === b && pa === pb) pb = (pa + 1) % 3;
    if (this.mode === 'arcade') { Arcade.start(a, pa, Save.data.heat); return; }
    Game.go(new StageScene(this.mode, a, pa, b, pb));
  }
  draw(c) {
    const t = this.t;
    menuBg(c, t, '#06087a', '#020230');
    gradText(c, 'SELECT YOUR FIGHTER', W / 2, 5, 16, '#ff7a1a', '#ffd84a');
    if (this.mode === 'arcade') text(c, 'HEAT ' + Save.data.heat, W - 4, 26, { align: 'right', color: '#ff8a5a' });
    else text(c, this.mode === 'vs2p' ? 'VERSUS PLAYER' : this.mode === 'vscpu' ? 'VERSUS CPU' : 'TRAINING', W - 4, 26, { align: 'right', color: '#9ad8ff' });
    const n = this.roster.length, sz = 40, gap = 6;
    const x0 = Math.round(W / 2 - (n * (sz + gap) - gap) / 2), y0 = 36;
    this.roster.forEach((id, i) => {
      const ch = CHAR[id], x = x0 + i * (sz + gap);
      const hover0 = this.cur[0] === i, hover1 = this.need2 && (this.locked[0] || this.p2human) && this.cur[1] === i;
      drawPortrait(c, ch, 0, x, y0, sz, sz, { zoom: 1.9, t, frameCol: '#5a5aa0', bg1: '#2a2a8a', bg2: '#0a0a3a' });
      if (hover0) { c.strokeStyle = this.t % 16 < 8 || this.locked[0] ? '#ff3a3a' : '#ffa0a0'; c.lineWidth = 2; c.strokeRect(x - 1, y0 - 1, sz + 2, sz + 2); text(c, '1P', x + 1, y0 - 9, { color: '#ff5a5a' }); }
      if (hover1) { c.strokeStyle = this.t % 16 < 8 || this.locked[1] ? '#3a8aff' : '#a0c8ff'; c.lineWidth = 2; c.strokeRect(x - 2.5, y0 - 2.5, sz + 5, sz + 5); text(c, this.p2human ? '2P' : 'CPU', x + sz, y0 - 9, { color: '#5aa0ff', align: 'right' }); }
      text(c, ch.name, x + sz / 2, y0 + sz + 3, { align: 'center', color: '#ffb02a', size: 8 });
    });
    this.drawInfo(c, 0, 6);
    if (this.need2 && (this.locked[0] || this.p2human)) this.drawInfo(c, 1, W / 2 + 4);
    else if (this.need2) { panel(c, W / 2 + 4, 92, W / 2 - 10, 106); text(c, this.mode === 'training' ? 'PICK DUMMY NEXT' : 'PICK OPPONENT NEXT', W * 0.75, 140, { align: 'center', color: '#8a8aa8' }); }
    else {
      panel(c, W / 2 + 4, 92, W / 2 - 10, 106);
      const lines = ['ARCADE LADDER:', '5 RIVALS', '+ FINAL BOSS', '', 'COINS x' + (1 + 0.5 * (Save.data.heat - 1)).toFixed(1)];
      lines.forEach((l, i) => text(c, l, W * 0.75, 108 + i * 12, { align: 'center', color: i === 4 ? '#ffd84a' : '#cfe8ff' }));
    }
    text(c, 'J SELECT  L COLOR  K BACK', W / 2, H - 10, { align: 'center', color: '#8a8aa8' });
  }
  drawInfo(c, p, x0) {
    const id = this.roster[this.cur[p]], ch = CHAR[id], t = this.t, w = W / 2 - 10, y0 = 92;
    panel(c, x0, y0, w, 106, 'rgba(0,0,30,0.65)', p ? '#3a8aff' : '#ff3a3a');
    drawPortrait(c, ch, this.pal[p], x0 + 4, y0 + 4, 52, 52, { zoom: 3.4, t, flip: p === 1, bg1: p ? '#1a3a8a' : '#8a1a2a', bg2: '#0a0a2a' });
    text(c, ch.name, x0 + 62, y0 + 5, { size: 16, color: this.locked[p] ? '#ffd84a' : '#fff' });
    text(c, ch.origin, x0 + 62, y0 + 24, { color: '#9ad8ff' });
    text(c, ch.style, x0 + 62, y0 + 34, { color: '#ffb02a' });
    const rr = [['POW', ch.rating.pow], ['SPD', ch.rating.spd], ['RNG', ch.rating.rng], ['DEF', ch.rating.def]];
    rr.forEach(([l, v], i) => { const xx = x0 + 62 + (i % 2) * 58, yy = y0 + 45 + Math.floor(i / 2) * 9; text(c, l, xx, yy, { color: '#aaa' }); pips(c, xx + 25, yy + 1, v); });
    const m = Save.mastery(id);
    text(c, 'MASTERY ' + m.lv, x0 + 4, y0 + 63, { color: '#b8a8ff' });
    if (m.lv < 10) { c.fillStyle = '#2a2a4a'; c.fillRect(x0 + 80, y0 + 64, 22, 5); c.fillStyle = '#b8a8ff'; c.fillRect(x0 + 80, y0 + 64, Math.round(22 * m.xp / Save.xpNeed(m.lv)), 5); }
    const unlocked = [0, 1, 2].filter((i) => Save.palUnlocked(id, i) || this.p2human).length;
    text(c, 'COLOR ' + (this.pal[p] + 1) + '/' + unlocked, x0 + w - 4, y0 + 63, { color: '#9ab', align: 'right' });
    const lines = wrapText(ch.bio.toUpperCase(), 21).slice(0, 3);
    lines.forEach((l, i) => text(c, l, x0 + 4, y0 + 76 + i * 9, { color: '#d8d8f0' }));
    if (this.locked[p]) text(c, 'READY!', x0 + w - 4, y0 + 5, { align: 'right', color: '#7aff7a' });
  }
}

// ===================== STAGE SELECT =====================
class StageScene {
  constructor(mode, a, pa, b, pb) { Object.assign(this, { mode, a, pa, b, pb }); }
  enter() {
    this.t = 0; this.sel = CHAR[this.b].home;
    this.list = [0, 1, 2, 3].concat(Save.data.bossUnlocked ? [4] : []);
    this.list.push(-1);
    this.sel = this.list.indexOf(this.sel) >= 0 ? this.list.indexOf(this.sel) : 0;
    this.thumbs = this.list.map((i) => {
      if (i < 0) return null;
      const s = STAGES[i]; s.ensure();
      return mkLayer(W, H, (c) => s.draw(c, (STAGE_W - W) / 2, 0, 0));
    });
  }
  update() {
    this.t++;
    const n = Input.nav();
    const cols = 3;
    if (n.l) { this.sel = (this.sel + this.list.length - 1) % this.list.length; Sound.sfx('select'); }
    if (n.r) { this.sel = (this.sel + 1) % this.list.length; Sound.sfx('select'); }
    if (n.u) { this.sel = clamp(this.sel - cols, 0, this.list.length - 1); Sound.sfx('select'); }
    if (n.d) { this.sel = clamp(this.sel + cols, 0, this.list.length - 1); Sound.sfx('select'); }
    if (n.back) { Sound.sfx('back'); Game.go(new SelectScene(this.mode)); return; }
    if (n.ok) {
      Sound.sfx('confirm');
      let st = this.list[this.sel];
      if (st < 0) st = choice(this.list.filter((x) => x >= 0));
      startVersus(this.mode, this.a, this.pa, this.b, this.pb, st);
    }
  }
  draw(c) {
    menuBg(c, this.t, '#06087a', '#020230');
    gradText(c, 'SELECT STAGE', W / 2, 6, 16, '#ff7a1a', '#ffd84a');
    const tw = 112, th = 63, gx = 8, gy = 14;
    const x0 = (W - (3 * tw + 2 * gx)) / 2, y0 = 34;
    this.list.forEach((sid, i) => {
      const x = x0 + (i % 3) * (tw + gx), y = y0 + Math.floor(i / 3) * (th + gy);
      if (this.thumbs[i]) c.drawImage(this.thumbs[i], x, y, tw, th);
      else { c.fillStyle = '#1a1a3a'; c.fillRect(x, y, tw, th); text(c, '?', x + tw / 2, y + 22, { size: 16, align: 'center', color: '#ffd84a' }); }
      const on = i === this.sel;
      c.strokeStyle = on ? (this.t % 16 < 8 ? '#ffd84a' : '#fff') : '#5a5aa0'; c.lineWidth = on ? 2 : 1;
      c.strokeRect(x - 0.5, y - 0.5, tw + 1, th + 1);
      text(c, sid < 0 ? 'RANDOM' : STAGES[sid].name.split(' ')[0], x + tw / 2, y + th + 2, { align: 'center', color: on ? '#ffd84a' : '#cfe8ff' });
    });
    const sid = this.list[this.sel];
    text(c, sid < 0 ? 'RANDOM STAGE' : STAGES[sid].name, W / 2, H - 12, { align: 'center', color: '#fff' });
  }
}

function startVersus(mode, a, pa, b, pb, stage) {
  const vs2p = mode === 'vs2p', training = mode === 'training';
  const cfg = {
    mode, stage, training,
    coinMult: mode === 'vscpu' ? 0.5 : 1,
    p: [
      { id: a, pal: pa, mods: vs2p ? null : Save.playerMods(a) },
      vs2p ? { id: b, pal: pb } : { id: b, pal: pb, cpu: 1, level: training ? 1 : clamp(2 + Save.data.maxHeat, 3, 9), aiMode: training ? 'stand' : 'cpu' },
    ],
    after: (res) => {
      if (mode === 'vscpu' && res.winner === 0) Save.addXp(a, 60);
      Save.save();
      Game.go(new VsResultScene(cfg, res));
    },
  };
  if (training) Game.go(new FightScene(cfg));
  else Game.go(new VSScene(cfg, () => Game.go(new FightScene(cfg))));
}

// ===================== VS SCREEN =====================
class VSScene {
  constructor(cfg, next, info) { this.cfg = cfg; this.next = next; this.info = info; }
  enter() { this.t = 0; Sound.stopMusic(); Sound.sfx('super'); }
  update() {
    this.t++;
    const n = Input.nav();
    if (this.t > 150 || (this.t > 30 && n.ok)) this.next();
  }
  draw(c) {
    const t = this.t, [p1, p2] = this.cfg.p, a = CHAR[p1.id], b = CHAR[p2.id];
    const k = ease(Math.min(1, t / 20));
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    // diagonal halves
    c.fillStyle = '#7a1020';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W / 2 + 30, 0); c.lineTo(W / 2 - 30, H); c.lineTo(0, H); c.fill();
    c.fillStyle = '#102a7a';
    c.beginPath(); c.moveTo(W / 2 + 32, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W / 2 - 28, H); c.fill();
    for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(((i * 40 + t * 6) % (W + 40)) - 40, 20 + i * 15, 40, 2); }
    const ps = 120;
    drawPortrait(c, a, p1.pal, -ps + k * (ps + 20), 30, ps, ps, { zoom: 4.6, frame: false, bg1: 'rgba(0,0,0,0)', bg2: 'rgba(0,0,0,0)', t, hy: -0.2 });
    drawPortrait(c, b, p2.pal, W - k * (ps + 20), 30, ps, ps, { zoom: 4.6, frame: false, flip: true, bg1: 'rgba(0,0,0,0)', bg2: 'rgba(0,0,0,0)', t, hy: -0.2 });
    text(c, a.name, 24, 156, { size: 16, color: '#ffd84a' });
    text(c, a.origin, 24, 176, { color: '#ffd0d0' });
    text(c, b.name, W - 24, 156, { size: 16, color: '#ffd84a', align: 'right' });
    text(c, b.origin, W - 24, 176, { color: '#d0e0ff', align: 'right' });
    const vs = 32 + Math.max(0, 20 - t) * 2;
    gradText(c, 'VS', W / 2, H / 2 - vs / 2 - 10, Math.round(vs), '#ff3a1a', '#ffe14a');
    const st = STAGES[this.cfg.stage];
    text(c, st.name, W / 2, H - 14, { align: 'center', color: '#fff' });
    if (this.cfg.mode === 'arcade') {
      const r = Arcade.run;
      text(c, 'STAGE ' + (r.idx + 1) + ' / ' + r.ladder.length, W / 2, 6, { align: 'center', color: '#fff' });
      if (b.boss && t % 20 < 12) text(c, '!! FINAL BOSS !!', W / 2, 20, { align: 'center', color: '#ff3a3a' });
    }
  }
}

// ===================== FIGHT =====================
class FightScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    this.t = 0;
    Input.merge = this.cfg.mode !== 'vs2p';
    const cfg = Object.assign({}, this.cfg, { onEnd: (res) => { if (!this.result) { this.result = res; this.endT = 0; } } });
    this.match = new Match(cfg);
    this.paused = false; this.psel = 0;
    this.dummyModes = ['stand', 'block', 'parry', 'jump', 'cpu'];
  }
  update() {
    this.t++;
    if (this.result) {
      this.endT++;
      this.match.update([NOINPUT, NOINPUT]);
      if (this.endT > 50) { const r = this.result; this.result = null; this.cfg.after(r); }
      return;
    }
    const n0 = Input.nav(0), n1 = Input.nav(1);
    if (this.paused) { this.updatePause(); return; }
    if (n0.start || (this.cfg.mode === 'vs2p' && n1.start)) { this.paused = true; this.psel = 0; this.showMoves = false; Sound.sfx('select'); return; }
    this.match.update([Input.frame(0), Input.frame(1)]);
  }
  pauseItems() {
    const it = ['RESUME', 'MOVE LIST'];
    if (this.cfg.training) it.push('DUMMY');
    if (this.cfg.mode !== 'arcade') it.push('RESTART');
    it.push('QUIT');
    return it;
  }
  updatePause() {
    const n = Input.nav();
    const items = this.pauseItems();
    if (this.showMoves) { if (n.ok || n.back || n.start) this.showMoves = false; return; }
    if (n.u) { this.psel = (this.psel + items.length - 1) % items.length; Sound.sfx('select'); }
    if (n.d) { this.psel = (this.psel + 1) % items.length; Sound.sfx('select'); }
    const it = items[this.psel];
    if (it === 'DUMMY' && (n.l || n.r || n.ok)) {
      const ai = this.match.ai[1];
      if (ai) {
        const i = this.dummyModes.indexOf(ai.mode);
        ai.mode = this.dummyModes[(i + (n.l ? this.dummyModes.length - 1 : 1)) % this.dummyModes.length];
        ai.lv = 5; Sound.sfx('select');
      }
      return;
    }
    if (n.back || (n.start && !n.ok)) { this.paused = false; return; }
    if (n.ok) {
      Sound.sfx('confirm');
      if (it === 'RESUME') this.paused = false;
      if (it === 'MOVE LIST') this.showMoves = true;
      if (it === 'RESTART') this.enter();
      if (it === 'QUIT') { Save.save(); Game.go(new MenuScene()); }
    }
  }
  draw(c) {
    this.match.draw(c);
    if (this.paused) {
      c.fillStyle = 'rgba(0,0,20,0.7)'; c.fillRect(0, 0, W, H);
      if (this.showMoves) { drawMoveList(c, this.match.f[0].ch, 20); return; }
      gradText(c, 'PAUSE', W / 2, 40, 16, '#ff7a1a', '#ffd84a');
      this.pauseItems().forEach((it, i) => {
        let s = it;
        if (it === 'DUMMY') s = 'DUMMY: < ' + (this.match.ai[1] ? this.match.ai[1].mode.toUpperCase() : '-') + ' >';
        text(c, (i === this.psel ? '> ' : '  ') + s, W / 2 - 70, 78 + i * 16, { color: i === this.psel ? '#ffd84a' : '#fff' });
      });
    }
  }
}

function drawMoveList(c, ch, y0) {
  panel(c, 10, y0 - 6, W - 20, H - y0 - 4, 'rgba(0,0,30,0.85)');
  text(c, ch.name + ' - MOVE LIST', W / 2, y0, { align: 'center', color: '#ffd84a' });
  const rows = [
    ['A', ch.moves.A.name], ['B', ch.moves.B.name], ['C', ch.moves.C.name], ['S', ch.moves.S.name],
  ];
  rows.forEach(([k, name], i) => {
    const y = y0 + 18 + i * 24;
    text(c, name.toUpperCase(), 20, y, { color: k === 'S' ? '#ff8a5a' : '#fff' });
    text(c, MOVE_INPUTS[k], 28, y + 10, { color: '#9ad8ff' });
  });
  const y = y0 + 18 + 4 * 24 + 4;
  text(c, 'THROW: LIGHT+KICK CLOSE', 20, y, { color: '#cfe8ff' });
  text(c, 'PARRY: TAP PARRY AS A HIT LANDS', 20, y + 10, { color: '#8ff8ff' });
  text(c, 'SP = SPECIAL BUTTON (I)', 20, y + 20, { color: '#8a8aa8' });
}

// ===================== RESULTS =====================
class VsResultScene {
  constructor(cfg, res) { this.cfg = cfg; this.res = res; }
  enter() { this.t = 0; Sound.playMusic('win'); }
  update() {
    this.t++;
    const n = Input.nav();
    if (this.t > 30 && n.ok) {
      Sound.sfx('confirm');
      const p = this.cfg.p;
      Game.go(new VSScene(this.cfg, () => Game.go(new FightScene(this.cfg))));
      void p;
    }
    if (this.t > 30 && n.back) { Sound.sfx('back'); Game.go(new MenuScene()); }
  }
  draw(c) {
    menuBg(c, this.t);
    const w = this.res.winner;
    const wch = w >= 0 ? CHAR[this.cfg.p[w].id] : null;
    if (wch) {
      drawPosed(c, wch, this.cfg.p[w].pal, W / 2, 170, 1, 1.4, lerpR(resolve(wch, P.win), resolve(wch, P.win2), (Math.sin(this.t * 0.1) + 1) / 2), this.t);
      gradText(c, (this.cfg.mode === 'vs2p' ? (w === 0 ? '1P' : '2P') : w === 0 ? 'YOU' : 'CPU') + ' WIN', W / 2, 10, 16, '#ff7a1a', '#ffd84a');
      text(c, '"' + wch.win + '"', W / 2, 32, { align: 'center', color: '#cfe8ff' });
    } else gradText(c, 'DRAW', W / 2, 10, 16, '#ff7a1a', '#ffd84a');
    if (this.res.coins) text(c, 'COINS +' + fmt(this.res.coins), W / 2, 180, { align: 'center', color: '#ffd84a' });
    text(c, 'J REMATCH   K MENU', W / 2, H - 12, { align: 'center', color: '#8a8aa8' });
  }
}

// ===================== ARCADE =====================
const Arcade = {
  run: null,
  start(p1, pal, heat) {
    const others = shuffle(PLAYABLE.filter((i) => i !== p1));
    this.run = { p1, pal, heat, ladder: [...others, 'zerak'], idx: 0, coins: 0, continues: 0, stats: { hits: 0, parries: 0, maxCombo: 0, perfects: 0 } };
    this.next();
  },
  cfg() {
    const r = this.run, opp = r.ladder[r.idx], boss = opp === 'zerak';
    const lv = clamp(Math.round(1 + r.idx * 0.9 + (r.heat - 1) * 1.5) + (boss ? 2 : 0), 1, 12);
    const hpM = 1 + 0.12 * (r.heat - 1) + 0.03 * r.idx, dmgM = 1 + 0.1 * (r.heat - 1) + 0.02 * r.idx;
    return {
      mode: 'arcade', stage: CHAR[opp].home, coinMult: 1 + 0.5 * (r.heat - 1),
      p: [
        { id: r.p1, pal: r.pal, mods: Save.playerMods(r.p1) },
        { id: opp, pal: opp === r.p1 ? (r.pal + 1) % 3 : 0, cpu: 1, level: lv, mods: { hp: hpM * (boss ? 1.25 : 1), dmg: dmgM * (boss ? 1.1 : 1), def: boss ? 0.9 : 1, meter: 1 + 0.08 * r.heat } },
      ],
      after: (res) => this.end(res),
    };
  },
  next() {
    const cfg = this.cfg();
    Game.go(new VSScene(cfg, () => Game.go(new FightScene(cfg))));
  },
  end(res) {
    const r = this.run;
    r.coins += res.coins;
    for (const k of ['hits', 'parries', 'perfects']) r.stats[k] += res.stats[k] || 0;
    r.stats.maxCombo = Math.max(r.stats.maxCombo, res.stats.maxCombo || 0);
    if (res.winner === 0) {
      const lvUp = Save.addXp(r.p1, Math.round(100 * (1 + 0.5 * (r.heat - 1))));
      r.idx++;
      Save.save();
      if (r.idx >= r.ladder.length) Game.go(new EndingScene());
      else Game.go(new ArcadeResultScene(res, lvUp));
    } else {
      Save.addXp(r.p1, 30);
      Save.save();
      Game.go(new ContinueScene());
    }
  },
};

class ArcadeResultScene {
  constructor(res, lvUp) { this.res = res; this.lvUp = lvUp; }
  enter() { this.t = 0; Sound.playMusic('win'); Sound.sfx('win'); }
  update() {
    this.t++;
    if (this.t > 40 && Input.nav().ok) { Sound.sfx('confirm'); Arcade.next(); }
  }
  draw(c) {
    const r = Arcade.run, ch = CHAR[r.p1], t = this.t;
    menuBg(c, t, '#2a0a3a', '#0a0420');
    drawPosed(c, ch, r.pal, 80, 196, 1, 1.5, lerpR(resolve(ch, P.win), resolve(ch, P.win2), (Math.sin(t * 0.1) + 1) / 2), t);
    gradText(c, 'VICTORY!', 250, 10, 16, '#ff7a1a', '#ffd84a');
    text(c, '"' + ch.win + '"', W / 2, 32, { align: 'center', color: '#cfe8ff' });
    panel(c, 160, 48, 214, 120);
    const rows = (this.res.breakdown || []).slice();
    const hitCoins = Math.max(0, this.res.coins - rows.reduce((a, b) => a + b[1], 0));
    if (hitCoins > 0) rows.unshift(['HITS & COMBOS', hitCoins]);
    let shown = Math.min(rows.length, Math.floor(t / 12));
    rows.slice(0, shown).forEach(([l, v], i) => {
      text(c, l, 168, 56 + i * 12, { color: '#d8d8f0' });
      text(c, '+' + fmt(v), 366, 56 + i * 12, { align: 'right', color: '#ffd84a' });
    });
    if (shown >= rows.length) {
      text(c, 'TOTAL', 168, 150, { color: '#fff' });
      text(c, fmt(this.res.coins), 366, 150, { align: 'right', color: '#ffd84a' });
    }
    const m = Save.mastery(r.p1);
    text(c, 'MASTERY LV ' + m.lv + (this.lvUp ? '  LEVEL UP!' : ''), 168, 174, { color: this.lvUp ? '#7aff7a' : '#b8a8ff' });
    text(c, 'NEXT: ' + CHAR[r.ladder[r.idx]].name, 168, 188, { color: '#ff8a5a' });
    if (t > 40 && t % 40 < 28) text(c, 'PRESS J', W - 8, H - 12, { align: 'right', color: '#fff' });
  }
}

class ContinueScene {
  enter() { this.t = 0; this.count = 10; Sound.playMusic('frost'); }
  update() {
    this.t++;
    const n = Input.nav();
    if (this.t % 60 === 0) { this.count--; Sound.sfx('select'); }
    if (n.ok && this.t > 20) { Sound.sfx('confirm'); Arcade.run.continues++; Arcade.next(); return; }
    if (n.back && this.t > 20) this.count = -1;
    if (n.lk) this.t += 30;
    if (this.count < 0) { Save.save(); Game.go(new GameOverScene()); }
  }
  draw(c) {
    const r = Arcade.run, ch = CHAR[r.p1];
    c.fillStyle = '#05030a'; c.fillRect(0, 0, W, H);
    drawPosed(c, ch, r.pal, W / 2 - 80, 200, 1, 1.4, resolve(ch, P.lose), this.t, { state: 'hitstun' });
    gradText(c, 'CONTINUE?', W / 2 + 50, 40, 16, '#ff3a1a', '#ffd84a');
    gradText(c, String(Math.max(0, this.count)), W / 2 + 50, 80, 32, '#ff3a1a', '#ffe14a');
    text(c, 'J: CONTINUE', W / 2 + 50, 140, { align: 'center', color: '#fff' });
    text(c, 'COINS KEPT: ' + fmt(r.coins), W / 2 + 50, 156, { align: 'center', color: '#ffd84a' });
    text(c, 'TIP: UPGRADE IN THE DOJO!', W / 2 + 50, 176, { align: 'center', color: '#9ad8ff' });
  }
}
class GameOverScene {
  enter() { this.t = 0; Sound.stopMusic(); Sound.say('Game over'); }
  update() { this.t++; if (this.t > 150 || (this.t > 30 && Input.nav().ok)) Game.go(new MenuScene()); }
  draw(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    gradText(c, 'GAME OVER', W / 2, H / 2 - 16, 32, '#a01010', '#ff5a3a');
  }
}

class EndingScene {
  enter() {
    this.t = 0;
    const r = Arcade.run, d = Save.data;
    this.bonus = Math.round(1000 * r.heat * (1 + 0.5 * (r.heat - 1)) * Save.coinMult());
    Save.add(this.bonus);
    this.newHeat = r.heat === d.maxHeat;
    if (this.newHeat) { d.maxHeat++; d.heat = d.maxHeat; }
    this.firstClear = !d.bossUnlocked;
    d.bossUnlocked = true;
    d.clears++;
    Save.addXp(r.p1, 300);
    Save.save();
    STAGES[CHAR[r.p1].home].ensure();
    Sound.playMusic('win');
    Sound.say('Congratulations');
  }
  update() {
    this.t++;
    if (this.t > 120 && Input.nav().ok) { Sound.sfx('confirm'); Game.go(new MenuScene()); }
  }
  draw(c) {
    const r = Arcade.run, ch = CHAR[r.p1], t = this.t;
    const st = STAGES[CHAR[r.p1].home];
    st.draw(c, (STAGE_W - W) / 2, t, 0.8);
    c.fillStyle = 'rgba(0,0,20,0.55)'; c.fillRect(0, 0, W, H);
    drawPosed(c, ch, r.pal, 80, GROUND, 1, 1.3, lerpR(resolve(ch, P.win), resolve(ch, P.win2), (Math.sin(t * 0.1) + 1) / 2), t);
    gradText(c, 'ARCADE CLEAR!', 250, 10, 16, '#ff7a1a', '#ffd84a');
    text(c, 'HEAT ' + r.heat + ' ' + heatName(r.heat), 250, 30, { align: 'center', color: '#ff8a5a' });
    const shown = Math.floor(t / 3);
    let used = 0;
    ch.ending.forEach((l, i) => {
      const s = l.slice(0, Math.max(0, shown - used));
      used += l.length;
      text(c, s, 150, 52 + i * 12, { color: '#fff' });
    });
    if (t > 90) {
      text(c, 'CLEAR BONUS +' + fmt(this.bonus), 150, 112, { color: '#ffd84a' });
      text(c, 'RUN COINS +' + fmt(r.coins), 150, 124, { color: '#ffd84a' });
      if (this.newHeat) text(c, 'HEAT ' + Save.data.maxHeat + ' UNLOCKED!', 150, 140, { color: '#ff5a3a' });
      if (this.firstClear) text(c, 'ZERAK + CITADEL UNLOCKED!', 150, 152, { color: '#c06aff' });
      if (Save.canAscend() && Save.data.ascensions === 0) text(c, 'ASCENSION AVAILABLE IN DOJO', 150, 164, { color: '#8ff8ff' });
    }
    if (t > 120 && t % 40 < 28) text(c, 'PRESS J', W - 8, H - 12, { align: 'right', color: '#fff' });
  }
}

// ===================== DOJO (incremental hub) =====================
class DojoScene {
  enter() { this.t = 0; this.tab = 0; this.sel = 0; this.holdT = 0; this.confirmAsc = 0; Sound.playMusic('menu'); }
  rows() { return this.tab === 0 ? UPGRADES.length : this.tab === 1 ? STUDENTS.length : 1; }
  buy() {
    if (this.tab === 0) return Save.buyUp(UPGRADES[this.sel]);
    if (this.tab === 1) return Save.buySt(this.sel);
    return false;
  }
  update() {
    this.t++;
    const n = Input.nav(), h = Input.held();
    if (n.back) { Sound.sfx('back'); Save.save(); Game.go(new MenuScene(4)); return; }
    if (n.l || n.r) { this.tab = (this.tab + (n.r ? 1 : 2)) % 3; this.sel = 0; this.confirmAsc = 0; Sound.sfx('select'); }
    if (n.u) { this.sel = (this.sel + this.rows() - 1) % this.rows(); Sound.sfx('select'); }
    if (n.d) { this.sel = (this.sel + 1) % this.rows(); Sound.sfx('select'); }
    if (this.tab === 2) {
      if (n.ok) {
        if (!Save.canAscend() || Save.spiritGain() < 1) { Sound.sfx('error'); return; }
        if (++this.confirmAsc >= 2) { Save.ascend(); Sound.sfx('super'); this.confirmAsc = 0; this.flash = 30; }
        else Sound.sfx('select');
      }
      return;
    }
    const holding = h.lp || h.ok;
    this.holdT = holding ? this.holdT + 1 : 0;
    if (n.ok || (this.holdT > 20 && this.holdT % 5 === 0)) {
      if (this.buy()) { Sound.sfx('buy'); this.flashRow = 10; } else if (n.ok) Sound.sfx('error');
    }
    if (this.flashRow > 0) this.flashRow--;
    if (this.flash > 0) this.flash--;
  }
  draw(c) {
    const d = Save.data, t = this.t;
    menuBg(c, t, '#1a0c2a', '#06040e');
    gradText(c, 'DOJO', 40, 6, 16, '#ff7a1a', '#ffd84a');
    text(c, 'C ' + fmt(d.coins), W / 2 + 10, 6, { align: 'center', color: '#ffd84a', size: 16 });
    text(c, '+' + fmt(Save.income()) + ' / SEC', W - 6, 6, { align: 'right', color: '#9ad8a0' });
    text(c, 'x' + Save.coinMult().toFixed(2) + ' COINS', W - 6, 16, { align: 'right', color: '#b8a8ff' });
    const tabs = ['UPGRADES', 'STUDENTS', 'ASCEND'];
    tabs.forEach((tb, i) => {
      const x = 8 + i * 126, on = i === this.tab;
      c.fillStyle = on ? '#d4a83a' : 'rgba(255,255,255,0.08)'; c.fillRect(x, 28, 120, 13);
      text(c, tb, x + 60, 31, { align: 'center', color: on ? '#200' : '#aaa', outline: on ? false : '#000' });
    });
    c.fillStyle = '#d4a83a'; c.fillRect(8, 41, W - 16, 1);
    if (this.tab === 0) {
      UPGRADES.forEach((u, i) => {
        const y = 48 + i * 18, on = i === this.sel, lv = d.up[u.id], maxed = lv >= u.max, cost = Save.upCost(u);
        if (on) { c.fillStyle = this.flashRow ? 'rgba(120,255,120,0.25)' : 'rgba(255,200,60,0.15)'; c.fillRect(8, y - 3, W - 16, 16); }
        text(c, u.name, 14, y, { color: on ? '#ffd84a' : '#fff' });
        c.fillStyle = '#2a2a4a'; c.fillRect(140, y + 2, 80, 4);
        c.fillStyle = '#7aff7a'; c.fillRect(140, y + 2, Math.round(80 * lv / u.max), 4);
        text(c, lv + '/' + u.max, 226, y, { color: '#b8a8ff' });
        text(c, maxed ? 'MAX' : fmt(cost), W - 14, y, { align: 'right', color: maxed ? '#7aff7a' : d.coins >= cost ? '#ffd84a' : '#a05050' });
      });
      const u = UPGRADES[this.sel];
      panel(c, 8, H - 34, W - 16, 28);
      text(c, u.desc.toUpperCase(), 14, H - 29, { color: '#cfe8ff' });
      text(c, 'J BUY (HOLD)  < > TABS  K BACK', 14, H - 17, { color: '#8a8aa8' });
    } else if (this.tab === 1) {
      STUDENTS.forEach((s, i) => {
        const y = 48 + i * 18, on = i === this.sel, cost = Save.stCost(i), own = d.students[i];
        if (on) { c.fillStyle = this.flashRow ? 'rgba(120,255,120,0.25)' : 'rgba(255,200,60,0.15)'; c.fillRect(8, y - 3, W - 16, 16); }
        text(c, s.name, 14, y, { color: on ? '#ffd84a' : '#fff' });
        text(c, 'x' + own, 130, y, { color: '#b8a8ff' });
        text(c, '+' + fmt(s.rate * Save.coinMult()) + '/S', 180, y, { color: '#9ad8a0' });
        text(c, fmt(cost), W - 14, y, { align: 'right', color: d.coins >= cost ? '#ffd84a' : '#a05050' });
        // little trainee sprites
        for (let k = 0; k < Math.min(own, 6); k++) {
          const bx = 270 + k * 7, by = y + 7 + (Math.sin(t * 0.2 + k + i) > 0.6 ? -2 : 0);
          c.fillStyle = ['#efe6d6', '#d8323c', '#2fa84f', '#3a6ad8', '#d4a83a', '#c06aff'][i];
          c.fillRect(bx, by - 6, 4, 6);
          c.fillStyle = '#e8b898'; c.fillRect(bx, by - 9, 4, 3);
        }
      });
      panel(c, 8, H - 34, W - 16, 28);
      text(c, 'STUDENTS TRAIN NONSTOP AND PAY TUITION,', 14, H - 29, { color: '#cfe8ff' });
      text(c, 'EVEN WHILE YOU ARE AWAY (50%, 8H MAX).', 14, H - 17, { color: '#cfe8ff' });
    } else {
      const can = Save.canAscend(), gain = Save.spiritGain();
      if (this.flash) { c.fillStyle = 'rgba(200,160,255,' + this.flash / 40 + ')'; c.fillRect(0, 0, W, H); }
      const lines = [
        ['SPIRIT: ' + d.spirit, '#c06aff'],
        ['EACH SPIRIT: +10% COINS, +2% DAMAGE', '#cfe8ff'],
        ['', ''],
        ['ASCENDING RESETS COINS, UPGRADES', '#ffb0b0'],
        ['AND STUDENTS. HEAT, MASTERY AND', '#ffb0b0'],
        ['UNLOCKS ARE KEPT.', '#ffb0b0'],
        ['', ''],
        [can ? 'YOU WOULD GAIN ' + gain + ' SPIRIT' : 'CLEAR ARCADE AT HEAT 2 TO UNLOCK', can ? '#7aff7a' : '#a05050'],
        [can ? '(EARN MORE COINS FOR MORE SPIRIT)' : '', '#8a8aa8'],
      ];
      lines.forEach(([l, col], i) => text(c, l, W / 2, 50 + i * 12, { align: 'center', color: col }));
      if (can && gain > 0) text(c, this.confirmAsc ? 'PRESS J AGAIN TO ASCEND' : 'PRESS J TO ASCEND', W / 2, 172, { align: 'center', color: t % 30 < 20 ? '#ffd84a' : '#fff' });
      text(c, 'ASCENSIONS: ' + d.ascensions, W / 2, 190, { align: 'center', color: '#8a8aa8' });
    }
  }
}

// ===================== HOW TO PLAY =====================
class HowToScene {
  enter() { this.t = 0; this.page = 0; }
  pages() { return 2 + PLAYABLE.length + (Save.data.bossUnlocked ? 1 : 0); }
  update() {
    this.t++;
    const n = Input.nav();
    if (n.l) { this.page = (this.page + this.pages() - 1) % this.pages(); Sound.sfx('select'); }
    if (n.r || n.ok) { this.page = (this.page + 1) % this.pages(); Sound.sfx('select'); }
    if (n.back) { Sound.sfx('back'); Game.go(new MenuScene(5)); }
  }
  draw(c) {
    menuBg(c, this.t);
    text(c, '< ' + (this.page + 1) + '/' + this.pages() + ' >', W - 6, 6, { align: 'right', color: '#8a8aa8' });
    if (this.page === 0) {
      gradText(c, 'CONTROLS', W / 2, 6, 16, '#ff7a1a', '#ffd84a');
      const rows = [
        ['', 'P1 KEYS', 'P2 KEYS'],
        ['MOVE', 'W A S D', 'ARROWS'],
        ['LIGHT', 'J', 'NUM 1'],
        ['HEAVY', 'K', 'NUM 2'],
        ['KICK', 'L', 'NUM 3'],
        ['PARRY', 'U', 'NUM 4'],
        ['SPECIAL', 'I', 'NUM 5'],
        ['SUPER', 'O', 'NUM 6'],
        ['PAUSE', 'ENTER/ESC', 'NUM ENTER'],
      ];
      rows.forEach((r, i) => {
        const y = 32 + i * 14;
        text(c, r[0], 30, y, { color: '#ffd84a' });
        text(c, r[1], 140, y, { color: i ? '#fff' : '#ff8a5a' });
        text(c, r[2], 260, y, { color: i ? '#fff' : '#5aa0ff' });
      });
      text(c, 'SOLO: ARROWS ALSO MOVE P1. GAMEPADS', W / 2, 166, { align: 'center', color: '#9ad8ff' });
      text(c, 'AND TOUCH CONTROLS ARE SUPPORTED.', W / 2, 178, { align: 'center', color: '#9ad8ff' });
    } else if (this.page === 1) {
      gradText(c, 'FIGHT SYSTEM', W / 2, 6, 16, '#ff7a1a', '#ffd84a');
      const lines = [
        ['BLOCK', 'HOLD BACK. CROUCH-BLOCK LOWS,', '#fff'], ['', 'STAND-BLOCK JUMP-INS & OVERHEADS.', '#cfe8ff'],
        ['PARRY', 'TAP PARRY JUST BEFORE A HIT.', '#8ff8ff'], ['', 'NO DAMAGE, YOU RECOVER INSTANTLY', '#cfe8ff'], ['', 'AND GAIN METER. WORKS ON ANYTHING', '#cfe8ff'], ['', 'EXCEPT THROWS. MISSING IS RISKY!', '#cfe8ff'],
        ['SPECIAL', 'SP / SP+FWD / SP+UP, OR MOTIONS', '#fff'],
        ['CANCEL', 'LIGHTS CHAIN, HITS CANCEL TO SPECIALS', '#fff'],
        ['SUPER', 'FULL METER + SUPER BUTTON', '#ffd84a'],
        ['THROW', 'LIGHT+KICK UP CLOSE', '#fff'],
        ['COINS', 'EARNED FROM HITS, COMBOS, PARRIES,', '#ffd84a'], ['', 'ROUNDS. SPEND THEM IN THE DOJO.', '#cfe8ff'],
      ];
      lines.forEach(([a, b, col], i) => {
        const y = 30 + i * 13;
        text(c, a, 12, y, { color: '#ff8a5a' });
        text(c, b, 84, y, { color: col });
      });
    } else {
      const ids = PLAYABLE.concat(Save.data.bossUnlocked ? ['zerak'] : []);
      const ch = CHAR[ids[this.page - 2]];
      drawMoveList(c, ch, 20);
      drawPortrait(c, ch, 0, W - 72, 34, 52, 52, { zoom: 3.4, t: this.t, flip: true });
    }
    text(c, '< > PAGE   K BACK', W / 2, H - 10, { align: 'center', color: '#8a8aa8' });
  }
}

// ===================== OPTIONS =====================
class OptionsScene {
  enter() { this.t = 0; this.sel = 0; this.reset = 0; }
  items() {
    const s = Save.data.settings;
    return [
      ['MUSIC', s.music ? 'ON' : 'OFF'], ['SOUND FX', s.sfx ? 'ON' : 'OFF'], ['ANNOUNCER', s.voice ? 'ON' : 'OFF'],
      ['HITBOXES', DEBUG.boxes ? 'ON' : 'OFF'], ['RESET SAVE', this.reset ? 'PRESS ' + (3 - this.reset) + ' MORE' : ''], ['BACK', ''],
    ];
  }
  update() {
    this.t++;
    const n = Input.nav(), it = this.items(), s = Save.data.settings;
    if (n.u) { this.sel = (this.sel + it.length - 1) % it.length; this.reset = 0; Sound.sfx('select'); }
    if (n.d) { this.sel = (this.sel + 1) % it.length; this.reset = 0; Sound.sfx('select'); }
    if (n.back) { Save.save(); Game.go(new MenuScene(6)); return; }
    if (n.ok || n.l || n.r) {
      switch (this.sel) {
        case 0: s.music = !s.music; Sound.setMusic(s.music); break;
        case 1: s.sfx = !s.sfx; Sound.sfxOn = s.sfx; break;
        case 2: s.voice = !s.voice; Sound.voiceOn = s.voice; break;
        case 3: DEBUG.boxes = !DEBUG.boxes; break;
        case 4: if (n.ok && ++this.reset >= 3) { Save.reset(); Save.offline = 0; this.reset = 0; Sound.sfx('back'); } break;
        case 5: if (n.ok) { Save.save(); Game.go(new MenuScene(6)); return; } break;
      }
      Sound.sfx('select');
      Save.save();
    }
  }
  draw(c) {
    menuBg(c, this.t);
    gradText(c, 'OPTIONS', W / 2, 10, 16, '#ff7a1a', '#ffd84a');
    this.items().forEach(([l, v], i) => {
      const y = 50 + i * 20, on = i === this.sel;
      text(c, (on ? '> ' : '  ') + l, 60, y, { color: on ? '#ffd84a' : '#fff' });
      text(c, v, W - 60, y, { align: 'right', color: i === 4 ? '#ff5a5a' : '#9ad8ff' });
    });
  }
}
