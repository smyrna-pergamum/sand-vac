import { colorOf, shade } from './core/palette.js';

export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function label(ctx, str, x, y, size = 12, color = '#fff', align = 'center') {
  ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function text(ctx, str, x, y, size = 12, color = '#2b3a4a', align = 'center', weight = 700) {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const LIGHT_KEYS = new Set(['white', 'sun']);

const DARK = '#3d3b47';

function wheel(ctx, x, y, r) {
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9ccd6';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

// Canister vacuum cleaner in local space; the suction head points to +y.
// opts.fill (0..1) shows how full the transparent dust bin is with sand.
function vacuumBody(ctx, w, h, hex, fill, sandKey) {
  const bodyW = w * 0.74;
  const bodyH = h * 0.56;
  const left = -w / 2;
  const top = -h / 2 + h * 0.1;
  const midX = left + bodyW / 2;
  // Ribbed hose from the body's side down to the floor head (+y side).
  const hose = new Path2D();
  hose.moveTo(left + bodyW - 2, top + bodyH * 0.45);
  hose.bezierCurveTo(w * 0.52, top + bodyH * 0.45, w * 0.5, h * 0.12, w * 0.3, h / 2 - 5);
  ctx.lineCap = 'round';
  ctx.strokeStyle = DARK;
  ctx.lineWidth = Math.max(2.5, w * 0.1);
  ctx.stroke(hose);
  ctx.strokeStyle = '#7c7a88';
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.setLineDash([1.5, 2.5]);
  ctx.stroke(hose);
  ctx.setLineDash([]);
  ctx.fillStyle = DARK;
  rr(ctx, w * 0.04, h / 2 - 5, w * 0.46, Math.max(4, h * 0.14), 3);
  ctx.fill();
  ctx.fillStyle = '#9a98a6';
  ctx.fillRect(w * 0.08, h / 2 - 1, w * 0.38, 1.2);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = Math.max(1.5, w * 0.06);
  ctx.beginPath();
  ctx.arc(midX, top + 2, bodyW * 0.22, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = shade(hex, 0.72);
  rr(ctx, left, top + 2, bodyW, bodyH, bodyH * 0.45);
  ctx.fill();
  ctx.fillStyle = hex;
  rr(ctx, left, top, bodyW, bodyH - 2, bodyH * 0.45);
  ctx.fill();
  const bin = { x: midX - bodyW * 0.36, y: top + bodyH * 0.12, w: bodyW * 0.72, h: bodyH * 0.52 };
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  rr(ctx, bin.x, bin.y, bin.w, bin.h, bin.h * 0.4);
  ctx.fill();
  if (fill > 0) {
    ctx.save();
    rr(ctx, bin.x, bin.y, bin.w, bin.h, bin.h * 0.4);
    ctx.clip();
    ctx.fillStyle = shade(colorOf(sandKey), 0.9);
    const fh = bin.h * Math.min(1, fill);
    ctx.fillRect(bin.x, bin.y + bin.h - fh, bin.w, fh);
    ctx.restore();
  }
  const wr = Math.max(2.5, w * 0.11);
  wheel(ctx, left + bodyW * 0.22, top + bodyH - 1, wr);
  wheel(ctx, left + bodyW * 0.78, top + bodyH - 1, wr);
  return { labelX: midX, labelY: bin.y + bin.h / 2 };
}

// A cartoon vacuum cleaner: body colour = the sand colour it collects.
export function drawVacuum(ctx, cx, cy, w, h, key, value, opts = {}) {
  const { angle = 0, selected = false, dim = false, glow = false, scale = 1, fill = 0 } = opts;
  const hex = colorOf(key);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = dim ? 0.45 : 1;
  if (selected || glow) {
    ctx.fillStyle = selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';
    rr(ctx, -w / 2 - 4, -h / 2 - 2, w + 8, h + 6, 12);
    ctx.fill();
  }
  const { labelX, labelY } = vacuumBody(ctx, w, h, hex, fill, key);
  ctx.restore();
  if (value !== null && value !== undefined) {
    const size = Math.max(9, Math.min(15, w * 0.26)) * scale;
    // Rotate the body-local label anchor so it stays on the bin at any angle.
    const lx = (labelX * Math.cos(angle) - labelY * Math.sin(angle)) * scale;
    const ly = (labelX * Math.sin(angle) + labelY * Math.cos(angle)) * scale;
    onVacuumLabel(ctx, key, String(value), cx + lx, cy + ly, size);
  }
}

const patternCache = new Map();

// Repeating sand-grain texture for a colour (browser only).
export function grainPattern(ctx, key) {
  if (patternCache.has(key)) return patternCache.get(key);
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 24;
  const g = c.getContext('2d');
  const hex = colorOf(key);
  g.fillStyle = shade(hex, 0.8);
  g.fillRect(0, 0, 24, 24);
  const tones = [shade(hex, 1.08), hex, shade(hex, 0.93)];
  for (let y = 0; y < 24; y += 4) {
    for (let x = 0; x < 24; x += 4) {
      const ox = (y / 4) % 2 ? 2 : 0;
      g.fillStyle = tones[(x * 7 + y * 13) % 3];
      g.beginPath();
      g.arc(((x + ox) % 24) + 2, y + 2, 1.9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(((x + ox) % 24) + 1, y + 1, 1, 1);
    }
  }
  const p = ctx.createPattern(c, 'repeat');
  patternCache.set(key, p);
  return p;
}

// Text drawn on top of a vacuum body: dark ink on light bodies, outlined white otherwise.
export function onVacuumLabel(ctx, key, str, x, y, size) {
  if (LIGHT_KEYS.has(key)) text(ctx, str, x, y, size, '#3b3340', 'center', 800);
  else label(ctx, str, x, y, size);
}

// Sand-filled rectangle drawn with the grain texture.
export function sandRect(ctx, x, y, w, h, key, seed = 0) {
  ctx.save();
  ctx.translate(x - (seed % 4) * 3, y);
  ctx.fillStyle = grainPattern(ctx, key);
  ctx.fillRect((seed % 4) * 3, 0, w, h);
  ctx.restore();
}
