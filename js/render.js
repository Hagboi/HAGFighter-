'use strict';
// ---------- pose solving (IK/FK) and procedural character rendering ----------
const OUT = '#120a10';
const _rc = new WeakMap();
const angOf = (dx, dy) => Math.atan2(dx, dy) / D2R;

function ik(hx, hy, tx, ty, a, b) {
  const dx = tx - hx, dy = ty - hy;
  const dd = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.01, a + b - 0.01);
  const base = angOf(dx, dy);
  const c = (a * a + dd * dd - b * b) / (2 * a * dd);
  const phi = Math.acos(clamp(c, -1, 1)) / D2R;
  const a1 = base + phi;
  const kx = hx + a * Math.sin(a1 * D2R), ky = hy + a * Math.cos(a1 * D2R);
  return [a1, angOf(tx - kx, ty - ky)];
}

function resolve(ch, p) {
  let m = _rc.get(p);
  if (!m) { m = {}; _rc.set(p, m); }
  if (m[ch.id]) return m[ch.id];
  const d = ch.dims, s = ch.scale;
  const NH = (d.thigh + d.shin) * 0.97;
  const hx = p.hip[0] * s, hy = -(NH + p.hip[1] * s);
  const R = { hx, hy, t: p.t, h: p.h || 0, ba1: p.ba[0], ba2: p.ba[1], fa1: p.fa[0], fa2: p.fa[1] };
  const leg = (L, ox, k1, k2) => {
    if (L.a) { R[k1] = L.a[0]; R[k2] = L.a[1]; return; }
    const [a1, a2] = ik(hx + ox, hy, L.f[0] * s, -L.f[1] * s - 2 * s, d.thigh, d.shin);
    R[k1] = a1; R[k2] = a2;
  };
  leg(p.bl, -2 * s, 'bl1', 'bl2');
  leg(p.fl, 2 * s, 'fl1', 'fl2');
  m[ch.id] = R;
  return R;
}
const RKEYS = ['hx', 'hy', 't', 'h', 'ba1', 'ba2', 'fa1', 'fa2', 'bl1', 'bl2', 'fl1', 'fl2'];
function lerpR(a, b, t) {
  const o = {};
  for (const k of RKEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

function fk(ch, R) {
  const d = ch.dims, s = ch.scale;
  const t = R.t * D2R;
  const dx = Math.sin(t), dy = -Math.cos(t), px = Math.cos(t), py = Math.sin(t);
  const hip = { x: R.hx, y: R.hy };
  const neck = { x: hip.x + dx * d.torso, y: hip.y + dy * d.torso };
  const headAng = R.t * 0.6 + R.h;
  const ha = headAng * D2R;
  const hr = d.neck + d.headR * 0.95;
  const head = { x: neck.x + Math.sin(ha) * hr, y: neck.y - Math.cos(ha) * hr };
  const sh = (o) => ({ x: neck.x - dx * 2.5 * s + px * o, y: neck.y - dy * 2.5 * s + py * o });
  const sF = sh(1.5 * s), sB = sh(-3 * s);
  const limb = (o, a1, a2, l1, l2) => {
    const e = { x: o.x + Math.sin(a1 * D2R) * l1, y: o.y + Math.cos(a1 * D2R) * l1 };
    const h = { x: e.x + Math.sin(a2 * D2R) * l2, y: e.y + Math.cos(a2 * D2R) * l2 };
    return [e, h];
  };
  const [eB, hB] = limb(sB, R.ba1, R.ba2, d.upper, d.fore);
  const [eF, hF] = limb(sF, R.fa1, R.fa2, d.upper, d.fore);
  const hipB = { x: hip.x - 2 * s, y: hip.y }, hipF = { x: hip.x + 2 * s, y: hip.y };
  const [kB, aB] = limb(hipB, R.bl1, R.bl2, d.thigh, d.shin);
  const [kF, aF] = limb(hipF, R.fl1, R.fl2, d.thigh, d.shin);
  const toe = (a, an) => ({ x: a.x + Math.sin((an + 90) * D2R) * d.foot, y: a.y + Math.cos((an + 90) * D2R) * d.foot });
  return {
    hip, neck, head, headAng, dx, dy, px, py, sF, sB, eB, hB, eF, hF, hipB, hipF, kB, aB, kF, aF,
    tB: toe(aB, R.bl2), tF: toe(aF, R.fl2), R,
  };
}

// ---------- drawing primitives ----------
function cap(c, a, b, w, col, hl = true) {
  c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = w + 2;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  c.strokeStyle = col; c.lineWidth = w;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  if (hl && w > 3 && col[0] === '#') {
    c.strokeStyle = shade(col, 1.22); c.lineWidth = w * 0.3;
    c.beginPath(); c.moveTo(a.x - w * 0.18, a.y - w * 0.18); c.lineTo(b.x - w * 0.18, b.y - w * 0.18); c.stroke();
  }
}
function dot(c, p, r, col) {
  c.fillStyle = OUT; c.beginPath(); c.arc(p.x, p.y, r + 1, 0, 7); c.fill();
  c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill();
}
function poly(c, pts, col, ol = true) {
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fillStyle = col; c.fill();
  if (ol) { c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 1; c.stroke(); }
}
const P2 = (x, y) => ({ x, y });
const add = (a, dx, dy) => ({ x: a.x + dx, y: a.y + dy });
const mid = (a, b, t = 0.5) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const _whitePal = {};
function flashPal(col) {
  if (_whitePal[col]) return _whitePal[col];
  return (_whitePal[col] = new Proxy({}, { get: () => col }));
}

// draws the body in local space (feet at 0,0, facing right). o: {t, f (fighter), whip}
function renderBody(c, ch, pal, R, o = {}) {
  const J = fk(ch, R);
  const d = ch.dims, s = ch.scale, L = ch.look, t = o.t || 0;
  const back = (col) => (col[0] === '#' ? shade(col, 0.72) : col);
  const skin = pal.skin;
  const upperCol = L.arms === 'sleeve' ? pal.top : skin;
  const foreCol = L.arms === 'sleeve' ? pal.top : L.wraps ? pal.wrap : skin;
  const fistCol = L.gauntlets ? pal.accent : L.wraps ? pal.wrap : L.arms === 'sleeve' && L.weapon !== 'blades' ? pal.top : skin;
  const shinCol = L.legs === 'shorts' ? skin : pal.pants;
  const footCol = L.feet === 'bare' ? skin : pal.shoe;

  // --- cape (behind everything) ---
  if (L.cape) {
    const sw = Math.sin(t * 0.08) * 3;
    const top = add(J.neck, -3 * s, 2);
    const pts = [add(top, 4 * s, 0), add(J.sB, -2, 0), P2(J.hip.x - 16 * s + sw, -6), P2(J.hip.x - 30 * s + sw * 1.5, -4), P2(J.hip.x - 26 * s + sw, J.hip.y + 6)];
    poly(c, pts, pal.cape);
    c.strokeStyle = pal.accent; c.lineWidth = 1;
    c.beginPath(); c.moveTo(pts[2].x, pts[2].y); c.lineTo(pts[3].x, pts[3].y); c.stroke();
  }
  // --- scarf / headband tails (behind) ---
  const tail = (anchor, len, w, col, n = 4) => {
    const pts = [anchor];
    for (let i = 1; i <= n; i++) {
      pts.push(P2(anchor.x - i * len * s, anchor.y + i * 1.6 * s + Math.sin(t * 0.25 + i * 1.3) * i * 0.9));
    }
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = OUT; c.lineWidth = w + 2;
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  };
  if (L.scarf) tail(add(J.neck, -2 * s, 0), 5, 3 * s, pal.scarf, 5);

  // --- back arm ---
  cap(c, J.sB, J.eB, d.upperW, back(upperCol));
  cap(c, J.eB, J.hB, d.foreW, back(foreCol));
  drawHandExtras(c, ch, pal, J, J.eB, J.hB, R.ba2, true, o);
  dot(c, J.hB, d.fist, back(fistCol));

  // --- legs ---
  const leg = (h, k, a, toe, isBack) => {
    const f = isBack ? back : (x) => x;
    cap(c, h, k, d.thighW, f(pal.pants));
    cap(c, k, a, d.shinW, f(shinCol));
    if (L.feet === 'boots') cap(c, mid(k, a, 0.55), a, d.shinW + 1, f(pal.shoe), false);
    if (L.anklets) { c.fillStyle = pal.accent; c.fillRect(a.x - 2, a.y - 2.5, 4, 1.5); }
    cap(c, add(a, -(toe.x - a.x) * 0.15, -(toe.y - a.y) * 0.15), toe, 3.6 * s, f(footCol), false);
  };
  leg(J.hipB, J.kB, J.aB, J.tB, true);
  leg(J.hipF, J.kF, J.aF, J.tF, false);

  // --- torso ---
  const hw = d.waistW / 2, sw = d.shoulderW / 2;
  const tp = (base, along, side) => P2(base.x + J.dx * along + J.px * side, base.y + J.dy * along + J.py * side);
  const torsoPts = [
    tp(J.hip, 0, -hw), tp(J.hip, 0, hw * 0.9),
    tp(J.hip, d.torso * 0.45, hw * 1.0), tp(J.hip, d.torso * 0.72, sw * 0.95),
    tp(J.neck, -1, sw * 0.6), tp(J.neck, 0, -sw * 0.5), tp(J.neck, -3, -sw * 0.9),
    tp(J.hip, d.torso * 0.5, -hw * 1.05),
  ];
  const topCol = L.top === 'shirtless' || L.top === 'wrap' ? skin : pal.top;
  poly(c, torsoPts, topCol);
  // shading strip on the back side
  c.save(); c.clip();
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath(); c.moveTo(torsoPts[0].x, torsoPts[0].y); c.lineTo(torsoPts[7].x, torsoPts[7].y); c.lineTo(torsoPts[6].x, torsoPts[6].y);
  c.lineTo(tp(J.neck, -3, -sw * 0.3).x, tp(J.neck, -3, -sw * 0.3).y); c.lineTo(tp(J.hip, 0, -hw * 0.4).x, tp(J.hip, 0, -hw * 0.4).y); c.fill();
  if (L.top === 'tank') {
    c.fillStyle = skin;
    const a1 = tp(J.neck, 1, -sw), a2 = tp(J.neck, 1, sw), a3 = tp(J.neck, -6 * s, sw * 0.4), a4 = tp(J.neck, -4 * s, -sw * 0.2);
    c.beginPath(); c.moveTo(a1.x, a1.y); c.lineTo(a2.x, a2.y); c.lineTo(a3.x, a3.y); c.lineTo(a4.x, a4.y); c.fill();
  }
  if (L.top === 'wrap') {
    c.fillStyle = pal.top;
    const a1 = tp(J.neck, -3 * s, -sw), a2 = tp(J.neck, -3 * s, sw), a3 = tp(J.neck, -12 * s, sw), a4 = tp(J.neck, -12 * s, -sw);
    c.beginPath(); c.moveTo(a1.x, a1.y); c.lineTo(a2.x, a2.y); c.lineTo(a3.x, a3.y); c.lineTo(a4.x, a4.y); c.fill();
    c.fillStyle = pal.accent;
    const b1 = tp(J.neck, -12 * s, -sw), b2 = tp(J.neck, -12 * s, sw);
    c.fillRect(Math.min(b1.x, b2.x), Math.min(b1.y, b2.y) - 0.5, Math.abs(b2.x - b1.x) + 1, 1.2);
  }
  if (L.top === 'shirtless') {
    c.strokeStyle = shade(skin, 0.75); c.lineWidth = 0.8;
    const p1 = tp(J.neck, -7 * s, sw * 0.1), p2 = tp(J.neck, -7 * s, sw * 0.85);
    c.beginPath(); c.moveTo(p1.x, p1.y); c.quadraticCurveTo(mid(p1, p2).x, mid(p1, p2).y + 2, p2.x, p2.y); c.stroke();
    const q1 = tp(J.hip, 4 * s, hw * 0.3), q2 = tp(J.neck, -9 * s, sw * 0.4);
    c.beginPath(); c.moveTo(q1.x, q1.y); c.lineTo(q2.x, q2.y); c.stroke();
  }
  if (L.top === 'suit') {
    c.strokeStyle = pal.accent; c.lineWidth = 1.2;
    const q1 = tp(J.hip, 2, hw * 0.75), q2 = tp(J.neck, -2, sw * 0.5);
    c.beginPath(); c.moveTo(q1.x, q1.y); c.lineTo(q2.x, q2.y); c.stroke();
  }
  if (L.top === 'armor') {
    c.strokeStyle = pal.accent; c.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const a1 = tp(J.hip, d.torso * i * 0.22, -hw * 1.2), a2 = tp(J.hip, d.torso * i * 0.22, hw * 1.2);
      c.beginPath(); c.moveTo(a1.x, a1.y); c.lineTo(a2.x, a2.y); c.stroke();
    }
    c.fillStyle = pal.fx; c.globalAlpha = 0.6 + Math.sin(t * 0.1) * 0.3;
    const cg = tp(J.neck, -8 * s, sw * 0.3); c.beginPath(); c.arc(cg.x, cg.y, 1.8 * s, 0, 7); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
  // pants waist + belt
  const wA = tp(J.hip, 2, -hw * 1.05), wB = tp(J.hip, 2, hw * 1.0);
  cap(c, wA, wB, 7 * s, pal.pants, false);
  const bA = tp(J.hip, 5 * s, -hw * 1.05), bB = tp(J.hip, 5 * s, hw * 1.0);
  cap(c, bA, bB, (L.cord ? 1.6 : 2.8) * s, pal.belt, false);
  if (L.sash || L.cord) {
    const k = tp(J.hip, 5 * s, hw * 0.6);
    const sway = Math.sin(t * 0.2) * 1.5;
    cap(c, k, P2(k.x - 2 + sway, k.y + 9 * s), 2 * s, pal.belt, false);
    cap(c, k, P2(k.x + 1 + sway, k.y + 8 * s), 2 * s, pal.belt, false);
  }
  if (L.sleeves && L.top === 'tank') {
    // jumpsuit sleeves tied around the waist
    const k = tp(J.hip, 4 * s, -hw * 0.6);
    cap(c, k, P2(k.x - 3, k.y + 10 * s), 3.2 * s, pal.pants, false);
  }
  if (L.fur) {
    c.fillStyle = pal.fur;
    for (let i = -3; i <= 3; i++) {
      const p = tp(J.neck, -2 - Math.abs(i) * 0.6, i * sw * 0.32);
      c.fillStyle = OUT; c.beginPath(); c.arc(p.x, p.y, 3.6 * s, 0, 7); c.fill();
    }
    for (let i = -3; i <= 3; i++) {
      const p = tp(J.neck, -2 - Math.abs(i) * 0.6, i * sw * 0.32);
      c.fillStyle = i % 2 ? pal.fur : shade(pal.fur, 1.15); c.beginPath(); c.arc(p.x, p.y, 2.9 * s, 0, 7); c.fill();
    }
  }
  if (L.top === 'armor') {
    // pauldron
    dot(c, add(J.sF, 0, 1), 4.2 * s, pal.top);
    c.fillStyle = pal.accent; c.fillRect(J.sF.x - 3 * s, J.sF.y + 3 * s, 6 * s, 1);
  }

  // --- head ---
  drawHead(c, ch, pal, J, o);

  // --- front arm ---
  cap(c, J.sF, J.eF, d.upperW, upperCol);
  cap(c, J.eF, J.hF, d.foreW, foreCol);
  if (L.wristbands) { cap(c, mid(J.eF, J.hF, 0.75), mid(J.eF, J.hF, 0.9), d.foreW + 0.5, pal.accent, false); }
  drawHandExtras(c, ch, pal, J, J.eF, J.hF, R.fa2, false, o);
  dot(c, J.hF, d.fist, fistCol);
  if (L.gauntlets) { c.fillStyle = pal.fx; c.fillRect(J.hF.x - 1, J.hF.y - 1, 2, 2); }
  return J;
}

function drawHandExtras(c, ch, pal, J, e, h, ang, isBack, o) {
  const L = ch.look, s = ch.scale;
  if (L.weapon === 'sticks') {
    const a = (ang + 35) * D2R;
    const p1 = P2(h.x - Math.sin(a) * 4 * s, h.y - Math.cos(a) * 4 * s);
    const p2 = P2(h.x + Math.sin(a) * 21 * s, h.y + Math.cos(a) * 21 * s);
    cap(c, p1, p2, 2.2, isBack ? shade(pal.weapon, 0.7) : pal.weapon, false);
    c.fillStyle = OUT; c.fillRect(p2.x - 1, p2.y - 1, 2, 2);
  }
  if (L.weapon === 'blades') {
    const a = ang * D2R;
    const p2 = P2(h.x + Math.sin(a) * 9 * s, h.y + Math.cos(a) * 9 * s);
    const p0 = mid(e, h, 0.3);
    c.strokeStyle = pal.visor; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(p0.x, p0.y - 1); c.lineTo(p2.x, p2.y - 1); c.stroke();
  }
  if (L.weapon === 'whip' && !isBack) {
    const f = o.f;
    const m = f && f.state === 'attack' && f.move && f.move.whip ? f.move : null;
    if (m && f.mt > m.s - 2 && f.mt <= m.s + m.a + 4) drawWhip(c, ch, pal, h, m, f, o.t);
    else {
      // coiled at the hip
      c.strokeStyle = OUT; c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(J.hip.x - 4 * s, J.hip.y + 4 * s, 4 * s, 2.5 * s, 0.3, 0, 7); c.stroke();
      c.strokeStyle = pal.weapon; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(J.hip.x - 4 * s, J.hip.y + 4 * s, 4 * s, 2.5 * s, 0.3, 0, 7); c.stroke();
    }
  }
}

function drawWhip(c, ch, pal, h, m, f, t) {
  const s = ch.scale;
  const k = clamp((f.mt - m.s + 2) / 4, 0, 1);
  const seg = 14;
  const pts = [];
  if (m.whip === 2 || (m.whip === 3 && Math.floor(f.mt / 6) % 2)) {
    // swirling overhead
    for (let i = 0; i <= seg; i++) {
      const a = f.mt * 0.6 + i * 0.42;
      const r = (6 + i * 3) * s * k;
      pts.push(P2(h.x + Math.cos(a) * r * 0.9, h.y - 6 * s - i * 2.6 * s * k + Math.sin(a) * r * 0.35));
    }
  } else {
    const bx = (m.box[0] + m.box[2]) * s, by = (m.box[1] + m.box[3] / 2) * s;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const tx = lerp(h.x, bx, u * k), ty = lerp(h.y, by, u * k);
      pts.push(P2(tx, ty + Math.sin(u * 9 + t * 0.7) * 3 * u * (1 - u) * 4));
    }
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = OUT; c.lineWidth = 2.6;
  c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  c.strokeStyle = pal.weapon; c.lineWidth = 1.3;
  c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  c.fillStyle = '#fff';
  const tip = pts[pts.length - 1]; c.fillRect(tip.x - 1, tip.y - 1, 2, 2);
}

function drawHead(c, ch, pal, J, o) {
  const d = ch.dims, s = ch.scale, L = ch.look, r = d.headR, t = o.t || 0;
  const f = o.f;
  // neck
  cap(c, J.neck, mid(J.neck, J.head, 0.6), 4.5 * s * (ch.bulk > 1.2 ? 1.3 : 1), pal.skin, false);
  c.save();
  c.translate(J.head.x, J.head.y);
  c.rotate(J.headAng * D2R);
  const hc = pal.hair;
  // hair behind head
  if (L.hair === 'ponytail') {
    const sw = Math.sin(t * 0.18) * 2;
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = 5.5;
    c.beginPath(); c.moveTo(-r * 0.8, -r * 0.4); c.quadraticCurveTo(-r * 2, -r * 0.2 + sw, -r * 2.3, r * 1.3 + sw); c.stroke();
    c.strokeStyle = hc; c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(-r * 0.8, -r * 0.4); c.quadraticCurveTo(-r * 2, -r * 0.2 + sw, -r * 2.3, r * 1.3 + sw); c.stroke();
  }
  if (L.hair === 'braid') {
    const sw = Math.sin(t * 0.12) * 1.5;
    for (let i = 0; i < 6; i++) dot(c, P2(-r * 0.9 - i * 0.8 + sw * i * 0.2, r * 0.3 + i * 3.2 * s), 2.1 * s, i % 2 ? hc : shade(hc, 1.3));
    dot(c, P2(-r * 0.9 - 5 + sw, r * 0.3 + 6 * 3.2 * s), 1.4 * s, pal.accent);
  }
  if (L.hair === 'locs') {
    for (let i = 0; i < 5; i++) {
      const sw = Math.sin(t * 0.2 + i) * 1.2;
      cap(c, P2(-r * 0.2 - i * r * 0.2, -r * 0.8 + i * r * 0.25), P2(-r * 1.1 - i * r * 0.18 + sw, r * 0.6 + i * r * 0.2), 2.2 * s, i % 2 ? hc : shade(hc, 1.25), false);
    }
  }
  if (L.headband || L.hair === 'helmet') { /* handled after */ }
  if (L.headband) {
    const tx = -r * 0.9, ty = -r * 0.35;
    for (let k = 0; k < 2; k++) {
      const sw = Math.sin(t * 0.3 + k) * 2;
      cap(c, P2(tx, ty), P2(tx - 6 * s, ty + 3 + k * 3 + sw), 1.8 * s, pal.band, false);
    }
  }
  // head
  c.fillStyle = OUT; c.beginPath(); c.ellipse(0, 0, r * 0.92 + 1, r * 1.05 + 1, 0, 0, 7); c.fill();
  c.fillStyle = pal.skin; c.beginPath(); c.ellipse(0, 0, r * 0.92, r * 1.05, 0, 0, 7); c.fill();
  // jaw (a bit forward)
  c.beginPath(); c.ellipse(r * 0.25, r * 0.45, r * 0.68, r * 0.55, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(-r * 0.35, r * 0.1, r * 0.5, r * 0.85, 0, 0, 7); c.fill();
  // ear
  c.fillStyle = shade(pal.skin, 0.8); c.beginPath(); c.ellipse(-r * 0.15, r * 0.05, r * 0.2, r * 0.28, 0, 0, 7); c.fill();
  // nose
  c.fillStyle = pal.skin; c.beginPath(); c.arc(r * 0.9, r * 0.12, r * 0.18, 0, 7); c.fill();
  c.fillStyle = shade(pal.skin, 0.7); c.fillRect(r * 0.82, r * 0.22, r * 0.2, r * 0.08);

  const hurt = f && (f.state === 'hitstun' || f.state === 'airhit' || f.state === 'knockdown' || f.state === 'ko' || f.state === 'grabbed');
  if (L.hair !== 'helmet') {
    // eye
    if (hurt) {
      c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(r * 0.3, -r * 0.2); c.lineTo(r * 0.7, r * 0.05); c.moveTo(r * 0.3, r * 0.05); c.lineTo(r * 0.7, -r * 0.2); c.stroke();
    } else {
      c.fillStyle = '#fff'; c.fillRect(r * 0.32, -r * 0.18, r * 0.42, r * 0.26);
      c.fillStyle = OUT; c.fillRect(r * 0.56, -r * 0.18, r * 0.18, r * 0.28);
      if (ch.fem) { c.fillRect(r * 0.28, -r * 0.26, r * 0.5, r * 0.08); }
    }
    // brow
    c.strokeStyle = shade(hc, 0.8); c.lineWidth = ch.fem ? 0.8 : 1.3;
    c.beginPath(); c.moveTo(r * 0.22, -r * 0.42); c.lineTo(r * 0.82, -r * 0.3); c.stroke();
    // mouth
    c.strokeStyle = ch.fem ? '#7a2a2a' : shade(pal.skin, 0.55); c.lineWidth = 0.9;
    c.beginPath();
    if (hurt) { c.ellipse(r * 0.7, r * 0.6, r * 0.14, r * 0.2, 0, 0, 7); c.stroke(); }
    else { c.moveTo(r * 0.5, r * 0.62); c.lineTo(r * 0.82, r * 0.58); c.stroke(); }
  }

  // hair cap / headgear
  const capHair = (over = 1.05, frontY = -0.45, endA = 1.93) => {
    c.beginPath();
    c.ellipse(0, -r * 0.05, r * over, r * (over + 0.03), 0, Math.PI * 0.72, Math.PI * endA);
    c.lineTo(r * 0.45, r * frontY);
    c.closePath();
    c.fillStyle = hc; c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    c.fillStyle = shade(hc, 1.35);
    c.fillRect(-r * 0.4, -r * 0.92, r * 0.5, r * 0.12);
  };
  switch (L.hair) {
    case 'ponytail': capHair(1.05, -0.5); break;
    case 'braid': capHair(1.04, -0.45); break;
    case 'locs': capHair(1.08, -0.5); break;
    case 'buzz': capHair(0.97, -0.55, 1.88); break;
    case 'short': {
      capHair(1.1, -0.5);
      c.fillStyle = hc;
      for (let i = 0; i < 6; i++) { const a = Math.PI * (0.85 + i * 0.18); c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r - r * 0.05, r * 0.32, 0, 7); c.fill(); }
      break;
    }
    case 'bald':
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-r * 0.3, -r * 0.85, r * 0.45, r * 0.15);
      break;
    case 'helmet': {
      c.fillStyle = OUT; c.beginPath(); c.ellipse(0, -r * 0.05, r * 1.12 + 1, r * 1.15 + 1, 0, 0, 7); c.fill();
      c.fillStyle = hc; c.beginPath(); c.ellipse(0, -r * 0.05, r * 1.12, r * 1.15, 0, 0, 7); c.fill();
      c.fillStyle = shade(hc, 1.4); c.fillRect(-r * 0.5, -r * 1.0, r * 0.7, r * 0.15);
      // face slit
      c.fillStyle = '#05030a'; c.fillRect(r * 0.15, -r * 0.3, r * 1.0, r * 0.75);
      c.fillStyle = pal.eye; c.globalAlpha = 0.75 + Math.sin(t * 0.2) * 0.25;
      c.fillRect(r * 0.4, -r * 0.18, r * 0.55, r * 0.18);
      c.globalAlpha = 1;
      // horns
      for (const k of [0, 1]) {
        const bx = -r * 0.2 - k * r * 0.5, by = -r * 0.9;
        poly(c, [P2(bx, by), P2(bx + r * 0.5, by + r * 0.1), P2(bx - r * 0.6, by - r * 1.4), P2(bx - r * 0.9, by - r * 1.3)], k ? shade(pal.accent, 0.7) : pal.accent);
      }
      break;
    }
  }
  if (L.beard === 1) {
    poly(c, [P2(-r * 0.2, r * 0.1), P2(r * 0.9, r * 0.55), P2(r * 0.75, r * 1.0), P2(r * 0.3, r * 2.1), P2(-r * 0.25, r * 1.8), P2(-r * 0.35, r * 0.6)], hc);
    c.strokeStyle = shade(hc, 0.7); c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(r * 0.1, r * 1.1); c.lineTo(r * 0.15, r * 1.9); c.stroke();
    c.fillStyle = '#d4b060'; c.fillRect(r * 0.0, r * 1.6, r * 0.4, r * 0.18);
    c.fillStyle = hc; c.fillRect(r * 0.45, r * 0.4, r * 0.55, r * 0.15);
  }
  if (L.beard === 2) {
    c.fillStyle = hc; c.globalAlpha = 0.85;
    c.beginPath(); c.ellipse(r * 0.55, r * 0.78, r * 0.32, r * 0.22, 0, 0, 7); c.fill();
    c.fillRect(r * 0.45, r * 0.45, r * 0.45, r * 0.1);
    c.globalAlpha = 1;
  }
  if (L.headband) {
    c.fillStyle = OUT; c.fillRect(-r * 0.95, -r * 0.55, r * 1.85, r * 0.36);
    c.fillStyle = pal.band; c.fillRect(-r * 0.92, -r * 0.5, r * 1.78, r * 0.26);
  }
  if (L.visor) {
    c.fillStyle = OUT; c.fillRect(r * 0.05, -r * 0.35, r * 1.0, r * 0.45);
    c.fillStyle = pal.visor; c.globalAlpha = 0.85 + Math.sin(t * 0.15) * 0.15;
    c.fillRect(r * 0.1, -r * 0.3, r * 0.92, r * 0.32);
    c.globalAlpha = 1;
    c.fillStyle = '#fff'; c.fillRect(r * 0.75, -r * 0.28, r * 0.15, r * 0.1);
  }
  if (L.jewel) {
    c.fillStyle = pal.accent; c.fillRect(r * 0.3, -r * 0.72, r * 0.35, r * 0.12);
    c.fillRect(r * 0.42, -r * 0.62, r * 0.12, r * 0.18);
  }
  c.restore();
}

// ---------- fighter draw ----------
function drawFighter(c, f, time) {
  const ch = f.ch;
  let pal = f.pal;
  if (f.flash > 0 && f.flash % 2 === 0) pal = flashPal('#ffffff');
  else if (f.pflash > 0 && f.pflash % 4 < 2) pal = flashPal('#8ff8ff');
  else if (f.armorFlash > 0 && f.armorFlash % 4 < 2) pal = flashPal('#ffcf6a');
  if (f.hidden) return;
  c.save();
  c.translate(Math.round(f.x), Math.round(f.y));
  c.scale(f.facing, 1);
  if (f.ghost) c.globalAlpha = 0.45;
  renderBody(c, ch, pal, f.R, { t: time, f });
  c.restore();
}

function drawShadow(c, f) {
  const hgt = clamp((GROUND - f.y) / 120, 0, 1);
  c.fillStyle = 'rgba(0,0,0,' + (0.35 - hgt * 0.2) + ')';
  c.beginPath();
  c.ellipse(Math.round(f.x), GROUND + 1, 18 * f.ch.scale * f.ch.bulk * (1 - hgt * 0.4), 3, 0, 0, 7);
  c.fill();
}

// portrait: head & shoulders zoomed in a framed box
function drawPortrait(c, ch, palIdx, x, y, w, h, o = {}) {
  const pal = ch.pals[palIdx] || ch.pals[0];
  const zoom = o.zoom || 2.4;
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.bg1 || '#3a2a6a'); g.addColorStop(1, o.bg2 || '#120a2a');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const R = resolve(ch, o.pose || P.portrait);
  const J = fk(ch, R);
  c.translate(x + w / 2, y + h * (o.cy || 0.5));
  if (o.flip) c.scale(-1, 1);
  c.scale(zoom, zoom);
  c.translate(-J.head.x - ch.dims.headR * 0.2, -J.head.y - ch.dims.headR * (o.hy !== undefined ? o.hy : 0.35));
  if (o.silhouette) renderBody(c, ch, flashPal('#06040c'), R, { t: o.t || 0 });
  else renderBody(c, ch, pal, R, { t: o.t || 0 });
  c.restore();
  if (o.frame !== false) {
    c.strokeStyle = o.frameCol || '#e8c04a'; c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

// ---------- projectiles ----------
function drawProj(c, p, t) {
  const x = Math.round(p.x), y = Math.round(p.y), dir = p.dir;
  const col = p.owner.pal.fx || '#fff';
  c.save();
  switch (p.type) {
    case 'sol': case 'solbig': {
      const r = p.type === 'solbig' ? 20 : 8;
      for (let i = 4; i >= 1; i--) {
        c.fillStyle = rgba(col, 0.12);
        c.beginPath(); c.arc(x - dir * i * 5, y, r * (1 - i * 0.12), 0, 7); c.fill();
      }
      const g = c.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#ffe680'); g.addColorStop(0.75, col); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.strokeStyle = '#fff4c0'; c.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = t * 0.3 + i * 1.05;
        c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); c.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2); c.stroke();
      }
      break;
    }
    case 'kunai': {
      c.strokeStyle = rgba(col, 0.35); c.lineWidth = 4;
      c.beginPath(); c.moveTo(x - dir * 22, y); c.lineTo(x, y); c.stroke();
      c.fillStyle = OUT;
      c.beginPath(); c.moveTo(x + dir * 9, y); c.lineTo(x - dir * 3, y - 3.5); c.lineTo(x - dir * 3, y + 3.5); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(x + dir * 8, y); c.lineTo(x - dir * 2, y - 2.5); c.lineTo(x - dir * 2, y + 2.5); c.fill();
      c.fillStyle = '#fff'; c.fillRect(x - dir * 6 - 1, y - 1, 6, 2);
      break;
    }
    case 'quake': {
      for (let i = 0; i < 4; i++) {
        const sx = x - dir * i * 7, hgt = 6 + ((i + Math.floor(t / 3)) % 3) * 4;
        poly(c, [P2(sx - 4, GROUND + 1), P2(sx + dir * 1, GROUND - hgt), P2(sx + 4, GROUND + 1)], i % 2 ? '#d8f4ff' : col);
      }
      c.fillStyle = 'rgba(220,240,255,0.5)';
      for (let i = 0; i < 3; i++) c.fillRect(x - dir * rand(0, 24), GROUND - rand(4, 20), 2, 2);
      break;
    }
    case 'void': case 'blacksun': {
      const r = p.type === 'blacksun' ? 22 : 11;
      const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
      g.addColorStop(0, '#000'); g.addColorStop(0.5, '#140420'); g.addColorStop(0.7, rgba(col, 0.9)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.5, 0, 7); c.fill();
      c.strokeStyle = col; c.lineWidth = 1;
      c.beginPath(); c.ellipse(x, y, r * 1.3, r * 0.4, t * 0.08, 0, 7); c.stroke();
      c.strokeStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        const a = -t * 0.2 + i * 2.1;
        c.beginPath(); c.arc(x, y, r * 0.95, a, a + 0.6); c.stroke();
      }
      break;
    }
  }
  c.restore();
}

