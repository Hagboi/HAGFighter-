'use strict';
// ---------- procedural stages with parallax layers ----------
const PF_FAR = 0.25, PF_MID = 0.55;
const layerW = (pf) => W + (STAGE_W - W) * pf;

function skyGrad(c, w, stops, h = H) {
  const g = c.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function ridge(c, w, base, amp, col, seed, step = 6, rough = 0.5) {
  const r = rng(seed);
  c.fillStyle = col;
  c.beginPath(); c.moveTo(0, H);
  let y = base;
  for (let x = 0; x <= w + step; x += step) {
    y = clamp(y + (r() - 0.5) * amp * rough, base - amp, base + amp * 0.3);
    c.lineTo(x, y);
  }
  c.lineTo(w, H); c.closePath(); c.fill();
}
function peaks(c, w, base, col, snow, seed, n, hmin, hmax) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, hh = hmin + r() * (hmax - hmin), ww = hh * (1.1 + r() * 0.8);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x - ww, base); c.lineTo(x, base - hh); c.lineTo(x + ww, base); c.fill();
    if (snow) {
      c.fillStyle = snow;
      c.beginPath(); c.moveTo(x - ww * 0.3, base - hh * 0.7); c.lineTo(x, base - hh); c.lineTo(x + ww * 0.3, base - hh * 0.7);
      c.lineTo(x + ww * 0.12, base - hh * 0.62); c.lineTo(x, base - hh * 0.72); c.lineTo(x - ww * 0.15, base - hh * 0.6); c.fill();
      c.fillStyle = 'rgba(40,60,110,0.25)';
      c.beginPath(); c.moveTo(x, base - hh); c.lineTo(x + ww, base); c.lineTo(x + ww * 0.2, base); c.fill();
    }
  }
}

// crowd members: drawn per frame so they can cheer
function makeCrowd(seed, xs, baseY, palette, skin) {
  const r = rng(seed);
  return xs.map((x) => ({
    x, y: baseY + Math.floor(r() * 4), shirt: palette[Math.floor(r() * palette.length)],
    skin: skin[Math.floor(r() * skin.length)], ph: r() * 6, hat: r() < 0.3, tall: r() * 4, hair: r() < 0.5 ? '#2a1a10' : '#5a3a20',
  }));
}
function drawCrowd(c, crowd, cam, t, excite, pf = 1) {
  for (const p of crowd) {
    const x = Math.round(p.x - cam * pf);
    if (x < -10 || x > W + 10) continue;
    const bob = Math.round(Math.abs(Math.sin(t * (0.08 + excite * 0.1) + p.ph)) * (1 + excite * 3));
    const y = p.y - bob - p.tall;
    c.fillStyle = OUT; c.fillRect(x - 5, y - 1, 10, 20);
    c.fillStyle = p.shirt; c.fillRect(x - 4, y, 8, 18);
    // arms
    const up = excite > 0.3 && Math.sin(t * 0.3 + p.ph) > -0.2;
    c.fillStyle = p.skin;
    if (up) { c.fillRect(x - 6, y - 7, 2, 8); c.fillRect(x + 4, y - 7, 2, 8); }
    else { c.fillRect(x - 6, y + 1, 2, 8); c.fillRect(x + 4, y + 1, 2, 8); }
    c.fillStyle = OUT; c.beginPath(); c.arc(x, y - 4, 4.5, 0, 7); c.fill();
    c.fillStyle = p.skin; c.beginPath(); c.arc(x, y - 4, 3.6, 0, 7); c.fill();
    c.fillStyle = p.hat ? '#e8d8a0' : p.hair; c.fillRect(x - 4, y - 8, 8, p.hat ? 2 : 3);
    if (p.hat) c.fillRect(x - 6, y - 6, 12, 1);
  }
}

