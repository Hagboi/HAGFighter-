'use strict';
// ---------- core constants & helpers ----------
const W = 384, H = 216, GROUND = 198, STAGE_W = 640;
const D2R = Math.PI / 180;
const FONT = '"Press Start 2P", monospace';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const choice = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const sign = (v) => (v < 0 ? -1 : 1);

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// deterministic rng for procedural art
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const _hex = new Map();
function hexRgb(h) {
  let c = _hex.get(h);
  if (c) return c;
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  c = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  _hex.set(h, c);
  return c;
}
const _shade = new Map();
// f < 1 darkens, f > 1 lightens toward white
function shade(h, f) {
  const k = h + '|' + f;
  let r = _shade.get(k);
  if (r) return r;
  const c = hexRgb(h);
  let o;
  if (f <= 1) o = c.map((v) => Math.round(v * f));
  else { const t = f - 1; o = c.map((v) => Math.round(v + (255 - v) * t)); }
  r = 'rgb(' + o.join(',') + ')';
  _shade.set(k, r);
  return r;
}
function mix(a, b, t) {
  const x = hexRgb(a), y = hexRgb(b);
  return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')';
}
function rgba(h, a) {
  const c = hexRgb(h);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function fmt(n) {
  n = Math.floor(n);
  if (n < 100000) return '' + n;
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------- text ----------
function text(ctx, str, x, y, o = {}) {
  const size = o.size || 8;
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'top';
  x = Math.round(x); y = Math.round(y);
  if (o.outline !== false) {
    ctx.fillStyle = o.outline || '#000';
    const d = size >= 16 ? 2 : 1;
    ctx.fillText(str, x - d, y); ctx.fillText(str, x + d, y);
    ctx.fillText(str, x, y - d); ctx.fillText(str, x, y + d);
    ctx.fillText(str, x + d, y + d);
    if (size >= 16) ctx.fillText(str, x + d + 1, y + d + 1);
  }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(str, x, y);
}
// vertical gradient text (logo style)
function gradText(ctx, str, x, y, size, c1, c2, outline = '#200') {
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = outline;
  for (let dx = -2; dx <= 3; dx++) for (let dy = -2; dy <= 3; dy++) ctx.fillText(str, x + dx, y + dy);
  const g = ctx.createLinearGradient(0, y, 0, y + size);
  g.addColorStop(0, c1); g.addColorStop(0.5, '#fff6c0'); g.addColorStop(0.55, c2); g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillText(str, x, y);
}

function wrapText(str, maxChars) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function mkLayer(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  const x = c.getContext('2d');
  fn(x, c.width, c.height);
  return c;
}
