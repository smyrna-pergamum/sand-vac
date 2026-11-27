import { LEVELS, levelName, puzzleName } from './levels.js';
import { t, getLang, setLang, applyStatic } from './i18n.js';
import { createGame, updateGame, addVacuums, tapDock } from './game.js';
import { renderGame, drawThumb } from './render.js';
import { VIEW, PUZ, DOCK, dockRect, inRect } from './layout.js';
import { sfx } from './sfx.js';

const STORE_KEY = 'kumSupurgesi.unlocked';
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

let game = null;
let levelIndex = 0;
let attempt = 0;
let lastTime = 0;
let scale = 1;
let shownStatus = 'play';

function loadUnlocked() {
  try {
    const v = Number(localStorage.getItem(STORE_KEY));
    return Number.isFinite(v) && v >= 1 ? Math.min(v, LEVELS.length) : 1;
  } catch {
    return 1;
  }
}

function saveUnlocked(n) {
  try {
    localStorage.setItem(STORE_KEY, String(n));
  } catch {
    // Storage may be unavailable (private mode); progress just won't persist.
  }
}

function resize() {
  const wrap = $('stage');
  const avail = { w: wrap.clientWidth, h: wrap.clientHeight };
  scale = Math.min(avail.w / VIEW.w, avail.h / VIEW.h);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${VIEW.w * scale}px`;
  canvas.style.height = `${VIEW.h * scale}px`;
  canvas.width = Math.round(VIEW.w * scale * dpr);
  canvas.height = Math.round(VIEW.h * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function show(id, on) {
  $(id).classList.toggle('hidden', !on);
}

function buildMenu() {
  const unlocked = loadUnlocked();
  const list = $('levels');
  list.replaceChildren();
  LEVELS.forEach((lv, i) => {
    const card = document.createElement('button');
    card.className = 'level-card';
    card.disabled = i >= unlocked;
    const thumb = document.createElement('canvas');
    thumb.width = 120;
    thumb.height = 120;
    drawThumb(thumb, lv.picture);
    const info = document.createElement('div');
    info.className = 'level-info';
    const title = document.createElement('strong');
    title.textContent = `${i + 1}. ${levelName(lv)}`;
    const sub = document.createElement('span');
    sub.textContent = i >= unlocked ? t('menu.locked') : puzzleName(lv);
    info.append(title, sub);
    card.append(thumb, info);
    card.addEventListener('click', () => startLevel(i));
    list.append(card);
  });
}

function openMenu() {
  game = null;
  refreshTitles();
  buildMenu();
  show('result', false);
  show('menu', true);
}

// Puzzle generators are random; retry with another seed if one ever fails.
function buildGame(lv) {
  for (let k = 0; k < 5; k++) {
    try {
      return createGame(lv, lv.seed + (attempt + k) * 7919);
    } catch (err) {
      console.error('Bölüm oluşturulamadı, yeni tohumla deneniyor:', err);
    }
  }
  throw new Error('Bölüm oluşturulamadı');
}

function refreshTitles() {
  const lv = game ? game.level : null;
  $('title').textContent = lv ? `${levelIndex + 1}. ${levelName(lv)}` : 'Sand Vac';
  $('subtitle').textContent = lv ? puzzleName(lv) : '';
}

function applyLanguage() {
  applyStatic(document);
  $('btnLang').textContent = getLang() === 'tr' ? 'EN' : 'TR';
  refreshTitles();
  if (!$('menu').classList.contains('hidden')) buildMenu();
  if (game && game.status !== 'play' && !$('result').classList.contains('hidden')) showResultText();
}

function startLevel(i) {
  sfx.unlock();
  levelIndex = i;
  attempt += 1;
  const lv = LEVELS[i];
  game = buildGame(lv);
  shownStatus = 'play';
  refreshTitles();
  show('menu', false);
  show('result', false);
}

function showResultText() {
  const won = game.status === 'won';
  $('resultTitle').textContent = t(won ? 'result.won' : 'result.lost');
  $('resultText').textContent = won ? t('result.album', { name: levelName(game.level) }) : t(game.reason);
  $('btnNext').classList.toggle('hidden', !(won && levelIndex < LEVELS.length - 1));
  $('btnRetry').textContent = t(won ? 'result.replay' : 'result.retry');
}

function showResult() {
  if (game.status === 'won') {
    saveUnlocked(Math.max(loadUnlocked(), Math.min(LEVELS.length, levelIndex + 2)));
    sfx.win();
  } else {
    sfx.fail();
  }
  showResultText();
  show('result', true);
}

function toLogical(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: ((e.clientX - rect.left) / rect.width) * VIEW.w, y: ((e.clientY - rect.top) / rect.height) * VIEW.h };
}

function onPointer(e) {
  if (!game || game.status !== 'play') return;
  e.preventDefault();
  sfx.unlock();
  const { x, y } = toLogical(e);
  for (let i = 0; i < DOCK.slots; i++) {
    if (inRect(dockRect(i), x, y)) {
      if (tapDock(game, i)) sfx.launch();
      return;
    }
  }
  if (inRect({ x: PUZ.x - 6, y: PUZ.y - 8, w: PUZ.w + 12, h: PUZ.h + 14 }, x, y)) {
    const res = game.puzzle.tap(x, y, PUZ);
    if (res.emitted.length) addVacuums(game, res.emitted);
    if (res.sound) sfx[res.sound]();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  if (game) {
    const ev = updateGame(game, dt);
    if (ev.suck) sfx.suck();
    if (ev.pop) sfx.pop();
    renderGame(ctx, game, now);
    if (game.status !== 'play' && shownStatus === 'play') {
      shownStatus = game.status;
      showResult();
    }
  }
  requestAnimationFrame(frame);
}

function wireButtons() {
  $('btnMenu').addEventListener('click', openMenu);
  $('btnLang').addEventListener('click', () => {
    setLang(getLang() === 'tr' ? 'en' : 'tr');
    applyLanguage();
  });
  $('btnRestart').addEventListener('click', () => game && startLevel(levelIndex));
  $('btnSound').addEventListener('click', () => {
    $('btnSound').textContent = sfx.toggle() ? '🔊' : '🔇';
  });
  $('btnNext').addEventListener('click', () => startLevel(levelIndex + 1));
  $('btnRetry').addEventListener('click', () => startLevel(levelIndex));
  $('btnResMenu').addEventListener('click', openMenu);
  $('btnPlay').addEventListener('click', () => startLevel(Math.max(0, loadUnlocked() - 1)));
  canvas.addEventListener('pointerdown', onPointer);
}

// ?debug exposes the running game for automated tests and screenshots.
if (new URLSearchParams(location.search).has('debug')) {
  window.sandVacDebug = { get game() { return game; }, addVacuums, startLevel };
}

window.addEventListener('resize', resize);
wireButtons();
resize();
openMenu();
applyLanguage();
requestAnimationFrame(frame);
