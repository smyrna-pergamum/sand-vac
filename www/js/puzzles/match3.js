// 3. Match-3: swap neighbours to line up 3+. Every cleared gem charges its
// colour; a full charge releases the next vacuum of that colour.
import { pick, shuffle, splitTotal } from '../core/rng.js';
import { gridHit } from '../layout.js';
import { rr, sandRect, text, drawVacuum } from '../draw.js';
import { colorOf } from '../core/palette.js';

export const M3 = Object.freeze({ w: 6, h: 6, threshold: 6, parts: 3 });

const idx = (x, y) => y * M3.w + x;

export function findMatches(grid) {
  const out = new Set();
  const scan = (len, at) => {
    let run = 1;
    for (let k = 1; k <= len; k++) {
      const same = k < len && grid[at(k)] !== null && grid[at(k)] === grid[at(k - 1)];
      if (same) {
        run += 1;
      } else {
        if (run >= 3) for (let j = k - run; j < k; j++) out.add(at(j));
        run = 1;
      }
    }
  };
  for (let y = 0; y < M3.h; y++) scan(M3.w, (k) => idx(k, y));
  for (let x = 0; x < M3.w; x++) scan(M3.h, (k) => idx(x, k));
  return out;
}

const adjacent = (a, b) => {
  const dx = Math.abs((a % M3.w) - (b % M3.w));
  const dy = Math.abs(Math.floor(a / M3.w) - Math.floor(b / M3.w));
  return dx + dy === 1;
};

const swapped = (grid, a, b) => grid.map((v, i) => (i === a ? grid[b] : i === b ? grid[a] : v));

export function hasMove(grid) {
  for (let i = 0; i < grid.length; i++) {
    const right = i % M3.w < M3.w - 1 ? i + 1 : -1;
    const down = i + M3.w < grid.length ? i + M3.w : -1;
    for (const j of [right, down]) {
      if (j >= 0 && findMatches(swapped(grid, i, j)).size) return true;
    }
  }
  return false;
}

function randomGrid(colors, rng) {
  const grid = Array(M3.w * M3.h).fill(null);
  for (let i = 0; i < grid.length; i++) {
    const x = i % M3.w;
    const banned = new Set();
    if (x >= 2 && grid[i - 1] === grid[i - 2]) banned.add(grid[i - 1]);
    if (i >= 2 * M3.w && grid[i - M3.w] === grid[i - 2 * M3.w]) banned.add(grid[i - M3.w]);
    const options = colors.filter((c) => !banned.has(c));
    grid[i] = pick(rng, options.length ? options : colors);
  }
  return grid;
}

function playableGrid(colors, rng) {
  for (let k = 0; k < 100; k++) {
    const g = randomGrid(colors, rng);
    if (!findMatches(g).size && hasMove(g)) return g;
  }
  return randomGrid(colors, rng);
}

export function collapse(grid, colors, rng) {
  const out = [...grid];
  for (let x = 0; x < M3.w; x++) {
    const col = [];
    for (let y = M3.h - 1; y >= 0; y--) if (out[idx(x, y)] !== null) col.push(out[idx(x, y)]);
    for (let y = M3.h - 1, k = 0; y >= 0; y--, k++) out[idx(x, y)] = k < col.length ? col[k] : pick(rng, colors);
  }
  return out;
}

export function createMatchState(counts, colors, rng) {
  return {
    grid: playableGrid(colors, rng),
    colors,
    queues: Object.fromEntries(colors.map((c) => [c, splitTotal(counts[c], M3.parts)])),
    charge: Object.fromEntries(colors.map((c) => [c, 0])),
    selected: null,
  };
}

function release(queues, charge, colors) {
  const emitted = [];
  const q = { ...queues };
  const ch = { ...charge };
  for (const c of colors) {
    while (ch[c] >= M3.threshold && q[c].length) {
      emitted.push({ color: c, cap: q[c][0] });
      q[c] = q[c].slice(1);
      ch[c] -= M3.threshold;
    }
  }
  return { emitted, queues: q, charge: ch };
}

export function swapCells(state, a, b, rng) {
  if (!adjacent(a, b)) return { state: { ...state, selected: b }, emitted: [], ok: false };
  let grid = swapped(state.grid, a, b);
  let matches = findMatches(grid);
  if (!matches.size) return { state: { ...state, selected: null }, emitted: [], ok: false };
  const charge = { ...state.charge };
  for (let cascade = 0; matches.size && cascade < 50; cascade++) {
    for (const i of matches) if (state.queues[grid[i]].length) charge[grid[i]] += 1;
    const cleared = grid.map((v, i) => (matches.has(i) ? null : v));
    grid = collapse(cleared, state.colors, rng);
    matches = findMatches(grid);
  }
  if (!hasMove(grid)) grid = playableGrid(state.colors, rng);
  const out = release(state.queues, charge, state.colors);
  return { state: { ...state, grid, queues: out.queues, charge: out.charge, selected: null }, emitted: out.emitted, ok: true };
}

export const matchDone = (s) => s.colors.every((c) => s.queues[c].length === 0);

export function createMatchPuzzle({ counts, colors, rng }) {
  let state = createMatchState(counts, colors, rng);
  const board = (r) => ({ x: r.x + 4, y: r.y + 4, w: 252, h: 252 });
  return {
    hint: () => 'Yan yana iki taşı değiştir, 3 aynı rengi diz.',
    tap(x, y, r) {
      const hit = gridHit(board(r), M3.w, M3.h, x, y);
      if (!hit) return { emitted: [], sound: null };
      if (state.selected === null) {
        state = { ...state, selected: hit.i };
        return { emitted: [], sound: 'tap' };
      }
      if (state.selected === hit.i) {
        state = { ...state, selected: null };
        return { emitted: [], sound: 'tap' };
      }
      const res = swapCells(state, state.selected, hit.i, rng);
      state = res.state;
      return { emitted: res.emitted, sound: res.emitted.length ? 'launch' : res.ok ? 'tap' : 'bad' };
    },
    draw(ctx, r) {
      const b = board(r);
      const cs = b.w / M3.w;
      state.grid.forEach((c, i) => {
        const x = b.x + (i % M3.w) * cs;
        const y = b.y + Math.floor(i / M3.w) * cs;
        ctx.save();
        rr(ctx, x + 3, y + 3, cs - 6, cs - 6, 9);
        ctx.clip();
        sandRect(ctx, x + 3, y + 3, cs - 6, cs - 6, c, i * 13);
        ctx.restore();
        if (i === state.selected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          rr(ctx, x + 2, y + 2, cs - 4, cs - 4, 10);
          ctx.stroke();
        }
      });
      const sx = b.x + b.w + 14;
      text(ctx, 'Doluluk', sx, r.y + 14, 12, '#55697a', 'left');
      state.colors.forEach((c, k) => {
        const y = r.y + 40 + k * 56;
        const q = state.queues[c];
        drawVacuum(ctx, sx + 20, y, 38, 26, c, q.length ? q[0] : '✓', { dim: !q.length });
        ctx.fillStyle = '#d5e4ec';
        rr(ctx, sx + 44, y - 6, 52, 12, 6);
        ctx.fill();
        ctx.fillStyle = colorOf(c);
        const pct = q.length ? Math.min(1, state.charge[c] / M3.threshold) : 1;
        rr(ctx, sx + 44, y - 6, Math.max(12, 52 * pct), 12, 6);
        ctx.fill();
        text(ctx, `×${q.length}`, sx + 70, y + 16, 11, '#55697a');
      });
    },
    isDone: () => matchDone(state),
    isStuck: () => !matchDone(state) && !hasMove(state.grid),
  };
}
