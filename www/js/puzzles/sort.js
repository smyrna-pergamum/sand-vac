// 2. Renk Sıralama: pour sand layers between tubes; a tube full of one colour
// turns into a vacuum and empties.
import { shuffle, splitTotal } from '../core/rng.js';
import { inRect } from '../layout.js';
import { rr, sandRect, text, drawVacuum } from '../draw.js';

export const TUBE_CAP = 4;
const EXTRA_TUBES = 2;

export const isComplete = (t) => t.length === TUBE_CAP && t.every((c) => c === t[0]);

function topRun(t) {
  let n = 0;
  for (let i = t.length - 1; i >= 0 && t[i] === t[t.length - 1]; i--) n += 1;
  return n;
}

export function createSortState(counts, colors, rng) {
  const sets = colors.length <= 3 ? 2 : 1;
  const queues = {};
  const layers = [];
  for (const c of colors) {
    queues[c] = splitTotal(counts[c], sets);
    for (let s = 0; s < queues[c].length * TUBE_CAP; s++) layers.push(c);
  }
  const nTubes = layers.length / TUBE_CAP;
  let tubes = [];
  const empties = Array.from({ length: EXTRA_TUBES }, () => []);
  let state = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const mixed = shuffle(rng, layers);
    tubes = Array.from({ length: nTubes }, (_, t) => mixed.slice(t * TUBE_CAP, (t + 1) * TUBE_CAP));
    if (tubes.some(isComplete)) continue;
    state = { tubes: [...tubes, ...empties], queues, selected: null };
    if (sortSolvable(state) !== false) return state;
  }
  return state ?? { tubes: [...tubes, ...empties], queues, selected: null };
}

export function canPour(tubes, a, b) {
  const A = tubes[a];
  const B = tubes[b];
  if (a === b || !A || !B || !A.length || B.length >= TUBE_CAP) return false;
  return !B.length || B[B.length - 1] === A[A.length - 1];
}

export function pour(state, a, b) {
  if (!canPour(state.tubes, a, b)) return { state: { ...state, selected: null }, emitted: [], ok: false };
  const A = state.tubes[a];
  const top = A[A.length - 1];
  const n = Math.min(topRun(A), TUBE_CAP - state.tubes[b].length);
  const poured = state.tubes.map((t, k) => {
    if (k === a) return t.slice(0, t.length - n);
    if (k === b) return [...t, ...Array(n).fill(top)];
    return t;
  });
  const emitted = [];
  let queues = state.queues;
  const tubes = poured.map((t) => {
    if (!isComplete(t)) return t;
    const c = t[0];
    const [cap, ...rest] = queues[c];
    queues = { ...queues, [c]: rest };
    if (cap) emitted.push({ color: c, cap });
    return [];
  });
  return { state: { ...state, tubes, queues, selected: null }, emitted, ok: true };
}

export const sortDone = (s) => s.tubes.every((t) => t.length === 0);

export function sortStuck(s) {
  if (sortDone(s)) return false;
  for (let a = 0; a < s.tubes.length; a++) {
    for (let b = 0; b < s.tubes.length; b++) if (canPour(s.tubes, a, b)) return false;
  }
  return true;
}

// Depth-first search over pours (with a node budget). Returns true when the
// tubes can still be emptied, false when proven impossible, null when unknown.
export function sortSolvable(state, budget = 20000) {
  const seen = new Set();
  let nodes = 0;
  const key = (tubes) => tubes.map((t) => t.join(',')).sort().join('|');
  const search = (s) => {
    if (sortDone(s)) return true;
    if (++nodes > budget) return null;
    const k = key(s.tubes);
    if (seen.has(k)) return false;
    seen.add(k);
    let unknown = false;
    for (let a = 0; a < s.tubes.length; a++) {
      for (let b = 0; b < s.tubes.length; b++) {
        if (!canPour(s.tubes, a, b)) continue;
        const r = search(pour(s, a, b).state);
        if (r === true) return true;
        if (r === null) unknown = true;
      }
    }
    return unknown ? null : false;
  };
  return search(state);
}

export function tapSort(state, i) {
  if (state.selected === null) {
    if (!state.tubes[i].length) return { state, emitted: [], ok: false };
    return { state: { ...state, selected: i }, emitted: [], ok: true };
  }
  if (state.selected === i) return { state: { ...state, selected: null }, emitted: [], ok: true };
  return pour(state, state.selected, i);
}

function tubeRects(r, count) {
  const w = 34;
  const h = TUBE_CAP * 40 + 12;
  const gap = Math.min(14, (r.w - count * w) / (count + 1));
  const total = count * w + (count - 1) * gap;
  const x0 = r.x + (r.w - total) / 2;
  const y = r.y + r.h - h - 30;
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

export function createSortPuzzle({ counts, colors, rng }) {
  let state = createSortState(counts, colors, rng);
  let deadEnd = false;
  return {
    hint: () => (state.selected === null ? 'Bir tüpe dokun, sonra dökmek istediğin tüpe dokun.' : 'Nereye dökeceksin?'),
    tap(x, y, r) {
      const rects = tubeRects(r, state.tubes.length);
      const i = rects.findIndex((rc) => inRect({ ...rc, y: rc.y - 20, h: rc.h + 40 }, x, y));
      if (i < 0) {
        state = { ...state, selected: null };
        return { emitted: [], sound: null };
      }
      const res = tapSort(state, i);
      state = res.state;
      if (res.ok && state.selected === null) deadEnd = sortSolvable(state) === false;
      return { emitted: res.emitted, sound: res.emitted.length ? 'launch' : res.ok ? 'tap' : 'bad' };
    },
    draw(ctx, r) {
      const rects = tubeRects(r, state.tubes.length);
      text(ctx, 'Aynı renkte 4 katman = 1 süpürge', r.x + r.w / 2, r.y + 14, 13, '#55697a');
      state.tubes.forEach((t, i) => {
        const rc = rects[i];
        const lift = i === state.selected ? -14 : 0;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        rr(ctx, rc.x, rc.y + lift, rc.w, rc.h, 12);
        ctx.fill();
        ctx.strokeStyle = i === state.selected ? '#ffffff' : '#a9cad8';
        ctx.lineWidth = i === state.selected ? 3 : 2;
        ctx.stroke();
        t.forEach((c, k) => {
          sandRect(ctx, rc.x + 4, rc.y + lift + rc.h - 6 - (k + 1) * 40, rc.w - 8, 38, c, i * 7 + k);
        });
      });
      const preview = Object.entries(state.queues).filter(([, q]) => q.length);
      preview.forEach(([c, q], k) => {
        drawVacuum(ctx, r.x + 30 + k * 54, r.y + r.h - 12, 40, 18, c, `×${q.length}`, { dim: true });
      });
    },
    isDone: () => sortDone(state),
    isStuck: () => deadEnd || sortStuck(state),
  };
}
