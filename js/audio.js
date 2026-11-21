'use strict';
// ---------- synthesized SFX + chiptune music (WebAudio, no assets) ----------
const Sound = {
  ctx: null, master: null, sfxG: null, musG: null,
  sfxOn: true, musicOn: true, voiceOn: true,
  curTrack: null, pendingTrack: null, timer: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.master = c.createGain(); this.master.gain.value = 0.55; this.master.connect(c.destination);
      this.sfxG = c.createGain(); this.sfxG.gain.value = 0.9; this.sfxG.connect(this.master);
      this.musG = c.createGain(); this.musG.gain.value = this.musicOn ? 0.3 : 0; this.musG.connect(this.master);
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingTrack) { const t = this.pendingTrack; this.pendingTrack = null; this.playMusic(t); }
    } catch (e) { this.ctx = null; }
  },

  osc(f, at, dur, type, vol, dest, slide) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest);
    o.start(at); o.stop(at + dur + 0.02);
  },
  nz(at, dur, vol, freq, dest, ftype = 'bandpass', q = 1) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(at, Math.random() * 0.5); s.stop(at + dur + 0.02);
  },
  tone(f, dur, type = 'square', vol = 0.15, slide = null, delay = 0) {
    if (!this.ctx || !this.sfxOn) return;
    this.osc(f, this.ctx.currentTime + delay, dur, type, vol, this.sfxG, slide);
  },
  noise(dur, vol = 0.2, freq = 2000, delay = 0, ftype = 'bandpass') {
    if (!this.ctx || !this.sfxOn) return;
    this.nz(this.ctx.currentTime + delay, dur, vol, freq, this.sfxG, ftype);
  },

  sfx(n) {
    if (!this.ctx || !this.sfxOn) return;
    switch (n) {
      case 'whoosh': this.noise(0.09, 0.08, 1400); break;
      case 'whoosh2': this.noise(0.16, 0.12, 900); break;
      case 'special': this.noise(0.18, 0.12, 1200); this.tone(260, 0.16, 'triangle', 0.08, 520); break;
      case 'light': this.noise(0.07, 0.35, 2200); this.tone(170, 0.06, 'square', 0.1, 70); break;
      case 'heavy': this.noise(0.2, 0.5, 800); this.tone(110, 0.18, 'sawtooth', 0.16, 35); break;
      case 'block': this.noise(0.06, 0.25, 5000, 0, 'highpass'); this.tone(700, 0.05, 'square', 0.06, 350); break;
      case 'parry':
        this.tone(1320, 0.22, 'triangle', 0.22); this.tone(1980, 0.3, 'sine', 0.16, null, 0.03);
        this.noise(0.05, 0.2, 7000, 0, 'highpass'); break;
      case 'proj': this.tone(220, 0.35, 'sawtooth', 0.08, 880); this.noise(0.3, 0.08, 1500); break;
      case 'grab': this.noise(0.1, 0.2, 600); this.tone(150, 0.1, 'square', 0.1, 90); break;
      case 'ko': this.tone(220, 1.1, 'sawtooth', 0.22, 30); this.noise(0.8, 0.35, 400); break;
      case 'land': this.noise(0.06, 0.12, 300); break;
      case 'jump': this.tone(180, 0.08, 'square', 0.04, 360); break;
      case 'select': this.tone(880, 0.05, 'square', 0.08); break;
      case 'confirm': this.tone(660, 0.07, 'square', 0.1); this.tone(990, 0.12, 'square', 0.1, null, 0.07); break;
      case 'back': this.tone(440, 0.08, 'square', 0.08, 220); break;
      case 'coin': this.tone(1320, 0.04, 'square', 0.05); this.tone(1760, 0.07, 'square', 0.05, null, 0.04); break;
      case 'buy': [0, 4, 7, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.1, 'square', 0.08, null, i * 0.05)); break;
      case 'error': this.tone(110, 0.2, 'square', 0.1, 90); break;
      case 'super':
        [0, 3, 7, 10, 12, 15, 19, 24].forEach((s, i) => this.tone(220 * Math.pow(2, s / 12), 0.12, 'sawtooth', 0.07, null, i * 0.035));
        this.noise(0.6, 0.15, 3000); break;
      case 'round': this.tone(90, 0.3, 'sine', 0.3, 40); this.noise(0.2, 0.3, 200); break;
      case 'counter': this.tone(990, 0.08, 'square', 0.08); this.tone(660, 0.1, 'square', 0.08, null, 0.06); break;
      case 'teleport': this.tone(1400, 0.15, 'sine', 0.1, 200); this.tone(300, 0.15, 'sine', 0.08, 1600, 0.12); break;
      case 'armor': this.tone(300, 0.1, 'square', 0.1, 600); this.noise(0.08, 0.2, 3000); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 0.16, 'square', 0.08, null, i * 0.1)); break;
    }
  },

  say(t) {
    if (!this.voiceOn) return;
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.rate = 0.9; u.pitch = 0.45; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice */ }
  },

  setMusic(on) {
    this.musicOn = on;
    if (this.musG) this.musG.gain.setTargetAtTime(on ? 0.3 : 0, this.ctx.currentTime, 0.1);
  },

  // ---------- music ----------
  TRACKS: {
    menu: { bpm: 112, root: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], seed: 3, lead: 'square', arp: 1, drums: 1 },
    select: { bpm: 132, root: 57, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], seed: 11, lead: 'square', arp: 1, drums: 2 },
    harbor: { bpm: 138, root: 52, mode: [0, 2, 4, 5, 7, 9, 10], prog: [0, 6, 3, 4], seed: 21, lead: 'square', arp: 0, drums: 2 },
    ruins: { bpm: 126, root: 50, mode: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 6, 4], seed: 33, lead: 'triangle', arp: 1, drums: 3 },
    neon: { bpm: 148, root: 53, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], seed: 47, lead: 'sawtooth', arp: 1, drums: 2 },
    frost: { bpm: 120, root: 57, mode: [0, 2, 3, 5, 7, 8, 11], prog: [0, 3, 4, 0], seed: 58, lead: 'square', arp: 1, drums: 1 },
    boss: { bpm: 160, root: 48, mode: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 0, 6], seed: 66, lead: 'sawtooth', arp: 1, drums: 3 },
    win: { bpm: 140, root: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], seed: 77, lead: 'square', arp: 1, drums: 1 },
  },

  build(def) {
    const r = rng(def.seed);
    const bars = 8, len = bars * 16;
    const sc = (deg, oct = 0) => {
      const n = def.mode.length;
      const o = Math.floor(deg / n);
      const i = ((deg % n) + n) % n;
      return def.root + def.mode[i] + 12 * (o + oct);
    };
    const lead = new Array(len).fill(null);
    let deg = 4 + Math.floor(r() * 3);
    for (let half = 0; half < 2; half++) {
      for (let s = 0; s < 64;) {
        const bar = Math.floor(s / 16);
        const chord = def.prog[bar % def.prog.length];
        const strong = s % 4 === 0;
        if (r() < (strong ? 0.75 : 0.35)) {
          if (strong && r() < 0.6) {
            const tones = [chord, chord + 2, chord + 4, chord + 7];
            deg = tones.reduce((a, b) => (Math.abs(b - deg) < Math.abs(a - deg) ? b : a));
          } else deg += choice([-2, -1, -1, 1, 1, 2, 3, -3]);
          deg = clamp(deg, 0, 12);
          const durS = choice([1, 2, 2, 3, 4]);
          lead[half * 64 + s] = { m: sc(deg, 1), d: durS };
          s += durS;
        } else s += 1;
      }
    }
    // second half: vary slightly
    return { def, len, lead, sc, stepDur: 60 / def.bpm / 4 };
  },

  playMusic(id) {
    if (!this.ctx) { this.pendingTrack = id; return; }
    if (this.curTrack === id) return;
    this.stopMusic();
    const def = this.TRACKS[id];
    if (!def) return;
    this.curTrack = id;
    const tr = this.build(def);
    let step = 0, next = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.15) {
        this.playStep(tr, step, next);
        next += tr.stepDur;
        step = (step + 1) % tr.len;
      }
    }, 30);
  },
  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.curTrack = null;
  },
  playStep(tr, step, at) {
    const d = tr.def, g = this.musG, sd = tr.stepDur;
    const bar = Math.floor(step / 16), s = step % 16;
    const chord = d.prog[bar % d.prog.length];
    const f = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // bass
    const bassPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1];
    if (bassPat[s]) {
      const m = tr.sc(chord, -1) + (s === 10 && bar % 2 ? 7 : 0);
      this.osc(f(m), at, sd * 1.8, 'triangle', 0.5, g);
      this.osc(f(m), at, sd * 0.9, 'square', 0.08, g);
    }
    // arp
    if (d.arp) {
      const tones = [chord, chord + 2, chord + 4, chord + 7];
      const m = tr.sc(tones[s % 4], 0);
      this.osc(f(m), at, sd * 0.7, 'square', 0.035, g);
    }
    // lead
    const n = tr.lead[step];
    if (n) {
      this.osc(f(n.m), at, sd * n.d * 0.95, d.lead, d.lead === 'sawtooth' ? 0.06 : 0.09, g);
      this.osc(f(n.m) * 1.005, at, sd * n.d * 0.95, 'square', 0.03, g);
    }
    // drums
    if (d.drums) {
      const kick = d.drums === 3 ? [0, 3, 6, 8, 11, 14] : d.drums === 2 ? [0, 6, 8, 10] : [0, 8];
      if (kick.includes(s)) this.osc(140, at, 0.14, 'sine', 0.6, g, 40);
      if (s === 4 || s === 12) this.nz(at, 0.14, 0.35, 1800, g);
      if (s % 2 === 0) this.nz(at, 0.03, 0.12, 8000, g, 'highpass');
    }
  },
};