const STAGES = [
  // ===================== 0. SUNSET HARBOR =====================
  {
    id: 'harbor', name: 'SUNSET HARBOR', music: 'harbor', place: 'RIO DE JANEIRO',
    init() {
      this.sky = mkLayer(W, H, (c) => {
        skyGrad(c, W, [[0, '#2b1b4a'], [0.3, '#7a2f5a'], [0.5, '#e0604a'], [0.6, '#ffb35a']], 130);
        // sun with retro bands
        const sx = 260, sy = 96;
        const g = c.createLinearGradient(0, sy - 36, 0, sy + 36);
        g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#ff7a3a');
        c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 36, 0, 7); c.fill();
        for (let i = 0; i < 6; i++) { c.fillStyle = '#ff9a55'; c.fillRect(sx - 40, sy + 6 + i * 5, 80, 1 + i * 0.5); }
        const r = rng(9);
        for (let i = 0; i < 9; i++) {
          c.fillStyle = r() < 0.5 ? 'rgba(255,170,200,0.55)' : 'rgba(150,70,130,0.6)';
          const cx = r() * W, cy = 20 + r() * 70, cw = 30 + r() * 70;
          c.beginPath(); c.ellipse(cx, cy, cw, 3 + r() * 3, 0, 0, 7); c.fill();
        }
      });
      this.far = mkLayer(layerW(PF_FAR), H, (c, w) => {
        ridge(c, w, 122, 10, '#6a3a6a', 5, 8);
        // Sugarloaf-like rocks
        c.fillStyle = '#4a2650';
        c.beginPath(); c.moveTo(30, 128); c.quadraticCurveTo(60, 60, 95, 128); c.fill();
        c.beginPath(); c.moveTo(80, 128); c.quadraticCurveTo(100, 95, 125, 128); c.fill();
        const r = rng(7);
        for (let x = 150; x < w; x += 6 + r() * 6) {
          const hh = 6 + r() * 16;
          c.fillStyle = '#5a2f5f'; c.fillRect(x, 126 - hh, 5 + r() * 4, hh);
          if (r() < 0.6) { c.fillStyle = '#ffd27a'; c.fillRect(x + 1, 126 - hh + 3, 1, 1); }
        }
      });
      this.mid = mkLayer(layerW(PF_MID), H, (c, w) => {
        // cranes
        const crane = (x) => {
          c.strokeStyle = '#2a1430'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(x, 140); c.lineTo(x, 60); c.lineTo(x + 70, 60); c.moveTo(x - 20, 60); c.lineTo(x, 60); c.stroke();
          c.lineWidth = 1;
          for (let y = 64; y < 140; y += 8) { c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y + 8); c.stroke(); }
          c.beginPath(); c.moveTo(x, 48); c.lineTo(x + 60, 60); c.moveTo(x, 48); c.lineTo(x - 18, 60); c.moveTo(x, 48); c.lineTo(x, 60); c.stroke();
          c.beginPath(); c.moveTo(x + 50, 60); c.lineTo(x + 50, 96); c.stroke();
          c.fillStyle = '#2a1430'; c.fillRect(x + 46, 96, 8, 6);
        };
        crane(40); crane(w - 120);
        // ships
        const ship = (x, sc) => {
          c.fillStyle = '#3a1f3a';
          c.beginPath(); c.moveTo(x, 132); c.lineTo(x + 90 * sc, 132); c.lineTo(x + 80 * sc, 142); c.lineTo(x + 8 * sc, 142); c.fill();
          c.fillRect(x + 20 * sc, 118, 30 * sc, 14);
          c.fillRect(x + 55 * sc, 110, 8 * sc, 22);
          c.fillStyle = '#ffd27a';
          for (let i = 0; i < 4; i++) c.fillRect(x + 24 * sc + i * 6 * sc, 122, 2, 2);
        };
        ship(150, 1); ship(300, 0.7);
        // lighthouse
        c.fillStyle = '#e8d8d8'; c.fillRect(w - 30, 80, 10, 56);
        c.fillStyle = '#c83a3a'; for (let y = 86; y < 136; y += 12) c.fillRect(w - 30, y, 10, 5);
        c.fillStyle = '#3a1f3a'; c.fillRect(w - 33, 74, 16, 6);
      });
      this.near = mkLayer(STAGE_W, H, (c, w) => {
        // pier deck
        const g = c.createLinearGradient(0, 168, 0, H);
        g.addColorStop(0, '#9a6a44'); g.addColorStop(1, '#6a4028');
        c.fillStyle = g; c.fillRect(0, 168, w, H - 168);
        const r = rng(4);
        let y = 168, gap = 3;
        while (y < H) { c.fillStyle = 'rgba(40,20,10,0.6)'; c.fillRect(0, y, w, 1); y += gap; gap += 1.2; }
        for (let x = 0; x < w; x += 18 + r() * 30) { c.fillStyle = 'rgba(40,20,10,0.4)'; c.fillRect(x, 168 + Math.floor(r() * 30), 1, 10); }
        // back railing
        c.fillStyle = '#4a2a1a'; c.fillRect(0, 150, w, 3); c.fillRect(0, 160, w, 2);
        for (let x = 4; x < w; x += 26) { c.fillStyle = OUT; c.fillRect(x - 1, 146, 6, 22); c.fillStyle = '#6a4028'; c.fillRect(x, 147, 4, 21); }
        // crates & barrels
        const crate = (x, yy, s) => {
          c.fillStyle = OUT; c.fillRect(x - 1, yy - 1, s + 2, s + 2);
          c.fillStyle = '#b07a44'; c.fillRect(x, yy, s, s);
          c.strokeStyle = '#6a4028'; c.lineWidth = 1; c.strokeRect(x + 1.5, yy + 1.5, s - 3, s - 3);
          c.beginPath(); c.moveTo(x + 2, yy + 2); c.lineTo(x + s - 2, yy + s - 2); c.stroke();
        };
        crate(10, 148, 20); crate(30, 152, 16); crate(14, 130, 18);
        crate(w - 40, 146, 22); crate(w - 60, 154, 14);
        const barrel = (x, yy) => {
          c.fillStyle = OUT; c.fillRect(x - 1, yy - 1, 14, 20);
          c.fillStyle = '#7a3a2a'; c.fillRect(x, yy, 12, 18);
          c.fillStyle = '#3a2a2a'; c.fillRect(x, yy + 3, 12, 2); c.fillRect(x, yy + 13, 12, 2);
        };
        barrel(56, 150); barrel(w - 80, 150);
        // bollards in front
        for (const bx of [100, w - 110]) { c.fillStyle = OUT; c.fillRect(bx - 1, 200, 12, 14); c.fillStyle = '#3a3a4a'; c.fillRect(bx, 201, 10, 12); c.fillRect(bx - 2, 200, 14, 3); }
      });
      this.crowd = makeCrowd(12, [70, 84, 96, 118, 132, 150, 470, 488, 502, 520, 540, 556, 574], 142,
        ['#e04a3a', '#3a8ad8', '#f0d040', '#5ac85a', '#f0f0f0', '#c060c0'], ['#8a5a3a', '#c08a60', '#5a3825', '#e8b898']);
    },
    draw(c, cam, t, ex) {
      c.drawImage(this.sky, 0, 0);
      c.drawImage(this.far, -Math.round(cam * PF_FAR), 0);
      // sea
      const g = c.createLinearGradient(0, 126, 0, 168);
      g.addColorStop(0, '#e88a5a'); g.addColorStop(0.4, '#9a4a6a'); g.addColorStop(1, '#3a2a5a');
      c.fillStyle = g; c.fillRect(0, 126, W, 42);
      for (let i = 0; i < 26; i++) {
        const yy = 128 + i * 1.5 + (i * i) * 0.02;
        const xo = (Math.sin(t * 0.03 + i * 1.7) * 30 + i * 47 - cam * 0.4) % W;
        c.fillStyle = i % 3 ? 'rgba(255,200,140,0.35)' : 'rgba(255,240,200,0.5)';
        c.fillRect(Math.round((xo + W) % W), Math.round(yy), 8 + (i % 5) * 4, 1);
      }
      const sx = 260 - cam * 0.1;
      for (let i = 0; i < 12; i++) {
        c.fillStyle = 'rgba(255,230,150,' + (0.4 + Math.sin(t * 0.2 + i) * 0.2) + ')';
        const ww = 30 - i * 1.5 + Math.sin(t * 0.15 + i * 2) * 4;
        c.fillRect(Math.round(sx - ww / 2), 128 + i * 3, Math.round(ww), 1);
      }
      c.drawImage(this.mid, -Math.round(cam * PF_MID), 0);
      // lighthouse beam
      const lx = layerW(PF_MID) - 25 - cam * PF_MID;
      c.fillStyle = 'rgba(255,240,180,' + (0.25 + 0.25 * Math.sin(t * 0.05)) + ')';
      c.beginPath(); c.moveTo(lx, 77); c.lineTo(lx + Math.sin(t * 0.03) * 90, 60); c.lineTo(lx + Math.sin(t * 0.03) * 90, 80); c.fill();
      // gulls
      for (let i = 0; i < 3; i++) {
        const gx = ((t * (0.3 + i * 0.1) + i * 140) % (W + 40)) - 20, gy = 40 + i * 14 + Math.sin(t * 0.05 + i) * 4;
        const wf = Math.sin(t * 0.3 + i) > 0 ? -2 : 1;
        c.strokeStyle = '#fff'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(gx - 4, gy + wf); c.lineTo(gx, gy); c.lineTo(gx + 4, gy + wf); c.stroke();
      }
      drawCrowd(c, this.crowd, cam, t, ex);
      c.drawImage(this.near, -Math.round(cam), 0);
    },
  },
  // ===================== 1. EMERALD RUINS =====================
  {
    id: 'ruins', name: 'EMERALD RUINS', music: 'ruins', place: 'KERALA, INDIA',
    init() {
      this.sky = mkLayer(W, H, (c) => {
        skyGrad(c, W, [[0, '#5ab0d8'], [0.45, '#a8e0e8'], [0.6, '#d8f0d8']], 150);
        const r = rng(3);
        for (let i = 0; i < 7; i++) {
          c.fillStyle = 'rgba(255,255,255,0.8)';
          const cx = r() * W, cy = 15 + r() * 50;
          for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(cx + k * 8, cy - (k % 2) * 4, 7 + r() * 4, 0, 7); c.fill(); }
        }
      });
      this.far = mkLayer(layerW(PF_FAR), H, (c, w) => {
        ridge(c, w, 105, 25, '#8ab8b0', 21, 10, 0.8);
        ridge(c, w, 118, 16, '#6a9a8a', 22, 8, 0.8);
      });
      this.mid = mkLayer(layerW(PF_MID), H, (c, w) => {
        // jungle trees
        const r = rng(31);
        for (let x = 0; x < w; x += 14 + r() * 10) {
          const yy = 110 + r() * 20;
          c.fillStyle = '#2a5a32';
          c.beginPath(); c.arc(x, yy, 14 + r() * 10, 0, 7); c.fill();
          c.fillStyle = '#3a7a3a';
          c.beginPath(); c.arc(x - 3, yy - 4, 8 + r() * 6, 0, 7); c.fill();
        }
        c.fillStyle = '#244a2a'; c.fillRect(0, 128, w, 30);
        // ziggurat temple
        const cx = w / 2, base = 150;
        for (let i = 0; i < 6; i++) {
          const ww = 150 - i * 22, hh = 12;
          c.fillStyle = OUT; c.fillRect(cx - ww / 2 - 1, base - (i + 1) * hh - 1, ww + 2, hh + 2);
          c.fillStyle = i % 2 ? '#8a8f6a' : '#9a9f7a'; c.fillRect(cx - ww / 2, base - (i + 1) * hh, ww, hh);
          c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(cx - ww / 2, base - (i + 1) * hh + hh - 3, ww, 3);
          c.fillStyle = '#5a8a3a';
          for (let k = 0; k < 6; k++) c.fillRect(cx - ww / 2 + r() * ww, base - (i + 1) * hh + r() * 8, 3 + r() * 6, 2);
        }
        // shrine top + doorway
        c.fillStyle = OUT; c.fillRect(cx - 17, base - 96, 34, 26);
        c.fillStyle = '#a8a882'; c.fillRect(cx - 16, base - 95, 32, 24);
        c.fillStyle = '#1a1a12'; c.fillRect(cx - 6, base - 88, 12, 17);
        c.fillStyle = '#d8b04a'; c.fillRect(cx - 18, base - 99, 36, 4);
        // steps
        c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(cx - 12, base - 70, 24, 70);
        for (let y = base - 70; y < base; y += 4) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(cx - 12, y, 24, 1); }
        // waterfall cliff
        c.fillStyle = '#5a6a52'; c.fillRect(20, 60, 50, 100);
        c.fillStyle = '#4a5a42'; c.fillRect(20, 60, 8, 100);
        c.fillStyle = '#3a7a3a'; c.beginPath(); c.arc(45, 60, 30, Math.PI, 0); c.fill();
      });
      this.near = mkLayer(STAGE_W, H, (c, w) => {
        const r = rng(8);
        c.fillStyle = '#5a6248'; c.fillRect(0, 160, w, H - 160);
        let y = 160, gap = 5;
        while (y < H) {
          c.fillStyle = 'rgba(20,30,10,0.5)'; c.fillRect(0, y, w, 1);
          const off = r() * 20;
          for (let x = off; x < w; x += 22 + gap * 2) c.fillRect(x, y, 1, gap);
          y += gap; gap += 1.5;
        }
        for (let i = 0; i < 70; i++) { c.fillStyle = r() < 0.5 ? '#4a7a32' : '#6a8a3a'; c.fillRect(r() * w, 160 + r() * 56, 3 + r() * 8, 1 + r() * 2); }
        // broken pillars
        const pillar = (x, h) => {
          c.fillStyle = OUT; c.fillRect(x - 1, 162 - h, 18, h);
          c.fillStyle = '#a8a888'; c.fillRect(x, 162 - h, 16, h);
          c.fillStyle = '#88886a'; c.fillRect(x + 11, 162 - h, 5, h);
          c.fillStyle = '#4a7a32'; c.fillRect(x, 162 - h, 16, 3);
        };
        pillar(20, 60); pillar(60, 34); pillar(w - 50, 70); pillar(w - 90, 40);
        // stone statue head
        c.fillStyle = OUT; c.fillRect(w - 150, 128, 28, 34);
        c.fillStyle = '#9a9a7a'; c.fillRect(w - 149, 129, 26, 32);
        c.fillStyle = '#5a5a42'; c.fillRect(w - 143, 138, 5, 3); c.fillRect(w - 133, 138, 5, 3); c.fillRect(w - 140, 150, 10, 2);
      });
      this.crowd = makeCrowd(44, [120, 136, 150, 500, 516, 532], 150, ['#e2862a', '#f2ece0', '#d8323c', '#2fa84f'], ['#a8693f', '#8a5a3a', '#5a3825']);
    },
    draw(c, cam, t, ex) {
      c.drawImage(this.sky, 0, 0);
      c.drawImage(this.far, -Math.round(cam * PF_FAR), 0);
      const mx = -Math.round(cam * PF_MID);
      c.drawImage(this.mid, mx, 0);
      // waterfall
      for (let i = 0; i < 18; i++) {
        const xx = mx + 30 + (i * 7) % 32, len = 10 + (i % 4) * 6;
        const yy = 60 + ((t * 2 + i * 23) % 100);
        c.fillStyle = i % 2 ? 'rgba(220,245,255,0.8)' : 'rgba(150,210,240,0.7)';
        c.fillRect(xx, yy, 2, len);
      }
      c.fillStyle = 'rgba(200,240,255,0.35)'; c.fillRect(mx + 28, 60, 34, 100);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 6; i++) c.fillRect(mx + 26 + ((t * 0.7 + i * 7) % 36), 154 + Math.sin(t * 0.2 + i) * 2, 3, 2);
      // parrots
      for (let i = 0; i < 2; i++) {
        const px = ((t * 0.6 + i * 200) % (W + 60)) - 30, py = 50 + i * 20 + Math.sin(t * 0.08 + i * 3) * 8;
        c.fillStyle = i ? '#3ab0ff' : '#e83a2a'; c.fillRect(px, py, 6, 3);
        c.fillStyle = '#f0d040'; c.fillRect(px + 6, py, 2, 2);
        c.fillStyle = i ? '#1a70c0' : '#a8201a'; c.fillRect(px + 1, py - (Math.sin(t * 0.5 + i) > 0 ? 3 : -2), 4, 2);
      }
      drawCrowd(c, this.crowd, cam, t, ex);
      c.drawImage(this.near, -Math.round(cam), 0);
    },
    drawFront(c, cam, t) {
      // hanging vines & leaves
      for (let i = 0; i < 7; i++) {
        const x = ((i * 97 + 20) - cam * 1.15) % (W + 60);
        const xx = x < -30 ? x + W + 60 : x;
        const len = 20 + (i * 13) % 40, sw = Math.sin(t * 0.03 + i) * 3;
        c.strokeStyle = '#1a4a1a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(xx, 0); c.quadraticCurveTo(xx + sw, len / 2, xx + sw * 1.5, len); c.stroke();
        c.fillStyle = '#2a6a2a';
        for (let k = 6; k < len; k += 7) { c.beginPath(); c.ellipse(xx + sw * (k / len) * 1.5 + 2, k, 3, 1.5, 0.5, 0, 7); c.fill(); }
      }
      c.fillStyle = '#1a3a1a';
      for (const [x, y, r] of [[-6, 2, 20], [14, -6, 18], [W + 6, 0, 22], [W - 16, -8, 16]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0.4, 0, 7); c.fill(); }
    },
  },
  // ===================== 2. NEON MARKET =====================
  {
    id: 'neon', name: 'NEON MARKET', music: 'neon', place: 'DETROIT, USA',
    init() {
      this.sky = mkLayer(W, H, (c) => {
        skyGrad(c, W, [[0, '#06061a'], [0.5, '#1a0c3a'], [0.7, '#3a1050']], 150);
        const r = rng(2);
        for (let i = 0; i < 60; i++) { c.fillStyle = r() < 0.2 ? '#aaf' : '#fff'; c.fillRect(r() * W, r() * 90, 1, 1); }
        c.fillStyle = '#f0f0d8'; c.beginPath(); c.arc(320, 30, 12, 0, 7); c.fill();
        c.fillStyle = '#1a0c3a'; c.beginPath(); c.arc(326, 27, 11, 0, 7); c.fill();
      });
      this.far = mkLayer(layerW(PF_FAR), H, (c, w) => {
        const r = rng(13);
        for (let x = 0; x < w; x += 10 + r() * 14) {
          const hh = 30 + r() * 70, ww = 12 + r() * 18;
          c.fillStyle = '#14122e'; c.fillRect(x, 150 - hh, ww, hh);
          for (let yy = 150 - hh + 4; yy < 146; yy += 5) for (let xx = x + 2; xx < x + ww - 2; xx += 4) if (r() < 0.35) { c.fillStyle = r() < 0.5 ? '#ffd27a' : '#5ad8ff'; c.fillRect(xx, yy, 2, 2); }
          if (r() < 0.2) { c.fillStyle = '#ff3a3a'; c.fillRect(x + ww / 2, 150 - hh - 6, 1, 6); }
        }
      });
      this.mid = mkLayer(layerW(PF_MID), H, (c, w) => {
        const r = rng(17);
        for (let x = -10; x < w; x += 50 + r() * 30) {
          const hh = 70 + r() * 40, ww = 44 + r() * 20;
          c.fillStyle = OUT; c.fillRect(x - 1, 158 - hh - 1, ww + 2, hh + 2);
          c.fillStyle = '#221e3a'; c.fillRect(x, 158 - hh, ww, hh);
          for (let yy = 158 - hh + 6; yy < 150; yy += 10) for (let xx = x + 4; xx < x + ww - 6; xx += 9) { c.fillStyle = r() < 0.4 ? '#3a2a5a' : '#ffcf7a'; c.fillRect(xx, yy, 5, 6); }
          c.fillStyle = '#2a2648'; c.fillRect(x - 3, 158 - hh, ww + 6, 4);
        }
      });
      this.signs = [
        { x: 30, y: 70, s: 'RAMEN', col: '#ff3aa0' }, { x: 130, y: 58, s: 'ARCADE', col: '#3affff' },
        { x: 250, y: 74, s: 'HAG', col: '#ffe14a' }, { x: 330, y: 62, s: '24H', col: '#7aff5a' }, { x: 410, y: 76, s: 'TACOS', col: '#ff7a3a' },
      ];
      this.near = mkLayer(STAGE_W, H, (c, w) => {
        c.fillStyle = '#16141f'; c.fillRect(0, 160, w, H - 160);
        let y = 160, gap = 4;
        while (y < H) { c.fillStyle = 'rgba(255,255,255,0.04)'; c.fillRect(0, y, w, 1); y += gap; gap += 1.5; }
        // stalls
        const stall = (x, col) => {
          c.fillStyle = OUT; c.fillRect(x - 1, 128, 62, 34);
          c.fillStyle = '#3a2a2a'; c.fillRect(x, 140, 60, 22);
          for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? col : '#f0f0f0'; c.fillRect(x + i * 10, 128, 10, 10); }
          for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? col : '#f0f0f0'; c.beginPath(); c.arc(x + i * 10 + 5, 138, 5, 0, Math.PI); c.fill(); }
          c.fillStyle = '#ffcf7a'; c.fillRect(x + 4, 146, 52, 3);
        };
        stall(10, '#d83a3a'); stall(w - 80, '#3a8ad8');
        // puddles
        c.fillStyle = 'rgba(80,60,140,0.35)';
        for (const [px, py, pw] of [[150, 205, 50], [400, 190, 60], [560, 210, 40]]) { c.beginPath(); c.ellipse(px, py, pw, 3, 0, 0, 7); c.fill(); }
      });
      this.crowd = makeCrowd(77, [82, 96, 110, 124, 470, 484, 498, 512, 528], 150, ['#3a3a5a', '#5a2a4a', '#2a4a5a', '#4a4a4a', '#6a3a2a'], ['#5a3825', '#c08a60', '#8a5a3a', '#e8b898']);
    },
    draw(c, cam, t, ex) {
      c.drawImage(this.sky, 0, 0);
      c.drawImage(this.far, -Math.round(cam * PF_FAR), 0);
      const mx = -Math.round(cam * PF_MID);
      c.drawImage(this.mid, mx, 0);
      // neon signs
      for (const s of this.signs) {
        const on = !(s.s === '24H' && Math.sin(t * 0.7) > 0.85) && !(s.s === 'RAMEN' && (t % 180) < 8);
        const x = mx + s.x, y = s.y;
        c.fillStyle = '#0a0814'; c.fillRect(x - 3, y - 3, s.s.length * 8 + 6, 14);
        c.strokeStyle = on ? s.col : '#333'; c.lineWidth = 1; c.strokeRect(x - 2.5, y - 2.5, s.s.length * 8 + 5, 13);
        if (on) { c.fillStyle = rgba(s.col, 0.18); c.fillRect(x - 8, y - 8, s.s.length * 8 + 16, 24); }
        text(c, s.s, x, y, { color: on ? '#fff' : '#555', outline: on ? s.col : '#222' });
      }
      // string lights
      for (let k = 0; k < 2; k++) {
        const y0 = 24 + k * 22;
        for (let i = 0; i < 20; i++) {
          const x = ((i * 22 - cam * (0.8 + k * 0.1)) % (W + 22) + W + 22) % (W + 22) - 11;
          const y = y0 + Math.sin((x / W) * Math.PI) * 18;
          c.fillStyle = OUT; c.fillRect(x, y - 3, 1, 3);
          const cols = ['#ff3a3a', '#ffe14a', '#3affff', '#ff3aa0'];
          const on = (Math.floor(t / 20) + i + k) % 4 !== 0;
          c.fillStyle = on ? cols[(i + k) % 4] : '#333';
          c.fillRect(x - 1, y, 3, 3);
        }
      }
      // reflections on wet floor
      for (const s of this.signs) {
        const x = Math.round(s.x - cam * 0.9 + 20);
        c.fillStyle = rgba(s.col, 0.12 + Math.sin(t * 0.1 + s.x) * 0.04);
        c.fillRect(x, 175, s.s.length * 6, 40);
      }
      drawCrowd(c, this.crowd, cam, t, ex);
      c.drawImage(this.near, -Math.round(cam), 0);
    },
  },
  // ===================== 3. FROSTPEAK MONASTERY =====================
  {
    id: 'frost', name: 'FROSTPEAK MONASTERY', music: 'frost', place: 'HIGHLANDS OF ICELAND',
    init() {
      this.sky = mkLayer(W, H, (c) => {
        skyGrad(c, W, [[0, '#7aa8d8'], [0.5, '#c8dcf0'], [0.7, '#eef4fa']], 160);
        // aurora
        for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(120,255,200,' + (0.04 + (i % 5) * 0.01) + ')'; c.fillRect(i * 10, 10 + Math.sin(i * 0.4) * 8, 10, 30); }
      });
      this.far = mkLayer(layerW(PF_FAR), H, (c, w) => {
        peaks(c, w, 140, '#9ab4d4', '#f4f8ff', 5, 7, 50, 100);
        peaks(c, w, 145, '#7a94b8', '#e8f0fa', 6, 6, 30, 60);
      });
      this.mid = mkLayer(layerW(PF_MID), H, (c, w) => {
        c.fillStyle = '#e8eef6'; c.fillRect(0, 140, w, 30);
        // monastery building
        const bx = w / 2 - 70;
        c.fillStyle = OUT; c.fillRect(bx - 1, 89, 142, 62);
        c.fillStyle = '#a8322a'; c.fillRect(bx, 90, 140, 60);
        c.fillStyle = '#f0e8d8'; c.fillRect(bx, 130, 140, 20);
        for (let i = 0; i < 6; i++) { c.fillStyle = '#2a1a1a'; c.fillRect(bx + 10 + i * 22, 100, 8, 12); c.fillStyle = '#d4a33a'; c.fillRect(bx + 9 + i * 22, 98, 10, 2); }
        c.fillStyle = '#5a2a1a'; c.fillRect(bx + 60, 128, 20, 22);
        // roofs
        const roof = (x, y, ww) => {
          c.fillStyle = OUT; c.beginPath(); c.moveTo(x - 10, y + 1); c.lineTo(x + ww / 2, y - 18); c.lineTo(x + ww + 10, y + 1); c.fill();
          c.fillStyle = '#3a2a2a'; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + ww / 2, y - 16); c.lineTo(x + ww + 8, y); c.fill();
          c.fillStyle = '#d4a33a'; c.fillRect(x - 8, y - 1, ww + 16, 2);
          c.fillStyle = '#f4f8ff'; c.beginPath(); c.moveTo(x + 6, y - 6); c.lineTo(x + ww / 2, y - 16); c.lineTo(x + ww - 6, y - 6); c.fill();
        };
        roof(bx, 90, 140); roof(bx + 40, 64, 60);
        c.fillStyle = '#a8322a'; c.fillRect(bx + 44, 64, 52, 26);
        c.fillStyle = '#d4a33a'; c.fillRect(bx + 68, 36, 4, 12); c.beginPath(); c.arc(bx + 70, 36, 3, 0, 7); c.fill();
        // prayer flags
        const cols = ['#3a6ad8', '#f0f0f0', '#d8323c', '#2fa84f', '#f0d040'];
        for (const [x1, y1, x2, y2] of [[0, 60, bx + 70, 40], [bx + 70, 40, w, 70]]) {
          c.strokeStyle = '#5a4a3a'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 14, x2, y2); c.stroke();
          for (let i = 1; i < 16; i++) {
            const u = i / 16, x = lerp(x1, x2, u), y = (1 - u) * (1 - u) * y1 + 2 * u * (1 - u) * (Math.max(y1, y2) + 14) + u * u * y2;
            c.fillStyle = cols[i % 5]; c.fillRect(x - 2, y, 5, 6);
          }
        }
      });
      this.near = mkLayer(STAGE_W, H, (c, w) => {
        c.fillStyle = '#8a909e'; c.fillRect(0, 162, w, H - 162);
        const r = rng(6);
        let y = 162, gap = 5;
        while (y < H) {
          c.fillStyle = 'rgba(30,30,50,0.45)'; c.fillRect(0, y, w, 1);
          const off = r() * 30;
          for (let x = off; x < w; x += 30 + gap * 3) c.fillRect(x, y, 1, gap);
          y += gap; gap += 1.6;
        }
        for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(240,246,255,0.85)'; c.beginPath(); c.ellipse(r() * w, 164 + r() * 50, 6 + r() * 16, 1.5 + r() * 2, 0, 0, 7); c.fill(); }
        // low wall
        c.fillStyle = OUT; c.fillRect(0, 150, w, 13);
        c.fillStyle = '#b8b4b0'; c.fillRect(0, 151, w, 11);
        for (let x = 0; x < w; x += 16) { c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, 151, 1, 11); }
        c.fillStyle = '#f4f8ff'; c.fillRect(0, 149, w, 3);
        // bell gate
        const gx = w - 120;
        c.fillStyle = OUT; c.fillRect(gx - 1, 60, 8, 104); c.fillRect(gx + 59, 60, 8, 104); c.fillRect(gx - 9, 55, 84, 9);
        c.fillStyle = '#6a3a26'; c.fillRect(gx, 61, 6, 102); c.fillRect(gx + 60, 61, 6, 102); c.fillRect(gx - 8, 56, 82, 7);
        c.fillStyle = '#f4f8ff'; c.fillRect(gx - 8, 54, 82, 2);
        // incense burner
        c.fillStyle = OUT; c.fillRect(39, 136, 26, 26);
        c.fillStyle = '#b8862e'; c.fillRect(40, 137, 24, 24);
        c.fillStyle = '#8a5a1a'; c.fillRect(40, 145, 24, 3);
      });
      this.crowd = makeCrowd(91, [96, 110, 124, 140, 440, 456, 470], 140, ['#d8762a', '#c8402a', '#e8a03a'], ['#e8b898', '#c08a60', '#f0c8a8']);
      this.snow = Array.from({ length: 70 }, (_, i) => ({ x: (i * 53) % W, y: (i * 37) % H, s: 1 + (i % 3 === 0), v: 0.3 + (i % 5) * 0.12 }));
    },
    draw(c, cam, t, ex) {
      c.drawImage(this.sky, 0, 0);
      c.drawImage(this.far, -Math.round(cam * PF_FAR), 0);
      c.drawImage(this.mid, -Math.round(cam * PF_MID), 0);
      drawCrowd(c, this.crowd, cam, t, ex);
      c.drawImage(this.near, -Math.round(cam), 0);
      // swinging bell
      const gx = STAGE_W - 120 + 33 - cam, sw = Math.sin(t * 0.04) * 0.12;
      c.save(); c.translate(gx, 64); c.rotate(sw);
      c.fillStyle = OUT; c.fillRect(-1, 0, 2, 12);
      c.fillStyle = OUT; c.beginPath(); c.moveTo(-12, 36); c.quadraticCurveTo(-12, 10, 0, 10); c.quadraticCurveTo(12, 10, 12, 36); c.closePath(); c.fill();
      c.fillStyle = '#b8862e'; c.beginPath(); c.moveTo(-11, 35); c.quadraticCurveTo(-11, 11, 0, 11); c.quadraticCurveTo(11, 11, 11, 35); c.closePath(); c.fill();
      c.fillStyle = '#e8c06a'; c.fillRect(-7, 16, 2, 16);
      c.fillStyle = '#8a5a1a'; c.fillRect(-11, 28, 22, 2);
      c.restore();
      // incense smoke
      for (let i = 0; i < 5; i++) {
        const k = ((t * 0.4 + i * 20) % 100) / 100;
        c.fillStyle = 'rgba(255,255,255,' + 0.3 * (1 - k) + ')';
        c.beginPath(); c.arc(52 - cam + Math.sin(k * 6 + i) * 4, 134 - k * 60, 2 + k * 5, 0, 7); c.fill();
      }
    },
    drawFront(c, cam, t) {
      c.fillStyle = '#fff';
      for (const s of this.snow) {
        const x = ((s.x - cam * 1.2 + Math.sin(t * 0.02 + s.y) * 10) % W + W) % W;
        const y = (s.y + t * s.v) % H;
        c.fillRect(Math.round(x), Math.round(y), s.s, s.s);
      }
    },
  },
  // ===================== 4. OBSIDIAN CITADEL (boss) =====================
  {
    id: 'citadel', name: 'OBSIDIAN CITADEL', music: 'boss', place: '???', boss: 1,
    init() {
      this.sky = mkLayer(W, H, (c) => {
        skyGrad(c, W, [[0, '#0a0204'], [0.35, '#3a0808'], [0.55, '#8a1a10'], [0.68, '#e0501a']], 150);
        const r = rng(66);
        for (let i = 0; i < 10; i++) {
          c.fillStyle = 'rgba(20,0,0,0.5)';
          const cx = r() * W, cy = 10 + r() * 60;
          c.beginPath(); c.ellipse(cx, cy, 40 + r() * 50, 4 + r() * 5, 0, 0, 7); c.fill();
        }
      });
      this.far = mkLayer(layerW(PF_FAR), H, (c, w) => {
        c.fillStyle = '#1a0606';
        c.beginPath(); c.moveTo(w / 2 - 130, 140); c.lineTo(w / 2 - 25, 58); c.lineTo(w / 2 + 25, 58); c.lineTo(w / 2 + 130, 140); c.fill();
        c.fillStyle = '#ff6a1a'; c.fillRect(w / 2 - 24, 58, 48, 3);
        c.fillStyle = 'rgba(255,90,20,0.6)';
        c.beginPath(); c.moveTo(w / 2 - 10, 60); c.lineTo(w / 2 - 20, 100); c.lineTo(w / 2 - 14, 100); c.lineTo(w / 2, 60); c.fill();
        ridge(c, w, 135, 12, '#140404', 3, 8);
      });
      this.mid = mkLayer(layerW(PF_MID), H, (c, w) => {
        const tower = (x, h, ww) => {
          c.fillStyle = OUT; c.fillRect(x - 1, 160 - h - 1, ww + 2, h + 2);
          c.fillStyle = '#16101c'; c.fillRect(x, 160 - h, ww, h);
          c.fillStyle = '#221a2a'; c.fillRect(x, 160 - h, 3, h);
          for (let i = 0; i < ww; i += 6) c.fillRect(x + i, 160 - h - 5, 4, 5);
          c.fillStyle = '#ff5a1a'; for (let y = 160 - h + 10; y < 150; y += 18) c.fillRect(x + ww / 2 - 1, y, 2, 5);
        };
        tower(10, 110, 34); tower(80, 80, 26); tower(w - 50, 120, 36); tower(w - 110, 76, 24);
        // banners
        const banner = (x) => {
          c.fillStyle = OUT; c.fillRect(x - 1, 50, 22, 62);
          c.fillStyle = '#4b1d6b'; c.fillRect(x, 51, 20, 56);
          c.beginPath(); c.moveTo(x, 107); c.lineTo(x + 10, 112); c.lineTo(x + 20, 107); c.fill();
          c.strokeStyle = '#d4a83a'; c.lineWidth = 1.5;
          c.beginPath(); c.arc(x + 10, 72, 6, 0, 7); c.stroke();
          c.beginPath(); c.moveTo(x + 10, 64); c.lineTo(x + 4, 82); c.lineTo(x + 16, 82); c.closePath(); c.stroke();
        };
        banner(150); banner(w - 170);
        // throne
        const tx = w / 2;
        c.fillStyle = OUT; c.fillRect(tx - 23, 79, 46, 82);
        c.fillStyle = '#221a2a'; c.fillRect(tx - 22, 80, 44, 80);
        c.fillStyle = '#d4a83a'; c.fillRect(tx - 22, 80, 44, 3); c.fillRect(tx - 26, 126, 52, 4);
        c.fillStyle = '#100a14'; c.fillRect(tx - 14, 90, 28, 36);
        poly(c, [P2(tx - 22, 80), P2(tx - 30, 60), P2(tx - 16, 80)], '#d4a83a');
        poly(c, [P2(tx + 22, 80), P2(tx + 30, 60), P2(tx + 16, 80)], '#d4a83a');
      });
      this.near = mkLayer(STAGE_W, H, (c, w) => {
        c.fillStyle = '#141018'; c.fillRect(0, 160, w, H - 160);
        let y = 160, gap = 5;
        while (y < H) { c.fillStyle = 'rgba(120,80,160,0.18)'; c.fillRect(0, y, w, 1); y += gap; gap += 1.6; }
        for (let x = 0; x < w; x += 40) { c.fillStyle = 'rgba(120,80,160,0.12)'; c.fillRect(x, 160, 1, 56); }
        // brazier stands
        for (const bx of [40, w - 56]) {
          c.fillStyle = OUT; c.fillRect(bx - 1, 140, 18, 24); c.fillRect(bx + 5, 128, 6, 14);
          c.fillStyle = '#3a3045'; c.fillRect(bx, 141, 16, 22);
          c.fillStyle = '#d4a83a'; c.fillRect(bx - 3, 126, 22, 4);
        }
      });
      this.cracks = [];
      const r = rng(5);
      for (let i = 0; i < 14; i++) {
        const pts = [[r() * STAGE_W, 165 + r() * 45]];
        for (let k = 0; k < 4; k++) pts.push([pts[k][0] + (r() - 0.5) * 30, pts[k][1] + (r() - 0.5) * 8]);
        this.cracks.push(pts);
      }
      this.embers = Array.from({ length: 40 }, (_, i) => ({ x: (i * 71) % STAGE_W, y: (i * 29) % H, v: 0.3 + (i % 4) * 0.2 }));
    },
    draw(c, cam, t, ex) {
      c.drawImage(this.sky, 0, 0);
      // lightning
      const lt = t % 240;
      if (lt < 6) {
        c.fillStyle = 'rgba(255,220,255,' + (0.4 - lt * 0.06) + ')'; c.fillRect(0, 0, W, H);
        const lx = (Math.floor(t / 240) * 137) % W;
        c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(lx, 0);
        const r = rng(Math.floor(t / 240) + 1);
        let x = lx; for (let y = 10; y < 120; y += 10) { x += (r() - 0.5) * 20; c.lineTo(x, y); }
        c.stroke();
      }
      c.drawImage(this.far, -Math.round(cam * PF_FAR), 0);
      // lava glow on horizon
      c.fillStyle = 'rgba(255,80,20,' + (0.15 + Math.sin(t * 0.05) * 0.05) + ')'; c.fillRect(0, 128, W, 32);
      c.drawImage(this.mid, -Math.round(cam * PF_MID), 0);
      c.drawImage(this.near, -Math.round(cam), 0);
      // glowing cracks
      c.strokeStyle = 'rgba(255,90,30,' + (0.55 + Math.sin(t * 0.06) * 0.35) + ')'; c.lineWidth = 1;
      for (const pts of this.cracks) {
        c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0] - cam, p[1]) : c.moveTo(p[0] - cam, p[1]))); c.stroke();
      }
      // brazier flames
      for (const bx of [48, STAGE_W - 48]) {
        for (let i = 0; i < 6; i++) {
          const fh = 8 + Math.sin(t * 0.4 + i * 2) * 4 + i;
          c.fillStyle = i < 2 ? '#ffe680' : i < 4 ? '#ff9a2a' : 'rgba(255,60,20,0.7)';
          c.beginPath(); c.ellipse(bx - cam + Math.sin(t * 0.3 + i) * 2, 124 - fh / 2, 5 - i * 0.5, fh / 1.5, 0, 0, 7); c.fill();
        }
      }
    },
    drawFront(c, cam, t) {
      for (const e of this.embers) {
        const x = ((e.x - cam + Math.sin(t * 0.03 + e.y) * 8) % STAGE_W + STAGE_W) % STAGE_W;
        if (x > W) continue;
        const y = H - ((e.y + t * e.v) % H);
        c.fillStyle = (Math.floor(t / 6) + e.x) % 3 ? '#ff9a2a' : '#ffe680';
        c.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    },
  },
];
STAGES.forEach((s) => {
  const init = s.init;
  s.ready = false;
  s.ensure = function () { if (!this.ready) { init.call(this); this.ready = true; } };
});
