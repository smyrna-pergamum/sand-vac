import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, t, setLang, getLang } from '../www/js/i18n.js';
import { LEVELS, levelName, puzzleName } from '../www/js/levels.js';

test('Turkish and English tables have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.tr).sort());
});

test('t fills placeholders and follows the selected language', () => {
  setLang('en');
  assert.equal(getLang(), 'en');
  assert.equal(t('merge.moves', { n: 3 }), 'Sends left: 3');
  setLang('tr');
  assert.equal(t('pipe.board', { a: 1, b: 4 }), 'Pano 1 / 4');
  assert.equal(t('no.such.key'), 'no.such.key');
  assert.throws(() => setLang('de'));
});

test('every level has a translated picture and puzzle name in both languages', () => {
  for (const lang of ['tr', 'en']) {
    setLang(lang);
    for (const lv of LEVELS) {
      assert.ok(!levelName(lv).startsWith('pic.'), `${lang} ${lv.picId}`);
      assert.ok(!puzzleName(lv).startsWith('puz.'), `${lang} ${lv.puzzle.id}`);
    }
  }
});
