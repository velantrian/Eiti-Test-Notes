// v14.13.0: local/eiti_related.js — settings, on-device related notes, offline reasoning cards (no invented facts), AI split.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = require(path.join(__dirname, '../../local/eiti_related.js'));

function store(init) {
  const m = Object.assign({}, init || {});
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m };
}

test('settings: defaults on/on/offline, set and persist', () => {
  const ls = store();
  assert.deepStrictEqual(R.settings(ls), { related: true, reasoning: true, mode: 'offline', save: true, target: '', copy: true, speak: true });
  assert.deepStrictEqual(R.settings(null), { related: true, reasoning: true, mode: 'offline', save: true, target: '', copy: true, speak: true });
  R.setSetting(ls, 'related', false);
  R.setSetting(ls, 'mode', 'ai');
  assert.deepStrictEqual(R.settings(ls), { related: false, reasoning: true, mode: 'ai', save: true, target: '', copy: true, speak: true });
  assert.strictEqual(ls._m.eiti_related_show, '0');
  R.setSetting(ls, 'mode', 'garbage');
  assert.strictEqual(R.settings(ls).mode, 'offline');
  R.setSetting(ls, 'nope', true);
  assert.strictEqual(Object.keys(ls._m).length, 2);
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepStrictEqual(R.setSetting(broken, 'related', false), { related: true, reasoning: true, mode: 'offline', save: true, target: '', copy: true, speak: true });
});

test('relatedNotes: TF-IDF ranks topical neighbours, excludes self/deleted/unrelated', () => {
  const notes = [
    { id: 'a', title: 'Рецепт борща', body: 'свекла капуста картофель борщ варить два часа' },
    { id: 'b', title: 'Зелёный борщ', body: 'щавель картофель борщ яйцо' },
    { id: 'c', title: 'Python', body: 'списки словари функции классы' },
    { id: 'd', title: 'Борщ старый', body: 'борщ картофель свекла', deleted: true },
    { id: 'e', title: 'Капуста квашеная', body: 'капуста соль морковь' },
  ];
  const r = R.relatedNotes(notes[0], notes, 5);
  assert.deepStrictEqual(r.map((x) => x.id), ['b', 'e']);
  assert.ok(r[0].score >= r[1].score && r[0].shared.includes('борщ'));
  assert.deepStrictEqual(R.relatedNotes(notes[0], notes), R.relatedNotes(notes[0], notes.slice()));
  assert.deepStrictEqual(R.relatedNotes(null, notes), []);
  assert.deepStrictEqual(R.relatedNotes(notes[2], notes), []);
});

test('parseFacts: «Метка: значение.» segments', () => {
  const p = R.parseFacts('«Ночной дозор» — картина Рембрандта. Автор: Рембрандт. Создана: 1642.');
  assert.strictEqual(p.lead, '«Ночной дозор» — картина Рембрандта.');
  assert.deepStrictEqual(p.facts, [['Автор', 'Рембрандт'], ['Создана', '1642']]);
  assert.deepStrictEqual(R.parseFacts('Просто текст без фактов.').facts, []);
});

test('kbCard: only data from the entry, localized labels, source', () => {
  const e = { title: 'Картины', title_en: 'Paintings', gen: true, q: ['ночной дозор'],
    a: '«Ночной дозор» — картина Рембрандта. Автор: Рембрандт. Создана: 1642.',
    en: 'The Night Watch is a painting by Rembrandt. Author: Rembrandt. Created: 1642.' };
  const ru = R.kbCard(e, 'ru');
  assert.match(ru, /\*\*Факты\*\*/);
  assert.match(ru, /- \*\*Автор:\*\* Рембрандт/);
  assert.match(ru, /\*\*Раздел:\*\* Картины/);
  assert.match(ru, /Wikidata \(CC0\)/);
  const de = R.kbCard(e, 'de');
  assert.match(de, /\*\*Fakten\*\*/);
  assert.match(de, /Bereich:\*\* Paintings/);
  assert.match(de, /- \*\*Created:\*\* 1642/);
  // nothing beyond the input: every digit sequence in the card comes from the entry
  (ru.match(/\d{3,}/g) || []).forEach((n) => assert.ok(e.a.includes(n), n));
  assert.match(R.kbCard(Object.assign({}, e, { gen: false }), 'en'), /EITI knowledge library/);
});

