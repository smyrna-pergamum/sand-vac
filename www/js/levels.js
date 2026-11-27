import { PICTURES } from './core/pictures.js';
import { t } from './i18n.js';
import { createMergePuzzle } from './puzzles/merge.js';
import { createSortPuzzle } from './puzzles/sort.js';
import { createMatchPuzzle } from './puzzles/match3.js';
import { createSokobanPuzzle } from './puzzles/sokoban.js';
import { createArrowPuzzle } from './puzzles/arrow.js';
import { createPipePuzzle } from './puzzles/pipe.js';

export const PUZZLES = Object.freeze({
  merge: { id: 'merge', create: createMergePuzzle },
  sort: { id: 'sort', create: createSortPuzzle },
  match3: { id: 'match3', create: createMatchPuzzle },
  sokoban: { id: 'sokoban', create: createSokobanPuzzle },
  arrow: { id: 'arrow', create: createArrowPuzzle },
  pipe: { id: 'pipe', create: createPipePuzzle },
});

export const LEVELS = Object.freeze([
  { picId: 'heart', picture: PICTURES.heart, puzzle: PUZZLES.merge, seed: 101 },
  { picId: 'boat', picture: PICTURES.boat, puzzle: PUZZLES.sort, seed: 202 },
  { picId: 'flower', picture: PICTURES.flower, puzzle: PUZZLES.match3, seed: 303 },
  { picId: 'mountain', picture: PICTURES.mountain, puzzle: PUZZLES.sokoban, seed: 404 },
  { picId: 'cat', picture: PICTURES.cat, puzzle: PUZZLES.arrow, seed: 505 },
  { picId: 'sunset', picture: PICTURES.sunset, puzzle: PUZZLES.pipe, seed: 606 },
]);

export const levelName = (lv) => t(`pic.${lv.picId}`);
export const puzzleName = (lv) => t(`puz.${lv.puzzle.id}`);
