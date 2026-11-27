import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../www/js/core/rng.js';
import { createMergeState, tapMerge, mergeDone, mergeStuck } from '../www/js/puzzles/merge.js';
import { createSortState, pour, canPour, isComplete, sortStuck } from '../www/js/puzzles/sort.js';
import { createMatchState, findMatches, hasMove, swapCells, M3 } from '../www/js/puzzles/match3.js';
import { createSokobanState, moveSokoban, undoSokoban, isWall, isGate } from '../www/js/puzzles/sokoban.js';
import { createArrowState, tapArrow, solveArrow, pathClear } from '../www/js/puzzles/arrow.js';
import { createBoard, reach, rotateMask, tapPipe, createPipeState, N_, E_, S_, W_ } from '../www/js/puzzles/pipe.js';

const counts = { red: 700, sky: 600, white: 300 };
const colors = Object.keys(counts);
const sumBy = (list) => list.reduce((acc, v) => ({ ...acc, [v.color]: (acc[v.color] ?? 0) + v.cap }), {});

test('merge: tiles sum to counts; equal pair merges; launch costs a move', () => {
  const s = createMergeState(counts, colors, createRng(1));
  const all = [...s.grid.filter(Boolean), ...s.queue];
  assert.deepEqual(sumBy(all), counts);
  const a = s.grid.findIndex(Boolean);
  const b = s.grid.findIndex((t, i) => i !== a && t && t.color === s.grid[a].color && t.cap === s.grid[a].cap);
  assert.ok(b >= 0);
  const s1 = tapMerge(s, a).state;
  const merged = tapMerge(s1, b).state;
  assert.equal(merged.grid[b].cap, s.grid[a].cap * 2);
  const launched = tapMerge(tapMerge(merged, b).state, b);
  assert.equal(launched.emitted[0].cap, s.grid[a].cap * 2);
  assert.equal(launched.state.moves, s.moves - 1);
});

test('merge: greedy optimal play finishes within the move budget', () => {
  let s = createMergeState(counts, colors, createRng(4));
  const emitted = [];
  for (let guard = 0; guard < 200 && !mergeDone(s); guard++) {
    const pair = findPair(s.grid);
    const res = pair ? tapMerge(tapMerge(s, pair[0]).state, pair[1]) : launchBiggest(s);
    emitted.push(...res.emitted);
    s = res.state;
  }
  assert.ok(mergeDone(s), 'all tiles used');
  assert.ok(!mergeStuck(s));
  assert.deepEqual(sumBy(emitted), counts);
});

function findPair(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = i + 1; j < grid.length; j++) {
      if (grid[i] && grid[j] && grid[i].color === grid[j].color && grid[i].cap === grid[j].cap) return [i, j];
    }
  }
  return null;
}

function launchBiggest(s) {
  const i = s.grid.reduce((best, t, k) => (t && (best < 0 || t.cap > s.grid[best].cap) ? k : best), -1);
  return tapMerge(tapMerge(s, i).state, i);
}

test('sort: layer counts, pour rules and completion emits a vacuum', () => {
  const s = createSortState(counts, colors, createRng(2));
  assert.equal(s.tubes.length, 8);
  assert.ok(!s.tubes.some(isComplete));
  assert.deepEqual(Object.fromEntries(Object.entries(s.queues).map(([c, q]) => [c, q.reduce((a, b) => a + b, 0)])), counts);
  const manual = { tubes: [['red', 'red', 'red'], ['sky', 'red'], []], queues: { red: [5], sky: [3] }, selected: null };
  assert.ok(!canPour(manual.tubes, 2, 0), 'empty source');
  const res = pour(manual, 1, 0);
  assert.deepEqual(res.emitted, [{ color: 'red', cap: 5 }]);
  assert.deepEqual(res.state.tubes, [[], ['sky'], []]);
  assert.ok(!sortStuck(res.state));
});

test('match3: no initial matches, swaps resolve and charge colours', () => {
  const rng = createRng(3);
  const s = createMatchState(counts, colors, rng);
  assert.equal(findMatches(s.grid).size, 0);
  assert.ok(hasMove(s.grid));
  const row = ['red', 'red', 'sky', 'red', 'white', 'sky'];
  assert.equal(findMatches([...row, ...Array(30).fill(null)]).size, 0);
  const grid = Array.from({ length: 36 }, (_, i) => ['red', 'sky', 'white'][(i + Math.floor(i / 6)) % 3]);
  grid[0] = 'red'; grid[1] = 'red'; grid[2] = 'sky'; grid[3] = 'red';
  const state = { ...s, grid, charge: { red: M3.threshold - 1, sky: 0, white: 0 } };
  const res = swapCells(state, 2, 3, rng);
  assert.ok(res.ok);
  assert.equal(res.emitted[0].color, 'red');
  assert.equal(res.state.queues.red.length, 2);
});

