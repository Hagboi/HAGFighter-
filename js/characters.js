'use strict';
// ---------- skeletal pose library + roster ----------
// Angles: 0 = pointing down, 90 = forward, 180 = up, -90 = backward.
// Legs: F(x,y) = foot target solved with IK; A(thigh,shin) = explicit angles.
const F = (x, y = 0) => ({ f: [x, y] });
const A = (u, l) => ({ a: [u, l] });
function pose(o) {
  return Object.assign({ hip: [0, -3], t: 10, h: 0, ba: [55, 150], fa: [35, 140], bl: F(-11), fl: F(9) }, o);
}

const P = {
  idle0: pose({}),
  idle1: pose({ hip: [0, -4.5], t: 12, h: 2, ba: [58, 152], fa: [38, 143] }),
  walk: [
    pose({ bl: F(-13), fl: F(11) }),
    pose({ hip: [1, -1.5], bl: F(-2, 4), fl: F(4) }),
    pose({ bl: F(9), fl: F(-9) }),
    pose({ hip: [1, -1.5], bl: F(2), fl: F(-3, 4) }),
  ],
  crouch: pose({ hip: [2, -15], t: 24, h: -6, ba: [60, 150], fa: [45, 148], bl: F(-12), fl: F(12) }),
  prejump: pose({ hip: [0, -9], t: 14, bl: F(-10), fl: F(10) }),
  jumpUp: pose({ hip: [0, 0], t: 4, ba: [100, 160], fa: [70, 165], bl: A(10, -5), fl: A(30, 10) }),
  jumpTuck: pose({ hip: [0, 0], t: 18, ba: [80, 150], fa: [60, 150], bl: A(70, -30), fl: A(100, -10) }),
  jumpFall: pose({ hip: [0, 0], t: 6, ba: [90, 140], fa: [60, 140], bl: A(5, -10), fl: A(40, 5) }),
  land: pose({ hip: [1, -10], t: 18, bl: F(-11), fl: F(11) }),
  guard: pose({ hip: [-2, -4], t: -2, h: -8, ba: [80, 168], fa: [60, 172], bl: F(-14), fl: F(6) }),
  cguard: pose({ hip: [0, -15], t: 12, h: -8, ba: [80, 165], fa: [65, 172], bl: F(-12), fl: F(10) }),
  hit: pose({ hip: [-4, -3], t: -22, h: -25, ba: [-20, 20], fa: [10, 40], bl: F(-12), fl: F(8) }),
  hit2: pose({ hip: [-3, -7], t: 20, h: 25, ba: [-30, -10], fa: [0, 30], bl: F(-14), fl: F(6) }),
  chit: pose({ hip: [-2, -16], t: -5, h: -25, ba: [-20, 20], fa: [0, 40], bl: F(-12), fl: F(10) }),
  airhit: pose({ hip: [0, 0], t: -55, h: -30, ba: [-110, -140], fa: [-80, -110], bl: A(60, 20), fl: A(90, 60) }),
  down: pose({ hip: [0, -33], t: -90, h: -95, ba: [-120, -100], fa: [-150, -95], bl: A(88, 92), fl: A(80, 95) }),
  jabW: pose({ t: 12, fa: [60, 115], ba: [55, 150] }),
  jab: pose({ hip: [2, -3], t: 16, h: 2, ba: [50, 140], fa: [88, 90], bl: F(-11), fl: F(10) }),
  strW: pose({ hip: [-2, -3], t: 0, ba: [85, 140], fa: [30, 120], bl: F(-12), fl: F(9) }),
  str: pose({ hip: [5, -5], t: 28, h: 4, ba: [15, 70], fa: [92, 92], bl: F(-15), fl: F(13) }),
  kickW: pose({ hip: [-1, -1], t: -4, ba: [60, 150], fa: [30, 130], bl: F(-6), fl: A(75, -5) }),
  kick: pose({ hip: [-2, -1], t: -20, h: -4, ba: [70, 150], fa: [0, 90], bl: F(-6), fl: A(98, 92) }),
  hkick: pose({ hip: [-3, 0], t: -32, ba: [80, 160], fa: [-10, 80], bl: F(-4), fl: A(128, 122) }),
  cjab: pose({ hip: [3, -15], t: 24, h: -4, ba: [60, 150], fa: [88, 90], bl: F(-12), fl: F(12) }),
  upW: pose({ hip: [0, -14], t: 20, fa: [20, 60], ba: [60, 150], bl: F(-11), fl: F(11) }),
  up: pose({ hip: [3, -4], t: -4, h: -6, fa: [160, 178], ba: [30, 100], bl: F(-11), fl: F(10) }),
  sweepW: pose({ hip: [0, -17], t: 26, bl: F(-12), fl: A(40, -20) }),
  sweep: pose({ hip: [-4, -24], t: 34, h: 10, ba: [110, 140], fa: [70, 100], bl: F(-8), fl: A(92, 95) }),
  jpunch: pose({ hip: [0, 0], t: 22, ba: [30, 150], fa: [110, 105], bl: A(60, -20), fl: A(95, 10) }),
  jheavy: pose({ hip: [0, 0], t: 30, ba: [120, 170], fa: [60, 55], bl: A(50, -30), fl: A(90, 0) }),
  jkick: pose({ hip: [0, 0], t: -6, ba: [100, 160], fa: [60, 140], bl: A(70, -30), fl: A(70, 62) }),
  projW: pose({ hip: [-3, -7], t: -12, h: -4, ba: [20, 80], fa: [25, 85], bl: F(-12), fl: F(11) }),
  proj: pose({ hip: [6, -9], t: 22, h: 4, ba: [88, 88], fa: [92, 92], bl: F(-17), fl: F(13) }),
  throwK: pose({ hip: [4, -5], t: 24, ba: [-40, 20], fa: [96, 96], bl: F(-15), fl: F(12) }),
  riseW: pose({ hip: [0, -14], t: 22, fa: [30, 70], ba: [60, 150], bl: F(-11), fl: F(11) }),
  rise: pose({ hip: [0, 2], t: -6, h: -8, fa: [168, 178], ba: [20, 90], bl: A(10, -25), fl: A(70, 10) }),
  flipKick: pose({ hip: [0, 2], t: -40, h: -10, ba: [-120, -150], fa: [-90, -120], bl: A(40, 0), fl: A(160, 170) }),
  rushW: pose({ hip: [-4, -6], t: 6, fa: [40, 120], ba: [80, 150], bl: F(-14), fl: F(8) }),
  rush: pose({ hip: [6, -7], t: 38, h: 8, fa: [95, 95], ba: [0, 40], bl: F(-20), fl: F(12) }),
  spinA: pose({ hip: [0, -4], t: -25, ba: [120, 150], fa: [-90, -80], bl: F(-4), fl: A(110, 100) }),
  spinB: pose({ hip: [0, -4], t: 20, ba: [-100, -60], fa: [100, 110], bl: A(-70, -90), fl: F(4) }),
  grabW: pose({ hip: [2, -5], t: 22, ba: [85, 95], fa: [95, 100], bl: F(-14), fl: F(12) }),
  grabHold: pose({ hip: [0, -5], t: -10, h: -5, ba: [150, 175], fa: [160, 178], bl: F(-12), fl: F(12) }),
  slam: pose({ hip: [6, -14], t: 45, ba: [100, 100], fa: [110, 110], bl: F(-16), fl: F(14) }),
  stompW: pose({ hip: [0, -1], t: -6, ba: [110, 160], fa: [110, 165], bl: F(-8), fl: A(100, 0) }),
  stomp: pose({ hip: [2, -12], t: 20, ba: [60, 90], fa: [70, 100], bl: F(-14), fl: F(14) }),
  lashW: pose({ hip: [-2, -3], t: -10, ba: [40, 120], fa: [155, 178], bl: F(-12), fl: F(9) }),
  lash: pose({ hip: [4, -5], t: 20, ba: [20, 60], fa: [95, 93], bl: F(-15), fl: F(12) }),
  sweepWhip: pose({ hip: [2, -20], t: 34, ba: [60, 120], fa: [80, 70], bl: F(-14), fl: F(14) }),
  whirl: pose({ hip: [0, -3], t: 0, h: -10, ba: [175, 178], fa: [170, 175], bl: F(-11), fl: F(9) }),
  hammerW: pose({ hip: [-2, -1], t: -15, h: -6, ba: [165, 178], fa: [160, 178], bl: F(-10), fl: F(9) }),
  hammer: pose({ hip: [5, -10], t: 40, h: 10, ba: [100, 80], fa: [95, 70], bl: F(-14), fl: F(13) }),
  slash: pose({ hip: [6, -8], t: 30, ba: [-30, -60], fa: [100, 100], bl: F(-20), fl: F(14) }),
  parry: pose({ hip: [3, -3], t: 14, h: -2, ba: [55, 150], fa: [110, 160], bl: F(-11), fl: F(10) }),
  win: pose({ hip: [0, -1], t: -2, h: -8, ba: [20, 60], fa: [165, 178], bl: F(-9), fl: F(9) }),
  win2: pose({ hip: [0, -2], t: -2, h: -6, ba: [25, 65], fa: [155, 178], bl: F(-9), fl: F(9) }),
  lose: pose({ hip: [0, -12], t: 45, h: 20, ba: [10, 10], fa: [20, 15], bl: F(-10), fl: F(10) }),
  portrait: pose({ hip: [0, -3], t: 4, h: 0, ba: [14, 24], fa: [20, 34], bl: F(-10), fl: F(9) }),
};

