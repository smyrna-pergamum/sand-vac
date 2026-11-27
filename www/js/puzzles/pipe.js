// 6. Boru Bağlama (Pipe Connect): rotate pipe tiles so sand flows from the tank
// on the left to the empty vacuum on the right. Each solved board = 1 vacuum.
import { randInt, shuffle, splitTotal } from '../core/rng.js';
import { gridHit } from '../layout.js';
import { rr, text, drawVacuum } from '../draw.js';
import { colorOf } from '../core/palette.js';

export const PP = Object.freeze({ size: 5 });
export const N_ = 1;
export const E_ = 2;
export const S_ = 4;
export const W_ = 8;
const STEP = { [N_]: [0, -1, S_], [E_]: [1, 0, W_], [S_]: [0, 1, N_], [W_]: [-1, 0, E_] };
const PIECES = [N_ | S_, E_ | W_, N_ | E_, E_ | S_, S_ | W_, W_ | N_];

export const rotateMask = (m) => ((m << 1) | (m >> 3)) & 15;
const rotateTimes = (m, k) => (k <= 0 ? m : rotateTimes(rotateMask(m), k - 1));

export function reach(board) {
  const { masks, rs, rt, size } = board;
  const start = rs * size;
  const visited = new Set();
  if (!(masks[start] & W_)) return { visited, done: false };
  const stack = [start];
  visited.add(start);
  while (stack.length) {
    const i = stack.pop();
    const x = i % size;
    const y = Math.floor(i / size);
    for (const bit of [N_, E_, S_, W_]) {
      if (!(masks[i] & bit)) continue;
      const [dx, dy, back] = STEP[bit];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const j = ny * size + nx;
      if (!visited.has(j) && masks[j] & back) {
        visited.add(j);
        stack.push(j);
      }
    }
  }
  const end = rt * size + size - 1;
  return { visited, done: visited.has(end) && Boolean(masks[end] & E_) };
}

function findPath(size, rs, rt, rng) {
  const target = rt * size + size - 1;
  const seen = new Set();
  const walk = (i) => {
    seen.add(i);
    if (i === target) return [i];
    const x = i % size;
    const y = Math.floor(i / size);
    const dirs = shuffle(rng, [N_, E_, S_, W_]);
    for (const bit of dirs) {
      const [dx, dy] = STEP[bit];
      const nx = x + dx;
      const ny = y + dy;
      const j = ny * size + nx;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen.has(j)) continue;
      const rest = walk(j);
      if (rest) return [i, ...rest];
    }
    return null;
  };
  return walk(rs * size);
}

function dirBetween(size, a, b) {
  const d = b - a;
  if (d === 1) return E_;
  if (d === -1) return W_;
  return d === size ? S_ : N_;
}

export function createBoard(size, rng) {
  const rs = randInt(rng, size);
  const rt = randInt(rng, size);
  const path = findPath(size, rs, rt, rng);
  const solution = Array.from({ length: size * size }, () => PIECES[randInt(rng, PIECES.length)]);
  path.forEach((cell, k) => {
    const prev = k === 0 ? W_ : dirBetween(size, cell, path[k - 1]);
    const next = k === path.length - 1 ? E_ : dirBetween(size, cell, path[k + 1]);
    solution[cell] = prev | next;
  });
  for (let attempt = 0; attempt < 50; attempt++) {
    const masks = solution.map((m) => rotateTimes(m, randInt(rng, 4)));
    if (!reach({ masks, rs, rt, size }).done) return { masks, rs, rt, size, path };
  }
  let masks = solution;
  for (let k = 0; k < 4 && reach({ masks, rs, rt, size }).done; k++) {
    masks = masks.map((m, i) => (i === path[0] ? rotateMask(m) : m));
  }
  return { masks, rs, rt, size, path };
}

export function createPipeState(counts, colors, rng) {
  const total = colors.reduce((s, c) => s + counts[c], 0);
  const specs = shuffle(rng, colors.flatMap((c) => {
    const parts = counts[c] / total > 0.3 ? 2 : 1;
    return splitTotal(counts[c], parts).map((cap) => ({ color: c, cap }));
  }));
  return { board: createBoard(PP.size, rng), current: specs[0], queue: specs.slice(1), solved: 0, total: specs.length };
}

export function tapPipe(state, i, rng) {
  if (!state.current) return { state, emitted: [], ok: false };
  const masks = state.board.masks.map((m, k) => (k === i ? rotateMask(m) : m));
  const board = { ...state.board, masks };
  if (!reach(board).done) return { state: { ...state, board }, emitted: [], ok: true };
  const emitted = [state.current];
  const [next = null, ...rest] = state.queue;
  const nextBoard = next ? createBoard(PP.size, rng) : board;
  return { state: { ...state, board: nextBoard, current: next, queue: rest, solved: state.solved + 1 }, emitted, ok: true };
}

function drawPipes(ctx, b, board, color) {
  const cs = b.w / board.size;
  const flow = reach(board).visited;
  board.masks.forEach((m, i) => {
    const x = b.x + (i % board.size) * cs;
    const y = b.y + Math.floor(i / board.size) * cs;
    ctx.fillStyle = '#e1edf3';
    rr(ctx, x + 2, y + 2, cs - 4, cs - 4, 8);
    ctx.fill();
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    ctx.lineCap = 'round';
    for (const [bit, dx, dy] of [[N_, 0, -1], [E_, 1, 0], [S_, 0, 1], [W_, -1, 0]]) {
      if (!(m & bit)) continue;
      ctx.strokeStyle = '#9aa9b8';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (dx * cs) / 2, cy + (dy * cs) / 2);
      ctx.stroke();
      if (flow.has(i)) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.stroke();
      }
    }
  });
}

export function createPipePuzzle({ counts, colors, rng }) {
  let state = createPipeState(counts, colors, rng);
  const board = (r) => ({ x: r.x + (r.w - 240) / 2, y: r.y + 26, w: 240, h: 240 });
  return {
    hint: () => 'Borulara dokunup döndür. Kumu süpürgeye ulaştır.',
    tap(x, y, r) {
      const hit = gridHit(board(r), PP.size, PP.size, x, y);
      if (!hit) return { emitted: [], sound: null };
      const res = tapPipe(state, hit.i, rng);
      state = res.state;
      return { emitted: res.emitted, sound: res.emitted.length ? 'launch' : 'tap' };
    },
    draw(ctx, r) {
      const b = board(r);
      const cs = b.w / PP.size;
      text(ctx, `Pano ${Math.min(state.solved + 1, state.total)} / ${state.total}`, r.x + r.w / 2, r.y + 10, 13, '#55697a');
      const key = state.current ? state.current.color : 'grey';
      drawPipes(ctx, b, state.board, colorOf(key));
      const sy = b.y + (state.board.rs + 0.5) * cs;
      ctx.fillStyle = colorOf(key);
      rr(ctx, b.x - 44, sy - 22, 38, 44, 8);
      ctx.fill();
      text(ctx, 'KUM', b.x - 25, sy, 10, '#ffffff', 'center', 800);
      const ty = b.y + (state.board.rt + 0.5) * cs;
      if (state.current) {
        drawVacuum(ctx, b.x + b.w + 26, ty, 40, 30, key, state.current.cap, { angle: Math.PI / 2, dim: true });
      }
    },
    isDone: () => state.current === null,
    isStuck: () => false,
  };
}
