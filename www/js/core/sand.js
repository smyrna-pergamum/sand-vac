// Falling-sand grid. Typed arrays are mutated in place on purpose: this runs
// every frame on ~1600 cells and allocating new arrays would cause GC stutter.
export const SLIDE_CHANCE = 0.35;

export function createSand(picture, n, rng) {
  const keys = [];
  const cells = new Int8Array(n * n).fill(-1);
  const tone = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const key = picture.colorAt((x + 0.5) / n, (y + 0.5) / n);
      let ci = keys.indexOf(key);
      if (ci < 0) {
        keys.push(key);
        ci = keys.length - 1;
      }
      const i = y * n + x;
      cells[i] = ci;
      tone[i] = Math.floor(rng() * 4);
    }
  }
  const counts = new Int32Array(keys.length);
  for (const c of cells) if (c >= 0) counts[c] += 1;
  return { n, cells, tone, keys, counts };
}

export const remaining = (sand) => sand.counts.reduce((s, c) => s + c, 0);

export function countsByKey(sand) {
  return Object.fromEntries(sand.keys.map((k, i) => [k, sand.counts[i]]));
}

function move(sand, from, to) {
  sand.cells[to] = sand.cells[from];
  sand.tone[to] = sand.tone[from];
  sand.cells[from] = -1;
}

export function stepGravity(sand, rng) {
  const { n, cells } = sand;
  let moved = false;
  for (let y = n - 2; y >= 0; y--) {
    const ltr = rng() < 0.5;
    for (let k = 0; k < n; k++) {
      const x = ltr ? k : n - 1 - k;
      const i = y * n + x;
      if (cells[i] < 0) continue;
      const below = i + n;
      if (cells[below] < 0) {
        move(sand, i, below);
        moved = true;
        continue;
      }
      if (rng() > SLIDE_CHANCE) continue;
      const d = rng() < 0.5 ? -1 : 1;
      for (const dx of [d, -d]) {
        const nx = x + dx;
        if (nx < 0 || nx >= n) continue;
        if (cells[below + dx] < 0 && cells[i + dx] < 0) {
          move(sand, i, below + dx);
          moved = true;
          break;
        }
      }
    }
  }
  return moved;
}

// Rail position p in [0, 4n) -> the inward ray the vacuum looks along.
export function rayOf(n, p) {
  const side = Math.floor(p / n);
  const f = p - side * n;
  if (side === 0) return { x: f, y: 0, dx: 0, dy: 1 };
  if (side === 1) return { x: n - 1, y: f, dx: -1, dy: 0 };
  if (side === 2) return { x: n - 1 - f, y: n - 1, dx: 0, dy: -1 };
  return { x: 0, y: n - 1 - f, dx: 1, dy: 0 };
}

export function firstGrain(sand, p) {
  const { n, cells } = sand;
  let { x, y } = rayOf(n, p);
  const { dx, dy } = rayOf(n, p);
  while (x >= 0 && x < n && y >= 0 && y < n) {
    const i = y * n + x;
    if (cells[i] >= 0) return i;
    x += dx;
    y += dy;
  }
  return -1;
}

// Removes up to `max` grains of colour ci visible from rail position p.
export function suckAt(sand, p, ci, max) {
  const out = [];
  while (out.length < max) {
    const i = firstGrain(sand, p);
    if (i < 0 || sand.cells[i] !== ci) break;
    sand.cells[i] = -1;
    sand.counts[ci] -= 1;
    out.push(i);
  }
  return out;
}