test('kbDetailCard: expands only from stored detail, facts and linked entries', () => {
  const e = { id: 'kbl_airports_lcy', title: 'Аэропорты', title_en: 'Airports', gen: true, q: ['Лондон-Сити'],
    a: 'Лондон-Сити — небольшой аэропорт в Лондоне. Код IATA: LCY. Обслуживает: Лондон. Страна: Великобритания.' };
  const related = [
    { id: 'kbl_airports_lhr', q: ['Хитроу'], a: 'Хитроу — крупнейший аэропорт Лондона. Код IATA: LHR. Обслуживает: Лондон. Страна: Великобритания.' },
    { id: 'kbl_airports_dxb', q: ['Дубай'], a: 'Дубай — аэропорт в ОАЭ. Код IATA: DXB. Обслуживает: Дубай. Страна: ОАЭ.' },
  ];
  const card = R.kbDetailCard(e, related, 'ru');
  assert.match(card, /\*\*Подробное объяснение\*\*/);
  assert.match(card, /Краткое описание задаёт тему записи/);
  assert.match(card, /\*\*Карточки с совпадающими полями\*\*/);
  assert.match(card, /Хитроу/);
  assert.match(card, /Обслуживает: Лондон; Страна: Великобритания/);
  assert.doesNotMatch(card, /Дубай/);
  assert.match(card, /не подтверждение прямой или причинной связи/);
  const authored = R.kbDetailCard(Object.assign({}, e, { f: { detail: 'Луна проходит последовательность фаз из-за изменения освещённой части.', short: 'Видимая освещённая часть Луны меняется.', ex: 'Полнолуние наступает при полностью видимом диске.', why: 'Фазы помогают описывать лунный цикл.' } }), [], 'ru');
  assert.match(authored, /Луна проходит последовательность фаз/);
  assert.match(authored, /\*\*Поля карточки\*\*/);
  assert.match(authored, /\*\*Кратко:\*\* Видимая освещённая часть Луны меняется/);
  assert.match(authored, /\*\*Пример:\*\* Полнолуние наступает/);
  const embedded = R.kbDetailCard(Object.assign({}, e, { r: ['k2'], rd: [{ q: ['Гатвик'], a: 'Гатвик — аэропорт Лондона. Обслуживает: Лондон. Страна: Великобритания.' }] }), [], 'ru');
  assert.match(embedded, /Гатвик/);
  const oldPack = R.kbDetailCard(Object.assign({}, e, { r: ['k2'] }), [], 'ru');
  assert.match(oldPack, /в установленном офлайн-пакете нет их снимков/);
  const sparse = R.kbDetailCard({ title: 'Тест', q: ['Краткая запись'], a: 'Краткая запись — пример без дополнительных полей.' }, [], 'ru');
  assert.match(sparse, /дополнительные факты не придумываются/);
  assert.match(sparse, /дополнительная информация ограничена/);
});

test('isDetailAsk: recognizes short Russian, English and German follow-ups only', () => {
  for (const q of ['объясни подробнее', 'подробней', 'а можно поподробнее', 'Explain in more detail', 'tell me more', 'Bitte ausführlicher', 'mehr details']) assert.strictEqual(R.isDetailAsk(q), true, q);
  for (const q of ['подробнее про Берлин', 'more details about Berlin', 'почему это важно?', 'continue']) assert.strictEqual(R.isDetailAsk(q), false, q);
});

