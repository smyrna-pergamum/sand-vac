// 5. Ok Kaçışı (Arrow Escape): each vacuum slides in its arrow direction; it
// can only leave when nothing blocks the way to the edge.
import { pick, randInt, shuffle, splitTotal } from '../core/rng.js';
import { gridHit } from '../layout.js';
import { drawVacuum, onVacuumLabel, rr } from '../draw.js';

export const AR = Object.freeze({ cols: 6, rows: 5 });
export const DIRS = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
const ARROW = { up: '↑', right: '→', down: '↓', left: '←' };

const inside = (x, y) => x >= 0 && y >= 0 && x < AR.cols && y < AR.rows;
const occupied = (items, x, y) => items.some((it) => it.x === x && it.y === y);

export function pathClear(items, x, y, dir) {
  const [dx, dy] = DIRS[dir];
  for (let cx = x + dx, cy = y + dy; inside(cx, cy); cx += dx, cy += dy) {
    if (occupied(items, cx, cy)) return false;
  }
  return true;
}

// Builds the board in "reverse removal" order, so it is always solvable:
// the last placed item had a clear path when placed and nothing came after it.
function tryPlace(specs, rng) {
  let items = [];
  for (const [k, s] of specs.entries()) {
    let placed = false;
    for (let t = 0; t < 300 && !placed; t++) {
      const x = randInt(rng, AR.cols);
      const y = randInt(rng, AR.rows);
      const dir = pick(rng, Object.keys(DIRS));
      if (!occupied(items, x, y) && pathClear(items, x, y, dir)) {
        items = [...items, { ...s, id: k + 1, x, y, dir }];
        placed = true;
      }
    }
    if (!placed) return null;
  }
  return items;
}

export function createArrowState(counts, colors, rng) {
  const parts = colors.length >= 4 ? 3 : 4;
  const specs = shuffle(rng, colors.flatMap((c) => splitTotal(counts[c], parts).map((cap) => ({ color: c, cap }))));
  for (let attempt = 0; attempt < 60; attempt++) {
    const items = tryPlace(specs, rng);
    if (items) return { items };
  }
  throw new Error('Ok bulmacası üretilemedi');
}

export function tapArrow(state, x, y) {
  const it = state.items.find((o) => o.x === x && o.y === y);
  if (!it) return { state, emitted: [], ok: false };
  const others = state.items.filter((o) => o !== it);
  if (!pathClear(others, it.x, it.y, it.dir)) return { state, emitted: [], ok: false, blocked: it.id };
  return { state: { items: others }, emitted: [{ color: it.color, cap: it.cap }], ok: true, exited: it };
}

export function solveArrow(state) {
  let items = state.items;
  const order = [];
  while (items.length) {
    const free = items.find((it) => pathClear(items.filter((o) => o !== it), it.x, it.y, it.dir));
    if (!free) return null;
    order.push(free.id);
    items = items.filter((o) => o !== free);
  }
  return order;
}

export function createArrowPuzzle({ counts, colors, rng }) {
  let state = createArrowState(counts, colors, rng);
  let shake = null;
  let flying = [];
  const board = (r) => ({ x: r.x + 4, y: r.y + 8, w: r.w - 8, h: r.h - 12 });
  return {
    hint: () => 'Okun yönü boşsa süpürge kayıp çıkar. Doğru sırayı bul!',
    tap(x, y, r) {
      const hit = gridHit(board(r), AR.cols, AR.rows, x, y);
      if (!hit) return { emitted: [], sound: null };
      const res = tapArrow(state, hit.cx, hit.cy);
      if (res.blocked) shake = { id: res.blocked, t0: performance.now() };
      if (res.exited) flying = [...flying, { it: res.exited, t0: performance.now() }];
      state = res.state;
      return { emitted: res.emitted, sound: res.emitted.length ? 'launch' : res.blocked ? 'bad' : null };
    },
    draw(ctx, r, now) {
      const b = board(r);
      const cw = b.w / AR.cols;
      const ch = b.h / AR.rows;
      ctx.fillStyle = 'rgba(160,200,220,0.25)';
      for (let y = 0; y < AR.rows; y++) {
        for (let x = 0; x < AR.cols; x++) {
          rr(ctx, b.x + x * cw + 3, b.y + y * ch + 3, cw - 6, ch - 6, 10);
          ctx.fill();
        }
      }
      const drawItem = (it, ox, oy, alpha) => {
        const cx = b.x + (it.x + 0.5) * cw + ox;
        const cy = b.y + (it.y + 0.5) * ch + oy;
        ctx.globalAlpha = alpha;
        drawVacuum(ctx, cx, cy, cw - 12, ch - 12, it.color, null);
        onVacuumLabel(ctx, it.color, ARROW[it.dir], cx, cy - 8, 18);
        onVacuumLabel(ctx, it.color, String(it.cap), cx, cy + 10, 11);
        ctx.globalAlpha = 1;
      };
      for (const it of state.items) {
        const sh = shake && shake.id === it.id && now - shake.t0 < 300 ? Math.sin((now - shake.t0) / 25) * 4 : 0;
        drawItem(it, sh, 0, 1);
      }
      flying = flying.filter((f) => now - f.t0 < 450);
      for (const f of flying) {
        const p = (now - f.t0) / 450;
        const [dx, dy] = DIRS[f.it.dir];
        drawItem(f.it, dx * p * cw * 4, dy * p * ch * 4, 1 - p);
      }
    },
    isDone: () => state.items.length === 0,
    isStuck: () => false,
  };
}
