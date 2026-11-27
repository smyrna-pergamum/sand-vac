// 1. Sayı Birleştirme: merge two equal vacuums (same colour, same number) into
// one with double capacity. Every launch costs one move, so merging matters.
import { shuffle } from '../core/rng.js';
import { gridHit } from '../layout.js';
import { drawVacuum, text } from '../draw.js';
import { t } from '../i18n.js';

export const MERGE = Object.freeze({ cols: 4, rows: 4, slack: 2 });
const TOP = 30;

export function createMergeState(counts, colors, rng) {
  let id = 1;
  const tiles = [];
  let optimal = 0;
  for (const c of colors) {
    const total = counts[c];
    const p = Math.floor(total / 4);
    if (p > 0) {
      for (let k = 0; k < 4; k++) tiles.push({ id: id++, color: c, cap: p });
      optimal += 1;
    }
    const r = total - 4 * p;
    if (r > 0) {
      tiles.push({ id: id++, color: c, cap: r });
      optimal += 1;
    }
  }
  const mixed = shuffle(rng, tiles);
  const size = MERGE.cols * MERGE.rows;
  return {
    grid: Array.from({ length: size }, (_, i) => mixed[i] ?? null),
    queue: mixed.slice(size),
    moves: optimal + MERGE.slack,
    selected: null,
    nextId: id,
  };
}

function refill(grid, queue, i) {
  const [next = null, ...rest] = queue;
  return { grid: grid.map((t, k) => (k === i ? next : t)), queue: rest };
}

export const canMerge = (a, b) => Boolean(a && b && a.color === b.color && a.cap === b.cap);

export function tapMerge(state, i) {
  const tile = state.grid[i];
  const sel = state.selected;
  if (!tile) return { state: { ...state, selected: null }, emitted: [], ok: false };
  if (sel === null) return { state: { ...state, selected: i }, emitted: [], ok: true };
  if (sel === i) {
    if (state.moves <= 0) return { state: { ...state, selected: null }, emitted: [], ok: false };
    const { grid, queue } = refill(state.grid, state.queue, i);
    return {
      state: { ...state, grid, queue, moves: state.moves - 1, selected: null },
      emitted: [{ color: tile.color, cap: tile.cap }],
      ok: true,
    };
  }
  if (canMerge(state.grid[sel], tile)) {
    const merged = { id: state.nextId, color: tile.color, cap: tile.cap * 2 };
    const withMerged = state.grid.map((t, k) => (k === i ? merged : t));
    const { grid, queue } = refill(withMerged, state.queue, sel);
    return { state: { ...state, grid, queue, selected: null, nextId: state.nextId + 1 }, emitted: [], ok: true };
  }
  return { state: { ...state, selected: i }, emitted: [], ok: true };
}

export const mergeDone = (s) => s.queue.length === 0 && s.grid.every((t) => t === null);
export const mergeStuck = (s) => !mergeDone(s) && s.moves <= 0;

export function createMergePuzzle({ counts, colors, rng }) {
  let state = createMergeState(counts, colors, rng);
  const area = (r) => ({ x: r.x, y: r.y + TOP, w: r.w, h: r.h - TOP });
  return {
    hint: () => (state.selected === null
      ? t('merge.hint')
      : t('merge.hintSelected')),
    tap(x, y, r) {
      const hit = gridHit(area(r), MERGE.cols, MERGE.rows, x, y);
      if (!hit) return { emitted: [], sound: null };
      const res = tapMerge(state, hit.i);
      state = res.state;
      return { emitted: res.emitted, sound: res.emitted.length ? 'launch' : res.ok ? 'tap' : 'bad' };
    },
    draw(ctx, r) {
      text(ctx, t('merge.moves', { n: state.moves }), r.x + 8, r.y + 12, 14, '#2b3a4a', 'left', 800);
      text(ctx, t('merge.queue', { n: state.queue.length }), r.x + r.w - 8, r.y + 12, 13, '#55697a', 'right');
      const a = area(r);
      const cw = a.w / MERGE.cols;
      const ch = a.h / MERGE.rows;
      const sel = state.selected !== null ? state.grid[state.selected] : null;
      state.grid.forEach((t, i) => {
        if (!t) return;
        const cx = a.x + (i % MERGE.cols + 0.5) * cw;
        const cy = a.y + (Math.floor(i / MERGE.cols) + 0.5) * ch;
        const isSel = i === state.selected;
        const glow = !isSel && canMerge(sel, t);
        drawVacuum(ctx, cx, cy - 2, cw - 18, ch - 18, t.color, t.cap, { selected: isSel, glow, scale: isSel ? 1.06 : 1 });
      });
    },
    isDone: () => mergeDone(state),
    isStuck: () => mergeStuck(state),
  };
}