// ---------- move templates ----------
function N(o) {
  return Object.assign({ s: 4, a: 3, r: 8, dmg: 30, hs: 14, bs: 10, push: 2.5, box: [10, -62, 24, 10], hit: 'mid', cancel: 0 }, o);
}
function S(o) {
  return Object.assign({ s: 6, a: 4, r: 16, dmg: 80, hs: 20, bs: 16, push: 3, box: [10, -64, 30, 14], hit: 'mid', special: 1, cancel: 0 }, o);
}
const NORMALS = () => ({
  sL: N({ name: 'Jab', s: 3, a: 3, r: 7, dmg: 30, hs: 14, bs: 10, push: 2.2, box: [8, -66, 26, 10], cancel: 2, anim: { w: P.jabW, a: P.jab } }),
  sH: N({ name: 'Strong', s: 6, a: 4, r: 16, dmg: 80, hs: 20, bs: 15, push: 3.5, box: [10, -64, 34, 14], cancel: 1, anim: { w: P.strW, a: P.str } }),
  sK: N({ name: 'Side Kick', s: 6, a: 4, r: 15, dmg: 70, hs: 19, bs: 14, push: 3.2, box: [8, -46, 40, 14], cancel: 1, anim: { w: P.kickW, a: P.kick } }),
  cL: N({ name: 'Low Jab', s: 3, a: 3, r: 7, dmg: 25, hs: 13, bs: 9, push: 2, box: [8, -42, 26, 10], hit: 'low', cancel: 2, crouch: 1, anim: { w: P.crouch, a: P.cjab } }),
  cH: N({ name: 'Uppercut', s: 5, a: 5, r: 18, dmg: 75, hs: 20, bs: 14, push: 2.5, box: [0, -92, 26, 50], cancel: 1, anim: { w: P.upW, a: P.up } }),
  cK: N({ name: 'Sweep', s: 6, a: 4, r: 20, dmg: 70, hs: 0, bs: 14, push: 2.5, box: [6, -14, 48, 12], hit: 'low', kd: 1, cancel: 1, crouch: 1, anim: { w: P.sweepW, a: P.sweep } }),
  jL: N({ name: 'Air Punch', s: 3, a: 8, r: 3, dmg: 40, hs: 14, bs: 10, push: 2, box: [6, -58, 24, 16], hit: 'over', air: 1, anim: { w: P.jumpTuck, a: P.jpunch } }),
  jH: N({ name: 'Air Strong', s: 5, a: 6, r: 4, dmg: 75, hs: 18, bs: 12, push: 2.5, box: [6, -46, 28, 22], hit: 'over', air: 1, anim: { w: P.jumpTuck, a: P.jheavy } }),
  jK: N({ name: 'Air Kick', s: 4, a: 10, r: 3, dmg: 65, hs: 17, bs: 12, push: 2.5, box: [4, -32, 34, 20], hit: 'over', air: 1, anim: { w: P.jumpTuck, a: P.jkick } }),
  T: N({ name: 'Throw', s: 3, a: 2, r: 22, dmg: 0, noBox: 1, grab: { range: 36, dmg: 110, hold: 16, throwVx: 3, throwVy: -5 }, anim: { w: P.grabW, a: P.grabW, g: P.grabHold, t: P.slam } }),
});

