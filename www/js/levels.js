import { PICTURES } from './core/pictures.js';
import { createMergePuzzle } from './puzzles/merge.js';
import { createSortPuzzle } from './puzzles/sort.js';
import { createMatchPuzzle } from './puzzles/match3.js';
import { createSokobanPuzzle } from './puzzles/sokoban.js';
import { createArrowPuzzle } from './puzzles/arrow.js';
import { createPipePuzzle } from './puzzles/pipe.js';

export const PUZZLES = Object.freeze({
  merge: { name: 'Sayı Birleştirme', create: createMergePuzzle },
  sort: { name: 'Renk Sıralama', create: createSortPuzzle },
  match3: { name: 'Üçlü Eşleştirme', create: createMatchPuzzle },
  sokoban: { name: 'İtme Bulmacası', create: createSokobanPuzzle },
  arrow: { name: 'Ok Kaçışı', create: createArrowPuzzle },
  pipe: { name: 'Boru Bağlama', create: createPipePuzzle },
});

export const LEVELS = Object.freeze([
  { picture: PICTURES.heart, puzzle: PUZZLES.merge, seed: 101 },
  { picture: PICTURES.boat, puzzle: PUZZLES.sort, seed: 202 },
  { picture: PICTURES.flower, puzzle: PUZZLES.match3, seed: 303 },
  { picture: PICTURES.mountain, puzzle: PUZZLES.sokoban, seed: 404 },
  { picture: PICTURES.cat, puzzle: PUZZLES.arrow, seed: 505 },
  { picture: PICTURES.sunset, puzzle: PUZZLES.pipe, seed: 606 },
]);
