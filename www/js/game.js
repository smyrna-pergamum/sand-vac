// Top-half simulation: sand picture, vacuums riding the rail, dock and win/lose.
// The game object is mutated by the frame loop (real-time state); puzzle logic
// in ./puzzles stays pure.
import { createRng } from './core/rng.js';
import { createSand, stepGravity, suckAt, remaining, countsByKey } from './core/sand.js';
import { N, DOCK, railPoint, cellCenter } from './layout.js';

export const RAIL_MAX = 6;
export const SPEED = 50; // rail cells per second
export const SUCK_PER_CELL = 4;
export const SPACING = 7;
const LAP = 4 * N;
const MAX_PARTICLES = 260;

export function createGame(level, seed) {
  const rng = createRng(seed);
  const sand = createSand(level.picture, N, rng);
  const total = remaining(sand);
  const puzzle = level.puzzle.create({ counts: countsByKey(sand), colors: [...sand.keys], rng });
  return {
    level, rng, sand, puzzle, total,
    rail: [], pending: [], dock: Array(DOCK.slots).fill(null),
    particles: [], pops: [],
    status: 'play', reason: '', endTimer: 0, nextId: 1, time: 0,
  };
}

export function addVacuums(g, specs) {
  for (const spec of specs) {
    const ci = g.sand.keys.indexOf(spec.color);
    if (ci < 0 || spec.cap <= 0) continue;
    g.pending.push({ id: g.nextId++, color: spec.color, ci, cap: spec.cap, left: spec.cap, s: 0, lastCell: -1 });
  }
}

export function tapDock(g, i) {
  const v = g.dock[i];
  if (!v || g.status !== 'play') return false;
  g.dock[i] = null;
  g.pending.push({ ...v, s: 0, lastCell: -1 });
  return true;
}

function launchPending(g) {
  if (!g.pending.length || g.rail.length >= RAIL_MAX) return;
  const blocked = g.rail.some((v) => v.s < SPACING);
  if (!blocked) g.rail.push(g.pending.shift());
}

function spawnParticles(g, cells, v) {
  const target = railPoint(v.s);
  for (const i of cells) {
    if (g.particles.length >= MAX_PARTICLES) return;
    const from = cellCenter(i);
    g.particles.push({ x: from.x, y: from.y, tx: target.x, ty: target.y, t: 0, color: v.color });
  }
}

function advanceVacuum(g, v, dt, events) {
  v.s += SPEED * dt;
  const cell = Math.min(LAP - 1, Math.floor(v.s));
  for (let p = v.lastCell + 1; p <= cell && v.left > 0; p++) {
    const got = suckAt(g.sand, p, v.ci, Math.min(SUCK_PER_CELL, v.left));
    if (got.length) {
      v.left -= got.length;
      spawnParticles(g, got, v);
      events.suck += got.length;
    }
  }
  v.lastCell = cell;
}

function settleRail(g, events) {
  const keep = [];
  for (const v of g.rail) {
    if (v.left <= 0) {
      const p = railPoint(v.s);
      g.pops.push({ x: p.x, y: p.y, t: 0, color: v.color });
      events.pop += 1;
    } else if (v.s >= LAP) {
      const slot = g.dock.indexOf(null);
      if (slot < 0) {
        g.status = 'lost';
        g.reason = 'lose.dock';
        events.fail = true;
      } else {
        g.dock[slot] = { ...v };
        events.dock += 1;
      }
    } else {
      keep.push(v);
    }
  }
  g.rail = keep;
}

function updateEffects(g, dt) {
  g.particles = g.particles
    .map((p) => ({ ...p, t: p.t + dt * 3.2 }))
    .filter((p) => p.t < 1);
  g.pops = g.pops.map((p) => ({ ...p, t: p.t + dt * 2.5 })).filter((p) => p.t < 1);
}

export function updateGame(g, dt) {
  const events = { suck: 0, pop: 0, dock: 0, fail: false, won: false };
  g.time += dt;
  updateEffects(g, dt);
  if (g.status !== 'play') return events;
  launchPending(g);
  for (const v of g.rail) advanceVacuum(g, v, dt, events);
  settleRail(g, events);
  stepGravity(g.sand, g.rng);
  stepGravity(g.sand, g.rng);
  if (g.status !== 'play') return events;
  if (remaining(g.sand) === 0) {
    g.endTimer += dt;
    if (g.endTimer > 0.6) {
      g.status = 'won';
      events.won = true;
    }
  } else if (g.puzzle.isStuck()) {
    g.status = 'lost';
    g.reason = 'lose.stuck';
    events.fail = true;
  }
  return events;
}

export const progress = (g) => 1 - remaining(g.sand) / g.total;