// ---------- roster ----------
const ROSTER = [
  {
    id: 'tala', name: 'TALA', full: 'Tala Dimaguiba', origin: 'PHILIPPINES', style: 'ESKRIMA', fem: 1,
    scale: 0.95, bulk: 0.86,
    stats: { hp: 950, walk: 1.9, back: 1.55, jumpV: -8.7, jumpX: 2.7, dmg: 1.0, def: 1.03 },
    rating: { pow: 3, spd: 5, rng: 3, def: 2 },
    look: { hair: 'ponytail', top: 'tank', arms: 'bare', legs: 'long', feet: 'bare', wraps: 1, headband: 1, weapon: 'sticks', sash: 1 },
    pals: [
      { skin: '#b9794f', hair: '#1a120e', top: '#c8283a', accent: '#f0c040', pants: '#262a40', belt: '#f0c040', wrap: '#efe6d6', shoe: '#b9794f', band: '#f0c040', weapon: '#b8863b', fx: '#ffd84a' },
      { skin: '#b9794f', hair: '#1a120e', top: '#1d7fbf', accent: '#ffffff', pants: '#e9e2d0', belt: '#d8323c', wrap: '#2a2a2a', shoe: '#b9794f', band: '#d8323c', weapon: '#6a4020', fx: '#7fdcff' },
      { skin: '#b9794f', hair: '#3a1a10', top: '#1a1a1a', accent: '#c040ff', pants: '#3a1a4a', belt: '#c040ff', wrap: '#c040ff', shoe: '#b9794f', band: '#c040ff', weapon: '#222', fx: '#e08aff' },
    ],
    home: 0, ai: { range: 'close', aggro: 0.8 },
    bio: 'Street-born eskrimadora from Cebu. Her twin rattan sticks never miss a beat.',
    win: 'Too slow! My sticks were already moving.',
    ending: ['Tala takes the purse home to Cebu', 'and opens a free eskrima school', 'on the waterfront. Every kid there', 'learns to keep the beat.'],
    special: {
      A: S({ name: 'Rattan Flurry', s: 5, a: 20, r: 14, hits: 5, dmg: 17, hs: 14, bs: 9, push: 1, box: [6, -72, 36, 32], anim: { w: P.jabW, a: P.jab, a2: P.str } }),
      B: S({ name: 'Lunging Sinawali', s: 8, a: 12, r: 16, hits: 2, dmg: 46, vx: 4.6, vxFrom: 6, vxTo: 18, box: [8, -68, 32, 26], anim: { w: P.rushW, a: P.rush, a2: P.str } }),
      C: S({ name: 'Rising Baston', s: 3, a: 14, r: 20, hits: 3, dmg: 32, inv: [0, 8], vy: -7.2, vyAt: 4, vx: 1.2, vxFrom: 3, vxTo: 17, launch: 1, box: [-2, -94, 32, 52], anim: { w: P.riseW, a: P.rise } }),
      S: S({ name: 'HUNDRED RATTAN', super: 1, s: 4, a: 42, r: 20, hits: 12, dmg: 24, vx: 2.2, vxFrom: 4, vxTo: 30, inv: [0, 10], kd: 1, box: [4, -74, 38, 42], anim: { w: P.rushW, a: P.jab, a2: P.str } }),
    },
  },
  {
    id: 'bronn', name: 'BRONN', full: 'Bronn Haraldsson', origin: 'ICELAND', style: 'GLIMA WRESTLING',
    scale: 1.15, bulk: 1.45,
    stats: { hp: 1150, walk: 1.15, back: 1.0, jumpV: -7.8, jumpX: 2.0, dmg: 1.18, def: 0.92 },
    rating: { pow: 5, spd: 1, rng: 3, def: 5 },
    look: { hair: 'bald', beard: 1, top: 'shirtless', arms: 'bare', legs: 'long', feet: 'boots', fur: 1 },
    pals: [
      { skin: '#f0c8a8', hair: '#c0582a', top: '#f0c8a8', accent: '#8fd0ff', pants: '#3c4a5a', belt: '#9a7b4f', wrap: '#f0c8a8', shoe: '#5a3e2a', fur: '#8a7a66', fx: '#a8e4ff' },
      { skin: '#f0c8a8', hair: '#e8d8a0', top: '#f0c8a8', accent: '#ff6a3a', pants: '#5a2020', belt: '#2a2a2a', wrap: '#f0c8a8', shoe: '#2a2a2a', fur: '#3a3a3a', fx: '#ffb070' },
      { skin: '#e8b898', hair: '#3a2a20', top: '#e8b898', accent: '#7aff9a', pants: '#2a4a2a', belt: '#c0a040', wrap: '#e8b898', shoe: '#3a2a1a', fur: '#d8d8d0', fx: '#b0ffc0' },
    ],
    home: 3, ai: { range: 'close', aggro: 0.6, grab: 1 },
    bio: 'A glacier guide who wrestles polar bears for fun. Gets in close and never lets go.',
    win: 'Hah! Come back when you weigh more than my coat.',
    ending: ['Bronn hauls the trophy up', 'Frostpeak on his own shoulders,', 'then wrestles the monks', 'for the right to keep it.'],
    special: {
      A: S({ name: 'Glacier Toss', s: 5, a: 3, r: 26, dmg: 0, noBox: 1, grab: { range: 40, dmg: 150, hold: 26, throwVx: 3.5, throwVy: -6 }, anim: { w: P.grabW, a: P.grabW, g: P.grabHold, t: P.slam } }),
      B: S({ name: 'Avalanche Charge', s: 12, a: 16, r: 18, dmg: 105, vx: 3.8, vxFrom: 10, vxTo: 28, armor: 1, kd: 1, box: [6, -74, 28, 48], anim: { w: P.rushW, a: P.rush } }),
      C: S({ name: 'Frost Quake', s: 16, a: 2, r: 24, dmg: 0, noBox: 1, proj: { at: 16, type: 'quake', vx: 2.8, dmg: 85, w: 26, h: 18, y: -9, ground: 1, hit: 'low', kd: 1, hs: 20, bs: 14, life: 140 }, anim: { w: P.stompW, a: P.stomp } }),
      S: S({ name: 'FIMBULWINTER DRIVER', super: 1, s: 4, a: 8, r: 30, inv: [0, 12], dmg: 0, noBox: 1, vx: 5, vxFrom: 2, vxTo: 12, grab: { range: 50, dmg: 340, hold: 50, throwVx: 2, throwVy: -8, spin: 1 }, anim: { w: P.grabW, a: P.grabW, g: P.grabHold, t: P.slam } }),
    },
  },
  {
    id: 'volta', name: 'VOLTA', full: 'Mateus Volta', origin: 'BRAZIL', style: 'CAPOEIRA',
    scale: 1.0, bulk: 0.95,
    stats: { hp: 1000, walk: 1.6, back: 1.35, jumpV: -8.8, jumpX: 2.6, dmg: 1.0, def: 1.0 },
    rating: { pow: 3, spd: 4, rng: 4, def: 3 },
    look: { hair: 'locs', top: 'shirtless', arms: 'bare', legs: 'long', feet: 'bare', wristbands: 1, cord: 1 },
    pals: [
      { skin: '#8a5a3a', hair: '#1b1410', top: '#8a5a3a', accent: '#ffb020', pants: '#f2f0e8', belt: '#2fa84f', wrap: '#ffb020', shoe: '#8a5a3a', fx: '#ffb020' },
      { skin: '#8a5a3a', hair: '#1b1410', top: '#8a5a3a', accent: '#2fe0ff', pants: '#1a3a7a', belt: '#ffe14a', wrap: '#2fe0ff', shoe: '#8a5a3a', fx: '#5ae8ff' },
      { skin: '#8a5a3a', hair: '#5a2a10', top: '#8a5a3a', accent: '#ff4a6a', pants: '#2a2a2a', belt: '#ff4a6a', wrap: '#ff4a6a', shoe: '#8a5a3a', fx: '#ff7a8a' },
    ],
    home: 0, ai: { range: 'mid', aggro: 0.6, proj: 1 },
    bio: 'Harbor-side capoeirista who channels the setting sun into blazing spin kicks.',
    win: 'The roda never stops. Neither do I!',
    ending: ['Volta throws the biggest roda', 'Sunset Harbor has ever seen.', 'The music plays until', 'the sun comes back up.'],
    special: {
      A: S({ name: 'Sol Orb', s: 12, a: 2, r: 24, noBox: 1, proj: { at: 12, type: 'sol', vx: 3.6, dmg: 75, w: 16, h: 16, y: -58, hs: 20, bs: 15 }, anim: { w: P.projW, a: P.proj } }),
      B: S({ name: 'Meia Lua Storm', s: 8, a: 18, r: 16, hits: 3, dmg: 36, vx: 2.6, vxFrom: 8, vxTo: 26, box: [0, -68, 38, 36], anim: { w: P.kickW, a: P.spinA, a2: P.spinB } }),
      C: S({ name: 'Au Eclipse', s: 3, a: 14, r: 22, hits: 2, dmg: 52, inv: [0, 8], vy: -7.5, vyAt: 4, vx: 1.5, vxFrom: 3, vxTo: 17, launch: 1, box: [-6, -98, 38, 58], anim: { w: P.riseW, a: P.flipKick } }),
      S: S({ name: 'SOL TEMPESTADE', super: 1, s: 10, a: 4, r: 30, inv: [0, 14], noBox: 1, proj: { at: 10, type: 'solbig', vx: 4.5, dmg: 58, hits: 5, hint: 5, w: 40, h: 40, y: -62, kd: 1 }, anim: { w: P.projW, a: P.proj } }),
    },
  },
  {
    id: 'suri', name: 'SURI', full: 'Suriya Nair', origin: 'INDIA', style: 'KALARIPAYATTU', fem: 1,
    scale: 0.97, bulk: 0.85,
    stats: { hp: 960, walk: 1.5, back: 1.4, jumpV: -8.6, jumpX: 2.4, dmg: 0.98, def: 1.02 },
    rating: { pow: 3, spd: 3, rng: 5, def: 2 },
    look: { hair: 'braid', top: 'wrap', arms: 'bare', legs: 'long', feet: 'bare', anklets: 1, weapon: 'whip', jewel: 1 },
    pals: [
      { skin: '#a8693f', hair: '#140d0a', top: '#e2862a', accent: '#f4c64e', pants: '#6a1f4a', belt: '#f4c64e', wrap: '#f4c64e', shoe: '#a8693f', weapon: '#d8e2ea', fx: '#ffe08a' },
      { skin: '#a8693f', hair: '#140d0a', top: '#1fa88a', accent: '#f4c64e', pants: '#f2ece0', belt: '#1fa88a', wrap: '#f4c64e', shoe: '#a8693f', weapon: '#d8e2ea', fx: '#8affd8' },
      { skin: '#a8693f', hair: '#2a0d0a', top: '#d81a4a', accent: '#ffffff', pants: '#1a1a2a', belt: '#d81a4a', wrap: '#ffffff', shoe: '#a8693f', weapon: '#ff9ab8', fx: '#ff9ab8' },
    ],
    home: 1, ai: { range: 'far', aggro: 0.5 },
    bio: 'Temple guardian of Kerala. Her urumi coil-sword strikes from across the arena.',
    win: 'Keep your distance. It will not help you.',
    ending: ['Suri returns the temple relic', 'to the Emerald Ruins and', 'takes her place as its', 'youngest guardian in 300 years.'],
    special: {
      A: S({ name: 'Serpent Lash', s: 10, a: 5, r: 22, dmg: 78, whip: 1, box: [14, -66, 104, 12], hs: 20, bs: 14, push: 2.5, anim: { w: P.lashW, a: P.lash } }),
      B: S({ name: 'Tail Sweep', s: 10, a: 6, r: 24, dmg: 70, whip: 1, hit: 'low', kd: 1, box: [12, -14, 88, 12], anim: { w: P.sweepW, a: P.sweepWhip } }),
      C: S({ name: 'Cobra Rise', s: 4, a: 12, r: 22, hits: 2, dmg: 48, whip: 2, inv: [0, 7], launch: 1, box: [-26, -122, 72, 82], anim: { w: P.riseW, a: P.whirl } }),
      S: S({ name: 'THOUSAND COILS', super: 1, s: 6, a: 44, r: 20, hits: 11, dmg: 27, whip: 3, inv: [0, 10], kd: 1, box: [0, -100, 140, 96], anim: { w: P.lashW, a: P.lash, a2: P.whirl } }),
    },
  },
  {
    id: 'duke', name: 'DUKE', full: 'Duke Okafor', origin: 'USA', style: 'STREET BRAWLER',
    scale: 1.05, bulk: 1.2,
    stats: { hp: 1050, walk: 1.5, back: 1.25, jumpV: -8.3, jumpX: 2.4, dmg: 1.1, def: 0.97 },
    rating: { pow: 4, spd: 3, rng: 2, def: 4 },
    look: { hair: 'buzz', beard: 2, top: 'tank', arms: 'bare', legs: 'long', feet: 'boots', wraps: 1, sleeves: 1 },
    pals: [
      { skin: '#5a3825', hair: '#0e0a08', top: '#f0ede4', accent: '#d86a1e', pants: '#d86a1e', belt: '#d86a1e', wrap: '#f0ede4', shoe: '#3a2a1e', fx: '#ffa040' },
      { skin: '#5a3825', hair: '#0e0a08', top: '#2a2a2a', accent: '#3a7ad8', pants: '#3a5a8a', belt: '#3a5a8a', wrap: '#e0e0e0', shoe: '#1a1a1a', fx: '#80b8ff' },
      { skin: '#5a3825', hair: '#0e0a08', top: '#c82020', accent: '#ffd040', pants: '#2a2a2a', belt: '#2a2a2a', wrap: '#ffd040', shoe: '#ffd040', fx: '#ffd040' },
    ],
    home: 2, ai: { range: 'close', aggro: 0.85 },
    bio: 'Motor City mechanic and ex-pro boxer. Fixes engines by day, faces by night.',
    win: 'Shop is closed. Come back Monday.',
    ending: ['Duke buys back the old auto', 'shop on 8 Mile and turns it', 'into a gym. The sign out', 'front reads: NO CHAMPS, ONLY WORK.'],
    special: {
      A: S({ name: 'Piston Rush', s: 8, a: 8, r: 18, dmg: 95, vx: 6, vxFrom: 6, vxTo: 14, box: [10, -68, 30, 18], push: 4, anim: { w: P.rushW, a: P.rush } }),
      B: S({ name: 'Wrench Hammer', s: 17, a: 3, r: 16, dmg: 95, hit: 'over', box: [6, -62, 36, 42], hs: 22, anim: { w: P.hammerW, a: P.hammer } }),
      C: S({ name: 'Rising Thunder', s: 3, a: 12, r: 22, hits: 2, dmg: 58, inv: [0, 7], vy: -8, vyAt: 4, vx: 1.4, vxFrom: 3, vxTo: 15, launch: 1, box: [0, -98, 30, 52], anim: { w: P.riseW, a: P.rise } }),
      S: S({ name: 'MOTOR CITY RIOT', super: 1, s: 6, a: 36, r: 22, hits: 9, dmg: 32, vx: 1.6, vxFrom: 4, vxTo: 36, inv: [0, 10], kd: 1, box: [6, -74, 36, 42], anim: { w: P.rush, a: P.jab, a2: P.str } }),
    },
  },
  {
    id: 'nova', name: 'NOVA', full: 'Nova Wanjiru', origin: 'KENYA', style: 'CYBER NINJUTSU', fem: 1,
    scale: 0.95, bulk: 0.84,
    stats: { hp: 900, walk: 2.0, back: 1.7, jumpV: -9.2, jumpX: 2.9, dmg: 0.95, def: 1.05 },
    rating: { pow: 2, spd: 5, rng: 4, def: 2 },
    look: { hair: 'short', top: 'suit', arms: 'sleeve', legs: 'long', feet: 'shoes', visor: 1, scarf: 1, weapon: 'blades' },
    pals: [
      { skin: '#4a2c1e', hair: '#0c0808', top: '#2a2f3a', accent: '#2fe0d0', pants: '#2a2f3a', belt: '#2fe0d0', wrap: '#2a2f3a', shoe: '#dfe4ea', scarf: '#d63a3a', visor: '#3ff0ff', fx: '#5ffff0' },
      { skin: '#4a2c1e', hair: '#0c0808', top: '#e8e8f0', accent: '#ff3aa0', pants: '#e8e8f0', belt: '#ff3aa0', wrap: '#e8e8f0', shoe: '#2a2a2a', scarf: '#2a2a2a', visor: '#ff3aa0', fx: '#ff7ac0' },
      { skin: '#4a2c1e', hair: '#0c0808', top: '#1a3a1a', accent: '#b8ff3a', pants: '#1a3a1a', belt: '#b8ff3a', wrap: '#1a3a1a', shoe: '#b8ff3a', scarf: '#f0a020', visor: '#b8ff3a', fx: '#d8ff7a' },
    ],
    home: 2, ai: { range: 'mid', aggro: 0.7, proj: 1, teleport: 1 },
    bio: 'Olympic sprinter turned rogue tech-ninja. Blink and you have already lost.',
    win: 'Personal best. Again.',
    ending: ['Nova uploads the tournament', 'data to the open net and', 'vanishes. Rumor says she is', 'already training for the next one.'],
    special: {
      A: S({ name: 'Photon Kunai', s: 8, a: 2, r: 16, noBox: 1, proj: { at: 8, type: 'kunai', vx: 6, dmg: 55, w: 18, h: 8, y: -60, hs: 16, bs: 12 }, anim: { w: P.jabW, a: P.throwK } }),
      B: S({ name: 'Blink', s: 6, a: 10, r: 12, dmg: 0, noBox: 1, teleport: { at: 10 }, inv: [3, 18], anim: { w: P.crouch, a: P.crouch } }),
      C: S({ name: 'Gale Spiral', s: 4, a: 16, r: 20, hits: 4, dmg: 28, inv: [0, 8], vy: -7, vyAt: 4, vx: 1, vxFrom: 3, vxTo: 19, launch: 1, box: [-10, -96, 42, 58], anim: { w: P.riseW, a: P.spinA, a2: P.spinB } }),
      S: S({ name: 'ZERO HORIZON', super: 1, s: 8, a: 16, r: 24, hits: 6, dmg: 46, vx: 9, vxFrom: 8, vxTo: 20, inv: [0, 28], noPush: 1, kd: 1, box: [-10, -78, 42, 76], anim: { w: P.rushW, a: P.slash } }),
    },
  },
  {
    id: 'zerak', name: 'ZERAK', full: 'Zerak the Iron Tyrant', origin: 'OBSIDIAN CITADEL', style: 'VOID SORCERY', boss: 1,
    scale: 1.2, bulk: 1.35,
    stats: { hp: 1250, walk: 1.3, back: 1.2, jumpV: -8.2, jumpX: 2.3, dmg: 1.15, def: 0.88 },
    rating: { pow: 5, spd: 3, rng: 5, def: 5 },
    look: { hair: 'helmet', top: 'armor', arms: 'sleeve', legs: 'long', feet: 'boots', cape: 1, gauntlets: 1 },
    pals: [
      { skin: '#7a6a8a', hair: '#2a2433', top: '#3a3045', accent: '#d4a83a', pants: '#241e2c', belt: '#d4a83a', wrap: '#2a2433', shoe: '#1a1620', cape: '#4b1d6b', eye: '#ff3a3a', fx: '#c06aff' },
      { skin: '#7a6a8a', hair: '#e0e0e8', top: '#c8c8d8', accent: '#3a8aff', pants: '#5a5a6a', belt: '#3a8aff', wrap: '#c8c8d8', shoe: '#3a3a4a', cape: '#1a2a6a', eye: '#3affff', fx: '#7ad8ff' },
      { skin: '#7a6a8a', hair: '#5a1010', top: '#2a0a0a', accent: '#ff6a1a', pants: '#1a0808', belt: '#ff6a1a', wrap: '#2a0a0a', shoe: '#100404', cape: '#8a1010', eye: '#ffd03a', fx: '#ff8a3a' },
    ],
    home: 4, ai: { range: 'mid', aggro: 0.75, proj: 1 },
    bio: 'Master of the Obsidian Citadel. He staged the tournament to harvest its champions.',
    win: 'Kneel. Your strength belongs to me now.',
    ending: ['With the champions defeated,', 'Zerak absorbs their spirit.', 'The Citadel rises into the', 'sky... for now.'],
    special: {
      A: S({ name: 'Void Sphere', s: 14, a: 2, r: 22, noBox: 1, proj: { at: 14, type: 'void', vx: 2.8, dmg: 45, hits: 2, hint: 10, w: 22, h: 22, y: -64 }, anim: { w: P.projW, a: P.proj } }),
      B: S({ name: 'Tyrant Dash', s: 10, a: 18, r: 18, hits: 3, dmg: 45, vx: 4.2, vxFrom: 8, vxTo: 28, armor: 2, kd: 1, box: [6, -82, 32, 62], anim: { w: P.rushW, a: P.rush } }),
      C: S({ name: 'Eclipse Rise', s: 4, a: 14, r: 22, hits: 3, dmg: 42, inv: [0, 9], vy: -8, vyAt: 4, launch: 1, box: [-14, -112, 54, 72], anim: { w: P.riseW, a: P.rise } }),
      S: S({ name: 'BLACK SUN', super: 1, s: 12, a: 4, r: 30, inv: [0, 16], noBox: 1, proj: { at: 12, type: 'blacksun', vx: 2.6, dmg: 42, hits: 8, hint: 6, w: 46, h: 46, y: -70, kd: 1 }, anim: { w: P.projW, a: P.proj } }),
    },
  },
];

