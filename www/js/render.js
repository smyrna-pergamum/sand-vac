import { colorOf, shade } from './core/palette.js';
import { VIEW, N, PIC, RAIL_OFF, PROGRESS, DOCK, PUZ, HINT_Y, dockRect, railPoint } from './layout.js';
import { rr, text, drawVacuum } from './draw.js';
import { progress } from './game.js';

// Each grain is a 5x5 sprite: 0 = gap, 1 = body, 2 = highlight, 3 = shadow.
const GRAIN = [
  0, 1, 1, 1, 0,
  1, 2, 2, 1, 1,
  1, 2, 1, 1, 3,
  1, 1, 1, 3, 3,
  0, 1, 3, 3, 0,
];
const TONES = [1.08, 1, 0.93, 0.86];
const grainCache = new Map();

function packRgb(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return ((255 << 24) | (c(n & 255) << 16) | (c((n >> 8) & 255) << 8) | c((n >> 16) & 255)) >>> 0;
}

// For a colour: per tone, the [unused, body, highlight, shadow] packed pixels.
function grainColors(key) {
  if (!grainCache.has(key)) {
    const hex = colorOf(key);
    grainCache.set(key, TONES.map((t) => [0, packRgb(hex, t), packRgb(hex, t * 1.22), packRgb(hex, t * 0.74)]));
  }
  return grainCache.get(key);
}

let sandBuf = null;
function sandBuffer() {
  if (!sandBuf) {
    const c = document.createElement('canvas');
    c.width = N * PIC.cs;
    c.height = N * PIC.cs;
    const cx = c.getContext('2d');
    const img = cx.createImageData(c.width, c.height);
    sandBuf = { c, cx, img, u32: new Uint32Array(img.data.buffer) };
  }
  return sandBuf;
}

function drawFrame(ctx) {
  const o = RAIL_OFF;
  ctx.fillStyle = '#d7ecf5';
  rr(ctx, PIC.x - o - 14, PIC.y - o - 14, PIC.size + 2 * o + 28, PIC.size + 2 * o + 28, 22);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 18;
  rr(ctx, PIC.x - o, PIC.y - o, PIC.size + 2 * o, PIC.size + 2 * o, 14);
  ctx.stroke();
  ctx.strokeStyle = '#b9dbe9';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  rr(ctx, PIC.x - o, PIC.y - o, PIC.size + 2 * o, PIC.size + 2 * o, 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#eef7fb';
  ctx.fillRect(PIC.x, PIC.y, PIC.size, PIC.size);
}

// Writes every grain sprite into one ImageData, then blits it once per frame.
function drawSand(ctx, sand) {
  const { cells, tone, keys } = sand;
  const palettes = keys.map(grainColors);
  const cs = PIC.cs;
  const buf = sandBuffer();
  const stride = N * cs;
  buf.u32.fill(0);
  for (let i = 0; i < N * N; i++) {
    const c = cells[i];
    if (c < 0) continue;
    const px = palettes[c][tone[i]];
    const base = Math.floor(i / N) * cs * stride + (i % N) * cs;
    for (let k = 0; k < 25; k++) {
      const m = GRAIN[k];
      if (m) buf.u32[base + Math.floor(k / 5) * stride + (k % 5)] = px[m];
    }
  }
  buf.cx.putImageData(buf.img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf.c, PIC.x, PIC.y, PIC.size, PIC.size);
  ctx.imageSmoothingEnabled = true;
}

function drawRailVacuums(ctx, g) {
  for (const v of g.rail) {
    const p = railPoint(v.s);
    drawVacuum(ctx, p.x, p.y, 34, 30, v.color, v.left, { angle: p.angle, fill: 1 - v.left / v.cap });
  }
  g.pending.slice(0, 4).forEach((v, k) => {
    drawVacuum(ctx, 22, PIC.y + 12 + k * 30, 26, 24, v.color, null, { dim: true });
  });
}

function drawEffects(ctx, g) {
  for (const p of g.particles) {
    const e = p.t * p.t;
    ctx.fillStyle = colorOf(p.color);
    const s = 2.4 * (1 - p.t * 0.5);
    ctx.beginPath();
    ctx.arc(p.x + (p.tx - p.x) * e, p.y + (p.ty - p.y) * e, s, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of g.pops) {
    ctx.globalAlpha = 1 - p.t;
    ctx.strokeStyle = colorOf(p.color);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + p.t * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawProgress(ctx, g) {
  const { x, y, w, h } = PROGRESS;
  const pct = progress(g);
  ctx.fillStyle = '#ffffff';
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#7fd36b';
  rr(ctx, x, y, Math.max(h, w * pct), h, h / 2);
  ctx.fill();
  text(ctx, `%${Math.floor(pct * 100)}`, x + w / 2, y + h / 2 + 0.5, 10, '#2b5a3a', 'center', 800);
}

function drawDock(ctx, g) {
  for (let i = 0; i < DOCK.slots; i++) {
    const r = dockRect(i);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#c4dde8';
    ctx.lineWidth = 2;
    ctx.stroke();
    const v = g.dock[i];
    if (v) drawVacuum(ctx, r.x + r.w / 2, r.y + r.h / 2, 44, 40, v.color, v.left, { glow: true, fill: 1 - v.left / v.cap });
  }
  const used = g.dock.filter(Boolean).length;
  if (used >= DOCK.slots - 1) {
    text(ctx, used === DOCK.slots ? 'İskele dolu!' : 'İskele dolmak üzere', VIEW.w / 2, DOCK.y + DOCK.h + 8, 11, '#d0453c');
  }
}

function drawPuzzlePanel(ctx, g, now) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  rr(ctx, PUZ.x - 6, PUZ.y - 8, PUZ.w + 12, PUZ.h + 14, 18);
  ctx.fill();
  g.puzzle.draw(ctx, PUZ, now);
  text(ctx, g.puzzle.hint(), VIEW.w / 2, HINT_Y, 12, '#3d5566', 'center', 600);
}

export function renderGame(ctx, g, now) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  grad.addColorStop(0, '#bfe6f7');
  grad.addColorStop(1, '#e8f6e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  drawFrame(ctx);
  drawSand(ctx, g.sand);
  drawEffects(ctx, g);
  drawRailVacuums(ctx, g);
  drawProgress(ctx, g);
  drawDock(ctx, g);
  drawPuzzlePanel(ctx, g, now);
}

// Small static thumbnail of a picture for the level menu.
export function drawThumb(canvas, picture) {
  const ctx = canvas.getContext('2d');
  const n = 40;
  const s = canvas.width / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = colorOf(picture.colorAt((x + 0.5) / n, (y + 0.5) / n));
      ctx.fillRect(x * s, y * s, Math.ceil(s), Math.ceil(s));
    }
  }
}
