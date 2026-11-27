import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, addVacuums, tapDock } from '../www/js/game.js';
import { countsByKey, remaining } from '../www/js/core/sand.js';
import { LEVELS } from '../www/js/levels.js';
import { splitTotal } from '../www/js/core/rng.js';

// Bot: feeds exactly-sized vacuums, relaunches docked ones, and must clear the picture.
function playTopHalf(level, seed) {
  const g = createGame(level, seed);
  const specs = Object.entries(countsByKey(g.sand)).flatMap(([color, n]) => splitTotal(n, 3).map((cap) => ({ color, cap })));
  addVacuums(g, specs);
  for (let t = 0; t < 60 * 400 && g.status === 'play'; t++) {
    updateGame(g, 1 / 60);
    g.dock.forEach((v, i) => v && t % 30 === 0 && tapDock(g, i));
  }
  return g;
}

test('every level is clearable when the puzzle delivers its vacuums', () => {
  LEVELS.forEach((level, i) => {
    const g = playTopHalf(level, 1000 + i);
    assert.equal(g.status, 'won', `level ${i + 1} (${level.picture.name}) left ${remaining(g.sand)} grains: ${g.reason}`);
  });
});

test('every level builds its puzzle without throwing', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 10; seed++) {
      const g = createGame(level, seed);
      assert.equal(g.status, 'play');
      assert.equal(g.puzzle.isDone(), false);
    }
  }
});

test('a returning vacuum with a full dock loses the game', () => {
  const g = createGame(LEVELS[0], 7);
  g.dock = g.dock.map(() => ({ id: 99, color: g.sand.keys[0], ci: 0, cap: 1, left: 1, s: 0, lastCell: -1 }));
  addVacuums(g, [{ color: g.sand.keys[1], cap: 999999 }]);
  for (let t = 0; t < 60 * 20 && g.status === 'play'; t++) updateGame(g, 1 / 60);
  assert.equal(g.status, 'lost');
});
