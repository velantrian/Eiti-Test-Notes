// Dynamic offline detail renderer must handle the complete 150,000-record KB, including lazy Wikidata longtail.
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

function readIndex() {
  return JSON.parse(fs.readFileSync(path.join(kbRoot, 'index.json'), 'utf8'));
}

test('kbDetailCard renders grounded, self-contained detail for every packed record', () => {
  const index = readIndex();
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
  assert.strictEqual(total, 150000, 'accepted test KB target is 150,000 records');
});

test('Wikidata longtail reasoning stays attributable and self-contained offline', () => {
  const index = readIndex();
  const domain = Object.keys(index.domains).find((d) => /^longtail_\d{2}$/.test(d));
  assert.ok(domain, 'lazy Wikidata domain exists');
  const entry = Object.values(loadDomain(index, domain))[0];
  assert.ok(entry && entry.gen, 'longtail sample is marked generated');
  const detail = R.kbDetailCard(entry, entry.rd || [], 'ru');
  assert.ok(detail.includes('Wikidata (CC0)'), 'longtail source is attributed');
  assert.ok(detail.indexOf('**Суть**') < detail.indexOf('**Подробнее**'));
  assert.ok(detail.includes('дополнительные факты не придумываются'), 'sparse longtail records do not invent extra facts');
});

test('Moon phases detail is attached to existing records and retains verified sources', () => {
  const index = readIndex();
  const astronomy = loadDomain(index, 'astronomy');
  const moon = Object.values(astronomy).find((entry) => (entry.q || []).some((q) => /фазы луны/i.test(q)));
  assert.ok(moon, 'existing astronomy entry covers Moon phases');
  assert.ok(moon.f && moon.f.detail, 'existing entry has an authored detail field');
  const detail = R.kbDetailCard(moon, moon.rd || [], 'ru');
  assert.ok(detail.indexOf('**Суть**') < detail.indexOf('**Подробнее**'));
  assert.ok(detail.includes('Луна не меняет форму'), 'authored explanation is shown');
  assert.ok(detail.includes('science.nasa.gov/moon/moon-phases/'), 'NASA phase source is shown');
  assert.ok(detail.includes('science.nasa.gov/moon/eclipses/'), 'NASA eclipse source is shown');
  assert.ok(detail.includes('aa.usno.navy.mil/faq/moon\\_phases'), 'USNO source is shown in escaped Markdown');
  for (const key of ['short', 'ex', 'why', 'how', 'count', 'verify']) {
    assert.ok(moon.f[key] && detail.includes(moon.f[key]), `structured field ${key} is shown`);
  }
  assert.ok(detail.includes('Поля карточки'));
  assert.ok(detail.length > 1200, `Moon phases detail should be substantially longer; got ${detail.length} chars`);

  const space = loadDomain(index, 'kn_space');
  const moonConcept = Object.values(space).find((entry) => (entry.q || []).some((q) => /^луна$/i.test(q)));
  assert.ok(moonConcept && moonConcept.f && moonConcept.f.detail, 'existing Moon concept is enriched without adding a new record');
  assert.ok(moonConcept.f.verify.includes('NASA') && moonConcept.f.verify.includes('USNO'));
});
