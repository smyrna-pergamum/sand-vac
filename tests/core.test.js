import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, splitTotal, shuffle } from '../www/js/core/rng.js';
import { createSand, stepGravity, suckAt, remaining, rayOf, firstGrain } from '../www/js/core/sand.js';
import { PICTURES } from '../www/js/core/pictures.js';

test('splitTotal sums to total and stays near-equal', () => {
  for (const [t, p] of [[100, 3], [7, 4], [1, 5], [1600, 8]]) {
    const parts = splitTotal(t, p);
    assert.equal(parts.reduce((a, b) => a + b, 0), t);
    assert.ok(Math.max(...parts) - Math.min(...parts) <= 1);
  }
  assert.deepEqual(splitTotal(0, 3), []);
});

test('rng is deterministic and shuffle keeps elements', () => {
  const a = createRng(5);
  const b = createRng(5);
  assert.equal(a(), b());
  const s = shuffle(createRng(9), [1, 2, 3, 4, 5]);
  assert.deepEqual([...s].sort(), [1, 2, 3, 4, 5]);
});

test('every picture rasterises into 3-5 colours', () => {
  for (const pic of Object.values(PICTURES)) {
    const sand = createSand(pic, 40, createRng(1));
    assert.ok(sand.keys.length >= 3 && sand.keys.length <= 5, `${pic.name}: ${sand.keys}`);
    assert.equal(remaining(sand), 40 * 40);
  }
});

test('rays point inward from all four rail sides', () => {
  assert.deepEqual(rayOf(10, 0), { x: 0, y: 0, dx: 0, dy: 1 });
  assert.deepEqual(rayOf(10, 10), { x: 9, y: 0, dx: -1, dy: 0 });
  assert.deepEqual(rayOf(10, 20), { x: 9, y: 9, dx: 0, dy: -1 });
  assert.deepEqual(rayOf(10, 30), { x: 0, y: 9, dx: 1, dy: 0 });
});

test('suckAt only removes matching visible grains and updates counts', () => {
  const pic = { colorAt: (u) => (u < 0.5 ? 'red' : 'sky') };
  const sand = createSand(pic, 10, createRng(1));
  const red = sand.keys.indexOf('red');
  const sky = sand.keys.indexOf('sky');
  assert.equal(suckAt(sand, 0, sky, 4).length, 0, 'top-left column is red');
  const got = suckAt(sand, 0, red, 4);
  assert.equal(got.length, 4);
  assert.equal(sand.counts[red], 46);
  assert.equal(firstGrain(sand, 0), 40);
});

test('gravity drops grains into holes without losing any', () => {
  const sand = createSand({ colorAt: () => 'red' }, 8, createRng(2));
  const rng = createRng(3);
  for (let x = 0; x < 8; x++) sand.cells[7 * 8 + x] = -1;
  sand.counts[0] -= 8;
  for (let k = 0; k < 20; k++) stepGravity(sand, rng);
  for (let x = 0; x < 8; x++) {
    assert.ok(sand.cells[x] < 0, 'top row emptied');
    assert.ok(sand.cells[7 * 8 + x] >= 0, 'bottom row refilled');
  }
  assert.equal(sand.cells.filter((c) => c >= 0).length, 56);
});