// per-character stance flavor
const STANCES = {
  duke: [pose({ hip: [0, -4], t: 14, ba: [50, 168], fa: [30, 162], bl: F(-12), fl: F(10) }), pose({ hip: [0, -7], t: 16, h: 3, ba: [52, 170], fa: [34, 160], bl: F(-12), fl: F(10) })],
  volta: [pose({ hip: [-2, -6], t: 14, ba: [100, 150], fa: [40, 120], bl: F(-16), fl: F(6) }), pose({ hip: [2, -6], t: 6, ba: [40, 120], fa: [100, 150], bl: F(-6), fl: F(16) })],
  bronn: [pose({ hip: [0, -6], t: 20, ba: [60, 90], fa: [50, 80], bl: F(-14), fl: F(13) }), pose({ hip: [0, -7.5], t: 22, ba: [62, 92], fa: [52, 82], bl: F(-14), fl: F(13) })],
  suri: [pose({ hip: [0, -9], t: 18, ba: [30, 60], fa: [80, 125], bl: F(-14), fl: F(12) }), pose({ hip: [0, -10.5], t: 20, ba: [32, 62], fa: [84, 128], bl: F(-14), fl: F(12) })],
  nova: [pose({ hip: [0, -6], t: 16, ba: [40, 150], fa: [70, 85], bl: F(-13), fl: F(10) }), pose({ hip: [0, -7], t: 18, ba: [42, 152], fa: [72, 88], bl: F(-13), fl: F(10) })],
  zerak: [pose({ hip: [0, -1], t: 0, h: -4, ba: [30, 110], fa: [40, 115], bl: F(-10), fl: F(9) }), pose({ hip: [0, -2], t: 2, h: -2, ba: [32, 112], fa: [42, 117], bl: F(-10), fl: F(9) })],
  tala: [pose({ hip: [0, -4], t: 12, ba: [70, 125], fa: [50, 150], bl: F(-12), fl: F(10) }), pose({ hip: [0, -5.5], t: 14, ba: [72, 128], fa: [52, 152], bl: F(-12), fl: F(10) })],
};

