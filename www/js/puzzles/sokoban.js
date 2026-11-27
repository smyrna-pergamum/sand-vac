// 4. İtme (Sokoban): push vacuum crates through the gates in the walls.
import { pick, shuffle, splitTotal } from '../core/rng.js';
import { inRect } from '../layout.js';
import { rr, text, drawVacuum } from '../draw.js';

export const SK = Object.freeze({ size: 7, maxBoxes: 4 });
const GATES = [[3, 0], [6, 3], [3, 6], [0, 3]];
const STARTS = [[2, 2], [4, 2], [2, 4], [4, 4]];

export const isGate = (x, y) => GATES.some(([gx, gy]) => gx === x && gy === y);
export const isWall = (x, y) => (x <= 0 || y <= 0 || x >= SK.size - 1 || y >= SK.size - 1) && !isGate(x, y);
const boxAt = (boxes, x, y) => boxes.findIndex((b) => b.x === x && b.y === y);

export function createSokobanState(counts, colors, rng) {
  const specs = shuffle(rng, colors.flatMap((c) => splitTotal(counts[c], 2).map((cap) => ({ color: c, cap }))));
  const boxes = specs.slice(0, SK.maxBoxes).map((s, i) => ({ ...s, x: STARTS[i][0], y: STARTS[i][1] }));
  return { player: { x: 3, y: 3 }, boxes, queue: specs.slice(SK.maxBoxes), history: [] };
}

function spawn(s, rng) {
  let { boxes, queue } = s;
  while (boxes.length < SK.maxBoxes && queue.length) {
    const free = [];
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        const isPlayer = s.player.x === x && s.player.y === y;
        if (!isPlayer && boxAt(boxes, x, y) < 0) free.push([x, y]);
      }
    }
    if (!free.length) break;
    const [x, y] = pick(rng, free);
    boxes = [...boxes, { ...queue[0], x, y }];
    queue = queue.slice(1);
  }
  return { ...s, boxes, queue };
}

export function moveSokoban(state, dx, dy, rng) {
  const px = state.player.x + dx;
  const py = state.player.y + dy;
  const blocked = { state, emitted: [], ok: false };
  if (isWall(px, py) || isGate(px, py)) return blocked;
  const snapshot = { player: state.player, boxes: state.boxes, queue: state.queue };
  const bi = boxAt(state.boxes, px, py);
  if (bi < 0) {
    return { state: { ...state, player: { x: px, y: py }, history: [...state.history, snapshot] }, emitted: [], ok: true };
  }
  const bx = px + dx;
  const by = py + dy;
  if (isWall(bx, by) || boxAt(state.boxes, bx, by) >= 0) return blocked;
  if (isGate(bx, by)) {
    const box = state.boxes[bi];
    const rest = { player: { x: px, y: py }, boxes: state.boxes.filter((_, k) => k !== bi), queue: state.queue };
    return { state: { ...spawn(rest, rng), history: [] }, emitted: [{ color: box.color, cap: box.cap }], ok: true };
  }
  const boxes = state.boxes.map((b, k) => (k === bi ? { ...b, x: bx, y: by } : b));
  return { state: { ...state, player: { x: px, y: py }, boxes, history: [...state.history, snapshot] }, emitted: [], ok: true };
}

export function undoSokoban(state) {
  if (!state.history.length) return state;
  const prev = state.history[state.history.length - 1];
  return { ...prev, history: state.history.slice(0, -1) };
}

export const sokobanDone = (s) => s.boxes.length === 0 && s.queue.length === 0;

// A crate in an inner corner can never be pushed again, so the level is lost.
const EDGE = [1, SK.size - 2];
export const sokobanStuck = (s) => s.boxes.some((b) => EDGE.includes(b.x) && EDGE.includes(b.y));

function boardRect(r) {
  const size = Math.min(r.h - 8, 252);
  return { x: r.x + 6, y: r.y + (r.h - size) / 2, w: size, h: size };
}
const undoRect = (r) => ({ x: r.x + r.w - 96, y: r.y + r.h - 64, w: 88, h: 46 });

function drawBoard(ctx, b, state) {
  const cs = b.w / SK.size;
  for (let y = 0; y < SK.size; y++) {
    for (let x = 0; x < SK.size; x++) {
      const px = b.x + x * cs;
      const py = b.y + y * cs;
      if (isGate(x, y)) {
        ctx.fillStyle = '#5d4a8a';
        rr(ctx, px + 2, py + 2, cs - 4, cs - 4, 8);
        ctx.fill();
        text(ctx, '⬤', px + cs / 2, py + cs / 2, 10, '#c9b8ff');
      } else if (isWall(x, y)) {
        ctx.fillStyle = '#c9a76b';
        rr(ctx, px + 1, py + 1, cs - 2, cs - 2, 5);
        ctx.fill();
      } else {
        ctx.fillStyle = (x + y) % 2 ? '#f3ead2' : '#ece0c2';
        ctx.fillRect(px, py, cs, cs);
      }
    }
  }
  for (const box of state.boxes) {
    drawVacuum(ctx, b.x + (box.x + 0.5) * cs, b.y + (box.y + 0.5) * cs - 1, cs - 6, cs - 8, box.color, box.cap);
  }
  const pcx = b.x + (state.player.x + 0.5) * cs;
  const pcy = b.y + (state.player.y + 0.5) * cs;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(pcx, pcy, cs * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f62a8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#2f62a8';
  for (const ex of [-0.12, 0.12]) {
    ctx.beginPath();
    ctx.arc(pcx + ex * cs, pcy - 0.04 * cs, cs * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createSokobanPuzzle({ counts, colors, rng }) {
  let state = createSokobanState(counts, colors, rng);
  return {
    hint: () => 'Oynamak için robotun yanına dokun. Kutuları mor kapılara it.',
    tap(x, y, r) {
      if (inRect(undoRect(r), x, y)) {
        state = undoSokoban(state);
        return { emitted: [], sound: 'tap' };
      }
      const b = boardRect(r);
      if (!inRect(b, x, y)) return { emitted: [], sound: null };
      const cs = b.w / SK.size;
      const dx = x - (b.x + (state.player.x + 0.5) * cs);
      const dy = y - (b.y + (state.player.y + 0.5) * cs);
      if (Math.abs(dx) < cs * 0.4 && Math.abs(dy) < cs * 0.4) return { emitted: [], sound: null };
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const res = moveSokoban(state, horizontal ? Math.sign(dx) : 0, horizontal ? 0 : Math.sign(dy), rng);
      state = res.state;
      return { emitted: res.emitted, sound: res.emitted.length ? 'launch' : res.ok ? 'tap' : 'bad' };
    },
    draw(ctx, r) {
      drawBoard(ctx, boardRect(r), state);
      const sx = r.x + r.w - 52;
      text(ctx, 'Kalan', sx, r.y + 22, 12, '#55697a');
      text(ctx, String(state.boxes.length + state.queue.length), sx, r.y + 48, 28, '#2b3a4a', 'center', 800);
      text(ctx, 'kutu', sx, r.y + 72, 12, '#55697a');
      const u = undoRect(r);
      ctx.fillStyle = state.history.length ? '#ffffff' : 'rgba(255,255,255,0.5)';
      rr(ctx, u.x, u.y, u.w, u.h, 12);
      ctx.fill();
      text(ctx, '↶ Geri al', u.x + u.w / 2, u.y + u.h / 2, 14, '#2f62a8', 'center', 800);
    },
    isDone: () => sokobanDone(state),
    isStuck: () => sokobanStuck(state),
  };
}