test('taleCard and noteCard', () => {
  const x = { t: 'Колобок', cu: 'русская', ty: 'сказка', tg: ['животные'], s: 'Колобок убежал.', m: 'Не хвастай.', p: ['Испекли.', 'Съела лиса.'], src: 'Афанасьев', en: { t: 'The Bun', s: 'The bun ran away.' } };
  const ru = R.taleCard(x, 'ru');
  assert.match(ru, /### 📖 Колобок/);
  assert.match(ru, /\*\*Мораль:\*\* Не хвастай\./);
  assert.match(ru, /1\. Испекли\./);
  assert.match(ru, /Афанасьев/);
  const en = R.taleCard(x, 'en');
  assert.match(en, /### 📖 The Bun/);
  assert.doesNotMatch(en, /Не хвастай/);
  const n = { id: 'n1', title: 'Поездка', body: '# План\nЕдем в Берлин. Берлин зимой.\n## Бюджет', tags: ['путешествия'], created: Date.UTC(2026, 0, 2), updated: Date.UTC(2026, 0, 3) };
  const c = R.noteCard(n, 'en', [{ a: 'Берлин — столица Германии.', en: 'Berlin is the capital of Germany.' }]);
  assert.match(c, /### 📝 Поездка/);
  assert.match(c, /Key terms:\*\* берлин/);
  assert.match(c, /- План\n- Бюджет/);
  assert.match(c, /Created:\*\* 2026-01-02/);
  assert.match(c, /Berlin is the capital of Germany/);
  assert.match(c, /Your note \(on this device\)/);
});

test('AI: grounded prompt, facts from source kept apart from AI text', () => {
  const p = R.aiPrompt('### X\n- **Год:** 1900', 'ru');
  assert.match(p.system, /Не добавляй новых дат/);
  assert.match(p.system, /не утверждай прямую или причинную связь/);
  assert.match(p.user, /^ДАННЫЕ ИЗ ИСТОЧНИКА:\n### X/);
  assert.match(R.aiPrompt('c', 'de').system, /Deutsch/);
  const out = R.combine('CARD', 'AI TEXT', 'en');
  assert.ok(out.indexOf('📚 Facts from source') < out.indexOf('CARD'));
  assert.ok(out.indexOf('CARD') < out.indexOf('---') && out.indexOf('---') < out.indexOf('🤖') && out.indexOf('🤖') < out.indexOf('AI TEXT'));
  assert.doesNotMatch(R.combine('CARD', '', 'ru'), /🤖/);
});

test('ids, markers, strip', () => {
  const doms = { people: {}, space: {}, space_objects: {} };
  assert.deepStrictEqual(R.splitKbId('kbl_space_objects_ab12', doms), { domain: 'space_objects', hash: 'ab12' });
  assert.deepStrictEqual(R.kbRelatedIds('kbl_people_aa', { r: ['bb', 'cc'] }, doms), ['kbl_people_bb', 'kbl_people_cc']);
  assert.deepStrictEqual(R.kbRelatedIds('kbl_people_aa', {}, doms), []);
  assert.strictEqual(R.marker('kb', 'kbl_people_aa', { related: false, reasoning: false }), '');
  assert.strictEqual(R.marker('bad', 'x'), '');
  const m = R.marker('tale', 'slavic.sl_kolobok', { related: true, reasoning: false }, 'de');
  assert.strictEqual(m, '\n\n⟦EITIREL:tale:slavic.sl_kolobok@de⟧');
  R.MARK_RE.lastIndex = 0;
  assert.deepStrictEqual([...m.matchAll(R.MARK_RE)][0].slice(1), ['tale', 'slavic.sl_kolobok', 'de']);
  assert.strictEqual(R.strip('Ответ' + m), 'Ответ');
  assert.strictEqual(R.strip('Ответ\n\n⟦EITIFOOT⟧🌙 Офлайн-ответ (x).⟦/EITIFOOT⟧' + m), 'Ответ');
  assert.strictEqual(R.S('related', 'de'), 'Ähnliche');
  assert.strictEqual(R.S('reasoning', 'en'), 'Reasoning');
  assert.strictEqual(R.S('related', 'xx'), 'Похожие');
});

test('save to note: default on, sticky target, clean entry, append, deleted target → null', () => {
  const ls = store();
  assert.strictEqual(R.settings(ls).save, true);
  assert.strictEqual(R.settings(ls).target, '');
  assert.strictEqual(R.setSetting(ls, 'target', 'note_1').target, 'note_1');
  assert.strictEqual(R.setSetting(ls, 'save', false).save, false);
  assert.strictEqual(ls._m.eiti_save_to_note, '0');
  assert.strictEqual(R.setSetting(ls, 'target', '').target, '');
  // маркер выводится и когда включено только «В заметку» (не для заметок)
  assert.strictEqual(R.marker('kb', 'kbl_people_aa', { related: false, reasoning: false, save: true }), '\n\n⟦EITIREL:kb:kbl_people_aa⟧');
  assert.strictEqual(R.marker('note', 'n1', { related: false, reasoning: false, save: true }), '');
  const e = R.noteEntry('Ночной дозор', 'Картина <b>Рембрандта</b>.\n\n⟦EITIFOOT⟧🌙 Офлайн⟦/EITIFOOT⟧\n\n⟦EITIREL:kb:k_1⟧', 'Wikidata (CC0)', 'ru', Date.UTC(2026, 9, 25, 12));
  assert.strictEqual(e, '📌 Ночной дозор\n\nКартина Рембрандта.\n\n— Источник: Wikidata (CC0) · 2026-10-25');
  assert.ok(!/[⟦<]/.test(e));
  assert.ok(R.noteEntry('T', 'x', 'S', 'de').includes('— Quelle: S'));
  assert.strictEqual(R.appendBody('Старое\n\n', e), 'Старое\n\n' + e);
  assert.strictEqual(R.appendBody('', 'x'), 'x');
  assert.strictEqual(R.targetNote([{ id: 'a' }, { id: 'b' }], 'b').id, 'b');
  assert.strictEqual(R.targetNote([{ id: 'a' }], 'gone'), null);
  assert.strictEqual(R.fmt('toNoteIn', 'ru', 'История'), 'В «История»');
  assert.strictEqual(R.fmt('savedTo', 'en', 'X'), '📌 Added to “X”');
  for (const k of ['toNote', 'toNoteIn', 'change', 'pickNote', 'newNote', 'savedTo', 'cancel', 'detailNoContext']) for (const l of ['ru', 'en', 'de']) assert.ok(R.S(k, l) && (l === 'ru' || R.S(k, l) !== R.S(k, 'ru')), k + l);
  assert.match(R.S('detailNoContext', 'ru'), /Сначала задай вопрос/);
  assert.strictEqual(R.S('toNote', 'de'), 'In Notiz');
});

test('reasoning card: tidyHtml removes stray <br> around blocks; plainCard → clean text; copy strings', () => {
  const h = '<div>T</div><br><br>Lead<br><br><b>F</b><br><div>· a</div><br><div>· b</div><br><br><b>S:</b> x<br><b>Src:</b> y<hr><br><br>AI';
  const t = R.tidyHtml(h);
  assert.ok(!/<\/div>\s*<br/.test(t) && !/<br>\s*<div/.test(t) && !/<br>\s*<br>/.test(t), t);
  assert.ok(t.includes('<b>S:</b> x<br><b>Src:</b> y'));
  assert.ok(t.includes('eiti-rel-gap'));
  const card = R.kbCard({ q: ['ночной дозор'], a: '«Ночной дозор» — картина. Автор: Рембрандт. Создана: 1642.', title: 'Живопись', gen: 1 }, 'ru');
  const p = R.plainCard(R.combine(card, 'Объяснение *модели*', 'ru'));
  assert.ok(!/[#*\\]|\n{3}/.test(p.replace('*модели*', '')), p);
  assert.ok(p.startsWith('📚 Факты из источника'));
  assert.ok(p.includes('🧠 «Ночной дозор»') && p.includes('Раздел: Живопись') && p.includes('———') && p.includes('🤖 Объяснение ИИ'));
  assert.strictEqual(R.plainCard('a\n\n⟦EITIREL:kb:x⟧'), 'a');
  assert.deepStrictEqual(['ru', 'en', 'de'].map((l) => R.S('copy', l)), ['Скопировать', 'Copy', 'Kopieren']);
  assert.strictEqual(R.S('copied', 'ru'), '📋 Скопировано');
});

test('copy/speak button settings: default on, can be turned off; RU/EN/DE labels', () => {
  const ls = store();
  assert.strictEqual(R.settings(ls).copy, true); assert.strictEqual(R.settings(ls).speak, true);
  R.setSetting(ls, 'copy', false); R.setSetting(ls, 'speak', false);
  assert.strictEqual(ls._m.eiti_rel_copy, '0'); assert.strictEqual(ls._m.eiti_rel_speak, '0');
  assert.strictEqual(R.settings(ls).copy, false); assert.strictEqual(R.settings(ls).speak, false);
  assert.deepStrictEqual(['ru', 'en', 'de'].map((l) => R.S('speak', l)), ['Произнести', 'Speak', 'Vorlesen']);
  assert.deepStrictEqual(['ru', 'en', 'de'].map((l) => R.S('stop', l)), ['Стоп', 'Stop', 'Stopp']);
  for (const k of ['copyBtn', 'speakBtn', 'on', 'off']) for (const l of ['en', 'de']) assert.notStrictEqual(R.S(k, l), R.S(k, 'ru'));
});