const BASE_DIMS = { thigh: 19, shin: 19, torso: 25, neck: 3, headR: 6.5, upper: 14, fore: 13, thighW: 9, shinW: 7, upperW: 6.5, foreW: 5.5, fist: 3.4, foot: 8, shoulderW: 17, waistW: 12 };
const CHAR = {};
ROSTER.forEach((c) => {
  const s = c.scale, b = c.bulk;
  const d = {};
  for (const k in BASE_DIMS) {
    const isW = /W$|fist/.test(k);
    d[k] = BASE_DIMS[k] * s * (isW ? b : 1);
  }
  d.headR = BASE_DIMS.headR * s * (c.bulk > 1.3 ? 1.05 : 1);
  d.foot = BASE_DIMS.foot * s;
  c.dims = d;
  c.idle = STANCES[c.id] || [P.idle0, P.idle1];
  const n = NORMALS();
  c.moves = Object.assign(n, { A: c.special.A, B: c.special.B, C: c.special.C, S: c.special.S });
  for (const k in c.moves) {
    const m = c.moves[k];
    m.key = k;
    m.hits = m.hits || 1;
    m.hint = m.hint || Math.ceil(m.a / m.hits);
  }
  // Tala's sticks and Suri's urumi extend normal reach a little
  if (c.look.weapon === 'sticks') ['sL', 'sH', 'cL', 'jL', 'jH'].forEach((k) => (c.moves[k].box[2] += 8));
  if (c.look.weapon === 'whip') ['sH'].forEach((k) => { c.moves[k].box[2] += 22; c.moves[k].whip = 1; });
  if (c.id === 'volta') { c.moves.sK.anim = { w: P.kickW, a: P.hkick }; c.moves.sK.box = [8, -66, 40, 22]; }
  CHAR[c.id] = c;
});
const PLAYABLE = ['tala', 'bronn', 'volta', 'suri', 'duke', 'nova'];

// how to perform each special (for move lists)
const MOVE_INPUTS = {
  A: 'SP  or  QCF+P',
  B: 'SP+FWD  or  QCB+P/K',
  C: 'SP+UP  or  DP+P',
  S: 'SUPER  or  QCFx2+P',
};
