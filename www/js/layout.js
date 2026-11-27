// Logical (unscaled) coordinates for a portrait phone screen.
export const VIEW = Object.freeze({ w: 400, h: 740 });
export const N = 56;
export const PIC = Object.freeze({ x: 60, y: 26, cs: 5, size: 280 });
export const RAIL_OFF = 19;
export const PROGRESS = Object.freeze({ x: 44, y: 340, w: 312, h: 12 });
export const DOCK = Object.freeze({ y: 364, h: 50, w: 58, gap: 8, slots: 5 });
export const PUZ = Object.freeze({ x: 16, y: 430, w: 368, h: 276 });
export const HINT_Y = 724;

export function dockRect(i) {
  const total = DOCK.slots * DOCK.w + (DOCK.slots - 1) * DOCK.gap;
  const x0 = (VIEW.w - total) / 2;
  return { x: x0 + i * (DOCK.w + DOCK.gap), y: DOCK.y, w: DOCK.w, h: DOCK.h };
}

export const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Rail position s (in cells, 0..4N) -> screen point and nozzle angle.
export function railPoint(s) {
  const { x, y, cs, size } = PIC;
  const o = RAIL_OFF;
  const side = Math.floor(s / N) % 4;
  const f = s - Math.floor(s / N) * N;
  const along = (f + 0.5) * cs;
  if (side === 0) return { x: x + along, y: y - o, angle: 0 };
  if (side === 1) return { x: x + size + o, y: y + along, angle: Math.PI / 2 };
  if (side === 2) return { x: x + size - along, y: y + size + o, angle: Math.PI };
  return { x: x - o, y: y + size - along, angle: -Math.PI / 2 };
}

export function cellCenter(i) {
  const cx = i % N;
  const cy = Math.floor(i / N);
  return { x: PIC.x + (cx + 0.5) * PIC.cs, y: PIC.y + (cy + 0.5) * PIC.cs };
}

// Maps a point in rect r to grid cell (cols x rows), or null when outside.
export function gridHit(r, cols, rows, x, y) {
  if (!inRect(r, x, y)) return null;
  const cx = Math.floor(((x - r.x) / r.w) * cols);
  const cy = Math.floor(((y - r.y) / r.h) * rows);
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return null;
  return { cx, cy, i: cy * cols + cx };
}