// ---------- effects ----------
class Fx {
  constructor(o) { Object.assign(this, { life: 12, t: 0, vx: 0, vy: 0, g: 0, size: 2, col: '#fff' }, o); this.max = this.life; }
  update() { this.t++; this.x += this.vx; this.y += this.vy; this.vy += this.g; return this.t < this.life; }
  draw(c) {
    const k = this.t / this.life, x = Math.round(this.x), y = Math.round(this.y);
    switch (this.type) {
      case 'spark': {
        const r = this.size * (0.5 + k * 1.2);
        c.strokeStyle = this.col; c.lineWidth = Math.max(1, 3 * (1 - k));
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + this.rot;
          const r1 = i % 2 ? r * 0.5 : r;
          c.moveTo(x + Math.cos(a) * r1 * 0.3, y + Math.sin(a) * r1 * 0.3);
          c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        }
        c.stroke();
        if (k < 0.35) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, this.size * 0.45 * (1 - k), 0, 7); c.fill(); }
        break;
      }
      case 'ring': {
        c.strokeStyle = this.col; c.globalAlpha = 1 - k; c.lineWidth = 2;
        c.beginPath(); c.arc(x, y, this.size * (0.3 + k * 1.4), 0, 7); c.stroke();
        c.globalAlpha = 1;
        break;
      }
      case 'block': {
        c.strokeStyle = this.col; c.lineWidth = 2; c.globalAlpha = 1 - k;
        c.beginPath(); c.arc(x, y, 6 + k * 8, -1.2, 1.2); c.stroke();
        c.globalAlpha = 1;
        break;
      }
      case 'dot': {
        c.globalAlpha = 1 - k * k; c.fillStyle = this.col;
        const s = Math.max(1, Math.round(this.size * (1 - k * 0.5)));
        c.fillRect(x, y, s, s);
        c.globalAlpha = 1;
        break;
      }
      case 'dust': {
        c.globalAlpha = 0.5 * (1 - k); c.fillStyle = this.col;
        c.beginPath(); c.arc(x, y, this.size * (0.5 + k), 0, 7); c.fill();
        c.globalAlpha = 1;
        break;
      }
      case 'text': {
        c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        text(c, this.str, x, y, { size: this.fs || 8, color: this.col, align: 'center' });
        c.globalAlpha = 1;
        break;
      }
    }
  }
}