test('sokoban: walls, gates, pushing a crate out emits it and undo works', () => {
  assert.ok(isWall(0, 0) && !isWall(3, 0) && isGate(3, 0));
  const s = createSokobanState(counts, colors, createRng(5));
  assert.equal(s.boxes.length, 4);
  const blocked = { ...s, player: { x: 3, y: 1 } };
  assert.equal(moveSokoban(blocked, 0, -1, createRng(1)).ok, false, 'player cannot enter a gate');
  const lane = { player: { x: 3, y: 3 }, boxes: [{ x: 3, y: 2, color: 'red', cap: 9 }], queue: [{ color: 'sky', cap: 4 }], history: [] };
  const step1 = moveSokoban(lane, 0, -1, createRng(1));
  assert.equal(step1.state.boxes[0].y, 1);
  assert.deepEqual(undoSokoban(step1.state).player, { x: 3, y: 3 });
  const out = moveSokoban(step1.state, 0, -1, createRng(1));
  assert.deepEqual(out.emitted, [{ color: 'red', cap: 9 }]);
  assert.equal(out.state.boxes.length, 1, 'queued crate spawned');
  assert.equal(out.state.boxes[0].color, 'sky');
});

test('arrow: generated boards are always solvable and sum to counts', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createArrowState(counts, colors, createRng(seed));
    assert.ok(solveArrow(s), `seed ${seed} solvable`);
    assert.deepEqual(sumBy(s.items), counts);
  }
  const s = { items: [{ id: 1, x: 0, y: 0, dir: 'right', color: 'red', cap: 1 }, { id: 2, x: 2, y: 0, dir: 'up', color: 'sky', cap: 1 }] };
  assert.equal(tapArrow(s, 0, 0).blocked, 1);
  assert.ok(pathClear(s.items, 2, 0, 'up'));
  assert.deepEqual(tapArrow(s, 2, 0).emitted, [{ color: 'sky', cap: 1 }]);
});

test('pipe: rotation, scrambled boards unsolved, solution path connects', () => {
  assert.equal(rotateMask(N_), E_);
  assert.equal(rotateMask(W_), N_);
  assert.equal(rotateMask(N_ | S_), E_ | W_);
  for (let seed = 1; seed <= 30; seed++) {
    const board = createBoard(5, createRng(seed));
    assert.ok(!reach(board).done, 'starts unsolved');
    const masks = board.masks.map((m, cell) => {
      const k = board.path.indexOf(cell);
      if (k < 0) return m;
      const r = [0, 1, 2, 3].find((n) => fits(board, cell, k, rotateTimes(m, n)));
      return rotateTimes(m, r);
    });
    assert.ok(reach({ ...board, masks }).done, `seed ${seed} solvable`);
  }
  const st = createPipeState(counts, colors, createRng(1));
  assert.equal(st.total, 5, 'red and sky (>30%) split in two, white stays whole');
  assert.equal(tapPipe({ ...st, current: null }, 0, createRng(1)).ok, false);
});

function rotateTimes(m, k) {
  let out = m;
  for (let i = 0; i < k; i++) out = rotateMask(out);
  return out;
}

function fits(board, cell, k, mask) {
  const { path, size } = board;
  const dir = (a, b) => (b - a === 1 ? E_ : b - a === -1 ? W_ : b - a === size ? S_ : N_);
  const prev = k === 0 ? W_ : dir(cell, path[k - 1]);
  const next = k === path.length - 1 ? E_ : dir(cell, path[k + 1]);
  return (mask & prev) && (mask & next);
}

test('review fixes: corner crate is stuck, generated sort boards are solvable', async () => {
  const { sokobanStuck } = await import('../www/js/puzzles/sokoban.js');
  const { sortSolvable } = await import('../www/js/puzzles/sort.js');
  assert.ok(sokobanStuck({ boxes: [{ x: 1, y: 5 }] }));
  assert.ok(!sokobanStuck({ boxes: [{ x: 1, y: 3 }] }));
  for (let seed = 1; seed <= 8; seed++) {
    const s = createSortState({ red: 10, sky: 10, white: 10, navy: 10 }, ['red', 'sky', 'white', 'navy'], createRng(seed));
    assert.notEqual(sortSolvable(s), false, `seed ${seed}`);
  }
  const dead = { tubes: [['red', 'sky', 'red', 'sky'], ['sky', 'red', 'sky', 'red']], queues: { red: [1], sky: [1] }, selected: null };
  assert.equal(sortSolvable(dead), false);
});
