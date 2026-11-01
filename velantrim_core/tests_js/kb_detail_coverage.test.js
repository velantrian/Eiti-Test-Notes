// Dynamic offline detail renderer must handle the complete generated KB, not only hand-picked cards.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const R = require(path.join(__dirname, '../../local/eiti_related.js'));
const root = path.resolve(__dirname, '../..');
const kbRoot = path.join(root, 'kb');

function loadDomain(index, domain) {
  const meta = index.domains[domain];
  const byHash = {};
  for (const file of meta.packs) {
    const pack = JSON.parse(fs.readFileSync(path.join(kbRoot, file), 'utf8'));
    for (const [id, raw] of Object.entries(pack.entries || {})) {
      const hash = id.slice(id.lastIndexOf('_') + 1);
      byHash[hash] = Object.assign({ id, domain, title: meta.title, title_en: meta.title_en, gen: !!meta.gen }, raw);
    }
  }
  return byHash;
}

test('kbDetailCard renders grounded, self-contained detail for every packed record', () => {
  const index = JSON.parse(fs.readFileSync(path.join(kbRoot, 'index.json'), 'utf8'));
  let total = 0;
  for (const [domain, meta] of Object.entries(index.domains)) {
    const byHash = loadDomain(index, domain);
    for (const [hash, entry] of Object.entries(byHash)) {
      const relatedCount = Math.min(3, (entry.r || []).length);
      assert.strictEqual((entry.rd || []).length, relatedCount, `${domain}/${hash} lacks embedded related snapshots`);
      const detail = R.kbDetailCard(entry, entry.rd || [], 'ru');
      const essenceAt = detail.indexOf('**Суть**');
      const moreAt = detail.indexOf('**Подробнее**');
      assert.ok(essenceAt >= 0 && moreAt > essenceAt, `${domain}/${hash} lacks the ordered essence/detail sections`);
      assert.ok(detail.includes('Источник:'), `${domain}/${hash} has no source attribution`);
      assert.ok(detail.length > entry.a.length, `${domain}/${hash} was not expanded`);
      if (relatedCount) assert.ok(/Карточки с совпадающими полями|Похожие карточки для сравнения/.test(detail), `${domain}/${hash} omits its embedded comparison context`);
      total += 1;
    }
  }
  assert.strictEqual(total, index.count, 'every indexed record must be rendered exactly once');
  assert.strictEqual(total, 31542, 'accepted test KB target is 31,542 records');
});

test('Moon phases detail includes the authored explanation, fields and verified source URLs', () => {
  const index = JSON.parse(fs.readFileSync(path.join(kbRoot, 'index.json'), 'utf8'));
  const byHash = loadDomain(index, 'kn_space');
  const moon = Object.values(byHash).find((entry) => (entry.q || []).some((q) => /фазы луны/i.test(q)));
  assert.ok(moon, 'Moon phases concept card exists');
  assert.ok(moon.f && moon.f.detail, 'Moon phases has an authored detail field');
  const detail = R.kbDetailCard(moon, moon.rd || [], 'ru');
  assert.ok(detail.indexOf('**Суть**') < detail.indexOf('**Подробнее**'));
  assert.ok(detail.includes('Луна не меняет форму'), 'authored explanation is shown');
  assert.ok(detail.includes('science.nasa.gov/moon/moon-phases/'), 'NASA source is shown');
  assert.ok(detail.includes('aa.usno.navy.mil/faq/moon\\_phases'), 'USNO source is shown in escaped Markdown');
  for (const key of ['short', 'ex', 'why', 'how']) {
    assert.ok(moon.f[key] && detail.includes(moon.f[key]), `structured field ${key} is shown`);
  }
  assert.ok(detail.includes('Поля карточки'));
  assert.ok(detail.length > 1200, `Moon phases detail should be substantially longer; got ${detail.length} chars`);
});
