// Turkish / English UI strings. t('key', { n: 3 }) fills {n} placeholders.
const STORE_KEY = 'sandVac.lang';

export const STRINGS = Object.freeze({
  tr: {
    'ui.menu': 'Menü',
    'ui.sound': 'Ses',
    'ui.restart': 'Yeniden başlat',
    'ui.language': 'Dil',
    'menu.tagline': 'Altta bulmacayı çöz, süpürgeleri kazan, üstteki kumdan tabloyu tertemiz yap.',
    'menu.play': 'Oyna',
    'menu.locked': '🔒 Kilitli',
    'result.next': 'Sonraki bölüm',
    'result.retry': 'Tekrar dene',
    'result.replay': 'Tekrar oyna',
    'result.levels': 'Bölümler',
    'result.won': 'Tablo tertemiz! ✨',
    'result.lost': 'Olmadı!',
    'result.album': '{name} albüme eklendi.',
    'lose.dock': 'İskele doldu! Dönen süpürgeye yer kalmadı.',
    'lose.stuck': 'Bulmacada hamle kalmadı.',
    'dock.full': 'İskele dolu!',
    'dock.almost': 'İskele dolmak üzere',
    'pic.heart': 'Kalp',
    'pic.boat': 'Yelkenli',
    'pic.flower': 'Papatya',
    'pic.mountain': 'Karlı Dağ',
    'pic.cat': 'Kedi',
    'pic.sunset': 'Gün Batımı',
    'puz.merge': 'Sayı Birleştirme',
    'puz.sort': 'Renk Sıralama',
    'puz.match3': 'Üçlü Eşleştirme',
    'puz.sokoban': 'İtme Bulmacası',
    'puz.arrow': 'Ok Kaçışı',
    'puz.pipe': 'Boru Bağlama',
    'merge.hint': 'Aynı renk + aynı sayıyı birleştir. Dokun, tekrar dokun = gönder.',
    'merge.hintSelected': 'Eşini seç (birleştir) ya da aynısına dokun (gönder).',
    'merge.moves': 'Gönderim hakkı: {n}',
    'merge.queue': 'Sırada: {n}',
    'sort.hint': 'Bir tüpe dokun, sonra dökmek istediğin tüpe dokun.',
    'sort.hintSelected': 'Nereye dökeceksin?',
    'sort.rule': 'Aynı renkte 4 katman = 1 süpürge',
    'match.hint': 'Yan yana iki taşı değiştir, 3 aynı rengi diz.',
    'match.charge': 'Doluluk',
    'soko.hint': 'Oynamak için robotun yanına dokun. Kutuları mor kapılara it.',
    'soko.left': 'Kalan',
    'soko.boxes': 'kutu',
    'soko.undo': '↶ Geri al',
    'arrow.hint': 'Okun yönü boşsa süpürge kayıp çıkar. Doğru sırayı bul!',
    'pipe.hint': 'Borulara dokunup döndür. Kumu süpürgeye ulaştır.',
    'pipe.board': 'Pano {a} / {b}',
    'pipe.sand': 'KUM',
  },
  en: {
    'ui.menu': 'Menu',
    'ui.sound': 'Sound',
    'ui.restart': 'Restart',
    'ui.language': 'Language',
    'menu.tagline': 'Solve the puzzle below, win vacuums, and clean the sand picture above.',
    'menu.play': 'Play',
    'menu.locked': '🔒 Locked',
    'result.next': 'Next level',
    'result.retry': 'Try again',
    'result.replay': 'Play again',
    'result.levels': 'Levels',
    'result.won': 'Spotless! ✨',
    'result.lost': 'Not quite!',
    'result.album': '{name} added to your album.',
    'lose.dock': 'The dock is full! No room for the returning vacuum.',
    'lose.stuck': 'No moves left in the puzzle.',
    'dock.full': 'Dock full!',
    'dock.almost': 'Dock almost full',
    'pic.heart': 'Heart',
    'pic.boat': 'Sailboat',
    'pic.flower': 'Daisy',
    'pic.mountain': 'Snowy Peak',
    'pic.cat': 'Cat',
    'pic.sunset': 'Sunset',
    'puz.merge': 'Number Merge',
    'puz.sort': 'Color Sort',
    'puz.match3': 'Match-3',
    'puz.sokoban': 'Push Puzzle',
    'puz.arrow': 'Arrow Escape',
    'puz.pipe': 'Pipe Connect',
    'merge.hint': 'Merge same color + same number. Tap twice to send.',
    'merge.hintSelected': 'Pick its twin to merge, or tap it again to send.',
    'merge.moves': 'Sends left: {n}',
    'merge.queue': 'Up next: {n}',
    'sort.hint': 'Tap a tube, then tap the tube to pour into.',
    'sort.hintSelected': 'Where should it go?',
    'sort.rule': '4 layers of one color = 1 vacuum',
    'match.hint': 'Swap two neighbours to line up 3 of a color.',
    'match.charge': 'Charge',
    'soko.hint': 'Tap next to the robot to move. Push crates into purple gates.',
    'soko.left': 'Left',
    'soko.boxes': 'crates',
    'soko.undo': '↶ Undo',
    'arrow.hint': 'A vacuum slides out if its arrow path is clear. Find the order!',
    'pipe.hint': 'Tap pipes to rotate them. Lead the sand to the vacuum.',
    'pipe.board': 'Board {a} / {b}',
    'pipe.sand': 'SAND',
  },
});

export const LANGS = Object.freeze(['tr', 'en']);
let current = null;

function detect() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    // Storage unavailable: fall through to the browser language.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function getLang() {
  if (!current) current = typeof localStorage === 'undefined' ? 'tr' : detect();
  return current;
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) throw new Error(`Unsupported language: ${lang}`);
  current = lang;
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    // Not persisted; the choice still applies for this session.
  }
}

export function t(key, params = {}) {
  const table = STRINGS[getLang()];
  const raw = table[key] ?? STRINGS.tr[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

// Fills every element carrying data-i18n (text) or data-i18n-label (aria-label).
export function applyStatic(root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  });
  root.documentElement.lang = getLang();
}
