// VELANTRIM EITI v14.16.2 — «Похожие / Related / Ähnliche» и «Рассуждение / Reasoning / Begründung».
// Чистая логика без DOM и без сети (UMD: window.EitiRelated / module.exports):
//   • настройки (localStorage): показывать похожие, подробное рассуждение, режим рассуждения offline|ai;
//   • похожие заметки — TF-IDF (косинус) по заметкам пользователя, только на устройстве;
//   • detail KB card uses authored fields and pack-embedded source snapshots; no extra facts are generated;
//   • карточки сказок и заметок строятся только из данных самой записи, ничего не выдумывается;
//   • промпт для ИИ с опорой на факты из источника и сборка ответа: «Факты из источника» (источник ≠ доказательство истины) отдельно от «Текст ИИ».
// Похожие для KB и сказок вычисляются при сборке (kb/related.py → «r» в пакетах; offline/build_tale_related.py → «rel»).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiRelated = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYS = { related: 'eiti_related_show', reasoning: 'eiti_reasoning_show', mode: 'eiti_reasoning_mode', save: 'eiti_save_to_note', target: 'eiti_save_target', copy: 'eiti_rel_copy', speak: 'eiti_rel_speak' };
  // по умолчанию: обе кнопки включены, рассуждение — офлайн
  function settings(ls) {
    var g = function (k) { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } };
    return { related: g(KEYS.related) !== '0', reasoning: g(KEYS.reasoning) !== '0', mode: g(KEYS.mode) === 'ai' ? 'ai' : 'offline', save: g(KEYS.save) !== '0', target: g(KEYS.target) || '', copy: g(KEYS.copy) !== '0', speak: g(KEYS.speak) !== '0' };
  }
  function setSetting(ls, name, value) {
    var k = KEYS[name]; if (!k || !ls) return settings(ls);
    var v = name === 'mode' ? (value === 'ai' ? 'ai' : 'offline') : name === 'target' ? String(value || '') : (value ? '1' : '0');
    try { ls.setItem(k, v); } catch (e) {}
    return settings(ls);
  }

  var STR = {
    related:   { ru: 'Похожие', en: 'Related', de: 'Ähnliche' },
    reasoning: { ru: 'Рассуждение', en: 'Reasoning', de: 'Begründung' },
    none:      { ru: 'Похожих записей не нашлось.', en: 'No related items found.', de: 'Keine ähnlichen Einträge gefunden.' },
    facts:     { ru: 'Факты', en: 'Facts', de: 'Fakten' },
    section:   { ru: 'Раздел', en: 'Section', de: 'Bereich' },
    source:    { ru: 'Источник', en: 'Source', de: 'Quelle' },
    culture:   { ru: 'Традиция', en: 'Tradition', de: 'Tradition' },
    type:      { ru: 'Жанр', en: 'Genre', de: 'Gattung' },
    tags:      { ru: 'Темы', en: 'Themes', de: 'Themen' },
    moral:     { ru: 'Мораль', en: 'Moral', de: 'Moral' },
    chars:     { ru: 'Персонажи', en: 'Characters', de: 'Figuren' },
    plot:      { ru: 'Сюжет', en: 'Plot', de: 'Handlung' },
    note:      { ru: 'Заметка', en: 'Note', de: 'Notiz' },
    created:   { ru: 'Создана', en: 'Created', de: 'Erstellt' },
    updated:   { ru: 'Изменена', en: 'Updated', de: 'Geändert' },
    words:     { ru: 'Слов', en: 'Words', de: 'Wörter' },
    keyterms:  { ru: 'Ключевые слова', en: 'Key terms', de: 'Schlüsselwörter' },
    outline:   { ru: 'Структура', en: 'Outline', de: 'Gliederung' },
    kbLinks:   { ru: 'Связанное в базе знаний', en: 'Related in the knowledge base', de: 'Verwandtes in der Wissensdatenbank' },
    kbSrcGen:  { ru: 'Wikidata (CC0), библиотека знаний EITI', en: 'Wikidata (CC0), EITI knowledge library', de: 'Wikidata (CC0), EITI-Wissensbibliothek' },
    kbSrcHand: { ru: 'Библиотека знаний EITI', en: 'EITI knowledge library', de: 'EITI-Wissensbibliothek' },
    talesSrc:  { ru: 'Офлайн-сказки EITI', en: 'EITI offline tales', de: 'EITI-Offline-Märchen' },
    noteSrc:   { ru: 'Ваша заметка (на устройстве)', en: 'Your note (on this device)', de: 'Ihre Notiz (auf diesem Gerät)' },
    verified:  { ru: '📚 Факты из источника', en: '📚 Facts from source', de: '📚 Fakten aus der Quelle' },
    aiText:    { ru: '🤖 Объяснение ИИ — не проверено, сверяйте с фактами выше', en: '🤖 AI explanation — unverified, check against the facts above', de: '🤖 KI-Erklärung — ungeprüft, mit den Fakten oben abgleichen' },
    aiFail:    { ru: 'ИИ недоступен — показана офлайн-карточка.', en: 'AI unavailable — showing the offline card.', de: 'KI nicht verfügbar — Offline-Karte wird angezeigt.' },
    toNote:    { ru: 'В заметку', en: 'To note', de: 'In Notiz' },
    toNoteIn:  { ru: 'В «%s»', en: 'To “%s”', de: 'In „%s“' },
    change:    { ru: 'сменить', en: 'change', de: 'ändern' },
    pickNote:  { ru: 'Куда сохранить ответ?', en: 'Save the answer to…', de: 'Antwort speichern in…' },
    newNote:   { ru: 'Новая заметка', en: 'New note', de: 'Neue Notiz' },
    untitled:  { ru: 'Без названия', en: 'Untitled', de: 'Ohne Titel' },
    savedTo:   { ru: '📌 Добавлено в «%s»', en: '📌 Added to “%s”', de: '📌 Zu „%s“ hinzugefügt' },
    cancel:    { ru: 'Отмена', en: 'Cancel', de: 'Abbrechen' },
    copy:      { ru: 'Скопировать', en: 'Copy', de: 'Kopieren' },
    speak:     { ru: 'Произнести', en: 'Speak', de: 'Vorlesen' },
    stop:      { ru: 'Стоп', en: 'Stop', de: 'Stopp' },
    copyBtn:   { ru: '📋 Кнопка «Скопировать»', en: '📋 “Copy” button', de: '📋 Schaltfläche „Kopieren“' },
    speakBtn:  { ru: '🔊 Кнопка «Произнести»', en: '🔊 “Speak” button', de: '🔊 Schaltfläche „Vorlesen“' },
    on:        { ru: 'ВКЛ', en: 'ON', de: 'AN' },
    off:       { ru: 'ВЫКЛ', en: 'OFF', de: 'AUS' },
    detail:    { ru: 'Подробное объяснение', en: 'Detailed explanation', de: 'Ausführlichere Erklärung' },
    detailIntro: { ru: 'Краткое описание задаёт тему записи; поля ниже фиксируют атрибуты, которые есть в источнике. Они помогают уточнить и сравнить карточку, но не заменяют полную статью.', en: 'The short description identifies the subject; the fields below record attributes present in the source. They help clarify and compare the entry, but are not a full article.', de: 'Die Kurzbeschreibung benennt das Thema; die Felder halten Merkmale aus der Quelle fest. Sie helfen beim Einordnen und Vergleichen, ersetzen aber keinen vollständigen Artikel.' },
    detailNoFacts: { ru: 'В записи нет отдельных структурированных полей. Офлайн-база содержит только краткое описание, поэтому дополнительные факты не придумываются.', en: 'This record has no separate structured fields. The offline library contains only the short source description, so no extra facts are invented.', de: 'Dieser Eintrag enthält keine separaten strukturierten Felder. Die Offline-Bibliothek hat nur die Kurzbeschreibung aus der Quelle; weitere Fakten werden nicht ergänzt.' },
    detailShared: { ru: 'Карточки с совпадающими полями', en: 'Entries with matching fields', de: 'Einträge mit übereinstimmenden Feldern' },
    detailSimilar: { ru: 'Похожие карточки для сравнения', en: 'Similar entries for comparison', de: 'Ähnliche Einträge zum Vergleich' },
    detailSimilarity: { ru: 'Похожие записи выбраны по общим словам и данным в этом разделе. Это контекст для сравнения, а не подтверждение прямой или причинной связи.', en: 'Similar entries are selected by shared wording and data in this section. They provide comparison context, not proof of a direct or causal relationship.', de: 'Ähnliche Einträge werden anhand gemeinsamer Wörter und Daten in diesem Bereich ausgewählt. Sie dienen zum Vergleich und belegen keine direkte oder kausale Beziehung.' },
    detailNoRelated: { ru: 'В базе не нашлось связанных карточек для контекста; дополнительная информация ограничена данными этой записи.', en: 'No linked entries were available for context; further information is limited to this record.', de: 'Es wurden keine verknüpften Einträge als Kontext gefunden; weitere Informationen sind auf diesen Datensatz beschränkt.' },
    detailFields: { ru: 'Поля карточки', en: 'Record fields', de: 'Felder des Eintrags' },
    detailRelatedUnavailable: { ru: 'Для этой записи есть связи, но в установленном офлайн-пакете нет их снимков. Показаны только данные самой записи.', en: 'This record has links, but their snapshots are not present in the installed offline pack. Only this record’s data is shown.', de: 'Für diesen Eintrag gibt es Verknüpfungen, aber ihre Momentaufnahmen fehlen im installierten Offline-Paket. Angezeigt werden nur die Daten dieses Eintrags.' },
    detailNoContext: { ru: 'Сейчас нет свежей карточки знаний для уточнения. Сначала задай вопрос по теме, а затем попроси объяснить подробнее.', en: 'There is no recent knowledge card to expand. Ask about a topic first, then ask for more detail.', de: 'Es gibt keine aktuelle Wissenskarte zum Vertiefen. Stelle zuerst eine Frage zum Thema und bitte dann um mehr Details.' },
    copied:    { ru: '📋 Скопировано', en: '📋 Copied', de: '📋 Kopiert' },
    savedAt:   { ru: 'Сохранено', en: 'Saved', de: 'Gespeichert' },
    offlineOnly:{ ru: 'Офлайн-рассуждение: только данные записи, без догадок.', en: 'Offline reasoning: only the item\'s own data, no guesses.', de: 'Offline-Begründung: nur die Daten des Eintrags, keine Vermutungen.' }
  };
  function L(lang) { return lang === 'en' || lang === 'de' ? lang : 'ru'; }
  function S(key, lang) { var s = STR[key]; return s ? s[L(lang)] : key; }
  var DETAIL_FIELD_LABELS = {
    short: { ru: 'Кратко', en: 'Short', de: 'Kurz' }, ex: { ru: 'Пример', en: 'Example', de: 'Beispiel' },
    why: { ru: 'Зачем это важно', en: 'Why it matters', de: 'Warum es wichtig ist' },
    use: { ru: 'Применение', en: 'Use', de: 'Anwendung' }, how: { ru: 'Как устроено', en: 'How it works', de: 'Funktionsweise' },
    when: { ru: 'Когда', en: 'When', de: 'Wann' }, origin: { ru: 'Происхождение', en: 'Origin', de: 'Ursprung' },
    count: { ru: 'Количество / масштаб', en: 'Count / scale', de: 'Anzahl / Umfang' }, who: { ru: 'Кто', en: 'Who', de: 'Wer' },
    verify: { ru: 'Как проверить', en: 'How to verify', de: 'Prüfung' }
  };
  function detailFieldLabel(k, lang) { var labels = DETAIL_FIELD_LABELS[k]; return labels ? labels[L(lang)] : k; }

  // ── токены для TF-IDF: нижний регистр, ё→е, стем = первые 6 букв, без коротких и служебных слов ──
  var STOP = {};
  ('и в во на не что как это для или но по из от до за то же ли бы так все уже его ее их мы вы он она они ты я мне меня ' +
   'был была были быть есть нет при над под про без там тут где когда если чтобы также только очень можно нужно ' +
   'the and for are was were with from that this have has had not but you your our they them into about what which when ' +
   'der die das und ist nicht mit von den dem ein eine einen auf für sich auch als wie aus bei').split(' ').forEach(function (w) { STOP[w] = 1; });
  function tokens(s) {
    var m = String(s || '').toLowerCase().replace(/ё/g, 'е').match(/[a-zа-яäöüß0-9]{3,}/g) || [], out = [];
    for (var i = 0; i < m.length; i++) if (!STOP[m[i]] && !/^\d+$/.test(m[i])) out.push(m[i].slice(0, 6));
    return out;
  }
  function noteText(n) { return [n.title || '', n.title || '', (n.tags || []).join ? (n.tags || []).join(' ') : String(n.tags || ''), n.body || ''].join(' '); }

  // relatedNotes(note, notes, k) → [{id, title, score, shared:[стемы]}] — косинус TF-IDF, без сети
  function relatedNotes(note, notes, k) {
    k = k || 6; notes = notes || [];
    if (!note) return [];
    var docs = [], df = {}, i, t;
    for (i = 0; i < notes.length; i++) {
      var n = notes[i]; if (!n || n.deleted) continue;
      var tf = {}, ts = tokens(noteText(n));
      for (var j = 0; j < ts.length; j++) tf[ts[j]] = (tf[ts[j]] || 0) + 1;
      for (t in tf) df[t] = (df[t] || 0) + 1;
      docs.push({ n: n, tf: tf });
    }
    var N = docs.length + 1, qtf = {}, qs = tokens(noteText(note));
    for (i = 0; i < qs.length; i++) qtf[qs[i]] = (qtf[qs[i]] || 0) + 1;
    function vec(tf) { var v = {}, nn = 0; for (var x in tf) { var w = (1 + Math.log(tf[x])) * Math.log(1 + N / ((df[x] || 0) + 1)); v[x] = w; nn += w * w; } return { v: v, n: Math.sqrt(nn) || 1 }; }
    var q = vec(qtf), out = [];
    for (i = 0; i < docs.length; i++) {
      var d = docs[i]; if (d.n.id === note.id) continue;
      var dv = vec(d.tf), dot = 0, shared = [];
      for (t in q.v) if (dv.v[t]) { dot += q.v[t] * dv.v[t]; shared.push(t); }
      var sc = dot / (q.n * dv.n);
      if (sc >= 0.08) out.push({ id: d.n.id, title: d.n.title || '', score: Math.round(sc * 1000) / 1000, shared: shared.slice(0, 5) });
    }
    out.sort(function (a, b) { return (b.score - a.score) || (String(a.id) < String(b.id) ? -1 : 1); });
    return out.slice(0, k);
  }

  // parseFacts(answer) → {lead, facts:[[метка, значение]]} — «Метка: значение.» в тексте KB-записи (Wikidata-факты)
  function parseFacts(a) {
    a = String(a || '');
    var re = /(?:^|(?<=[.!?] ))([A-ZА-ЯЁÄÖÜ][^.:!?]{1,40}): ([^.!?]{1,160})(?=\.(?:\s|$))/g, m, facts = [], first = -1;
    while ((m = re.exec(a))) { if (first < 0) first = m.index; facts.push([m[1].trim(), m[2].trim()]); }
    var lead = first < 0 ? a.trim() : a.slice(0, first).trim();
    return { lead: lead, facts: facts };
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[\\`*_\[\]<>|]/g, function (c) { return '\\' + c; }); }

  // kbCard(entry, lang) — entry = {title, title_en, a, en, q, gen} (из EitiKBHost.entry)
  function kbCard(e, lang) {
    lang = L(lang);
    var useEn = lang !== 'ru' && e.en, text = useEn ? e.en : e.a, p = parseFacts(text), name = (e.q && e.q[0]) || '';
    var head = p.lead.split(' — ')[0] || name, lines = ['### 🧠 ' + esc(head.replace(/\.$/, ''))];
    if (p.lead) lines.push('', esc(p.lead));
    if (p.facts.length) { lines.push('', '**' + S('facts', lang) + '**'); p.facts.forEach(function (f) { lines.push('- **' + esc(f[0]) + ':** ' + esc(f[1])); }); }
    lines.push('', '**' + S('section', lang) + ':** ' + esc(useEn || lang !== 'ru' ? (e.title_en || e.title) : e.title));
    lines.push('**' + S('source', lang) + ':** ' + S(e.gen ? 'kbSrcGen' : 'kbSrcHand', lang));
    return lines.join('\n');
  }
  function sharedFactPairs(a, b) {
    var left = {}, out = [];
    function key(label, value) { return String(label || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim() + '::' + String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); }
    (a || []).forEach(function(f) {
      String(f[1] || '').split(/,\s+/).forEach(function(v) { var k = key(f[0], v); if (k !== '::') left[k] = [f[0], v]; });
    });
    (b || []).forEach(function(f) {
      String(f[1] || '').split(/,\s+/).forEach(function(v) { var k = key(f[0], v); if (left[k] && !out.some(function(x) { return key(x[0], x[1]) === k; })) out.push(left[k]); });
    });
    return out;
  }
  // kbDetailCard(entry, related, lang) expands a record only from its own fields and linked KB entries.
  function kbDetailCard(e, related, lang) {
    lang = L(lang);
    var useEn = lang !== 'ru' && e.en, text = useEn ? e.en : e.a, p = parseFacts(text);
    var base = kbCard(e, lang).split('\n'), source = base.pop(), section = base.pop();
    var lines = base.concat(['', '**' + S('detail', lang) + '**']);
    var authored = e.f && typeof e.f.detail === 'string' ? e.f.detail.trim() : '';
    var fields = e.f && typeof e.f === 'object' ? Object.keys(e.f).filter(function(k) { return k !== 'detail' && typeof e.f[k] === 'string' && e.f[k].trim(); }) : [];
    if (authored) lines.push(esc(authored));
    else lines.push(S(p.facts.length || fields.length ? 'detailIntro' : 'detailNoFacts', lang));
    if (fields.length) {
      lines.push('', '**' + S('detailFields', lang) + '**');
      fields.forEach(function(k) { lines.push('- **' + esc(detailFieldLabel(k, lang)) + ':** ' + esc(e.f[k])); });
    }
    var rows = e.rd && e.rd.length ? e.rd : (related || []);
    var exact = [], similar = [];
    rows.forEach(function(n) {
      if (!n || n.id === e.id) return;
      var nt = lang !== 'ru' && n.en ? n.en : n.a, np = parseFacts(nt), shared = sharedFactPairs(p.facts, np.facts);
      var row = { entry: n, parsed: np, shared: shared, text: nt };
      if (shared.length) exact.push(row); else similar.push(row);
    });
    if (exact.length) {
      lines.push('', '**' + S('detailShared', lang) + '**');
      exact.slice(0, 3).forEach(function(r) {
        var title = (r.entry.q && r.entry.q[0]) || r.parsed.lead.split(' — ')[0] || r.entry.id;
        var lead = r.parsed.lead || r.text;
        lines.push('- **' + esc(title) + '** — ' + esc(lead.length > 260 ? lead.slice(0, 257) + '…' : lead));
        lines.push('  ' + esc(r.shared.map(function(f) { return f[0] + ': ' + f[1]; }).join('; ')));
      });
      lines.push('', S('detailSimilarity', lang));
    } else if (similar.length) {
      lines.push('', '**' + S('detailSimilar', lang) + '**');
      similar.slice(0, 2).forEach(function(r) {
        var title = (r.entry.q && r.entry.q[0]) || r.parsed.lead.split(' — ')[0] || r.entry.id;
        var lead = r.parsed.lead || r.text;
        lines.push('- **' + esc(title) + '** — ' + esc(lead.length > 260 ? lead.slice(0, 257) + '…' : lead));
      });
      lines.push('', S('detailSimilarity', lang));
    } else lines.push('', S((e.r && e.r.length) ? 'detailRelatedUnavailable' : 'detailNoRelated', lang));
    lines.push('', section, source);
    return lines.join('\n');
  }
  // taleCard(x, lang) — запись сказки {t, cu, ty, tg, s, p, m, src, who, en}
  function taleCard(x, lang) {
    lang = L(lang);
    var en = lang !== 'ru' && x.en, lines = ['### 📖 ' + esc(en && x.en.t ? x.en.t : x.t)];
    var s = en && x.en.s ? x.en.s : x.s; if (s) lines.push('', esc(s));
    lines.push('');
    if (x.cu) lines.push('- **' + S('culture', lang) + ':** ' + esc(x.cu));
    if (x.ty) lines.push('- **' + S('type', lang) + ':** ' + esc(x.ty));
    if (x.tg && x.tg.length) lines.push('- **' + S('tags', lang) + ':** ' + esc(x.tg.join(', ')));
    if (x.who && x.who.length) lines.push('- **' + S('chars', lang) + ':** ' + esc(x.who.join(', ')));
    if (x.m && !en) lines.push('- **' + S('moral', lang) + ':** ' + esc(x.m));
    if (x.p && x.p.length && !en) { lines.push('', '**' + S('plot', lang) + '**'); x.p.forEach(function (st, i) { lines.push((i + 1) + '. ' + esc(st)); }); }
    lines.push('', '**' + S('source', lang) + ':** ' + (x.src ? esc(x.src) + ' · ' : '') + S('talesSrc', lang));
    return lines.join('\n');
  }
  // noteCard(note, lang, kbHits) — только то, что есть в заметке: заголовки, ключевые слова (частоты), даты, связи с KB
  function noteCard(n, lang, kbHits) {
    lang = L(lang);
    var body = String(n.body || ''), lines = ['### 📝 ' + esc(n.title || S('note', lang))];
    var heads = body.split('\n').filter(function (l) { return /^#{1,4}\s+\S/.test(l); }).map(function (l) { return l.replace(/^#+\s+/, ''); }).slice(0, 8);
    var first = body.replace(/^#.*$/mg, '').split(/(?<=[.!?])\s+/)[0] || '';
    if (first.trim()) lines.push('', esc(first.trim().slice(0, 280)));
    var cnt = {}, raw = String(body + ' ' + (n.title || '')).toLowerCase().replace(/ё/g, 'е').match(/[a-zа-яäöüß]{4,}/g) || [];
    raw.forEach(function (w) { if (!STOP[w]) cnt[w] = (cnt[w] || 0) + 1; });
    var top = Object.keys(cnt).filter(function (w) { return cnt[w] > 1; }).sort(function (a, b) { return cnt[b] - cnt[a] || (a < b ? -1 : 1); }).slice(0, 8);
    lines.push('');
    var tags = n.tags && n.tags.join ? n.tags : (n.tags ? String(n.tags).split(/[,\s]+/).filter(Boolean) : []);
    if (tags.length) lines.push('- **' + S('tags', lang) + ':** ' + esc(tags.join(', ')));
    if (top.length) lines.push('- **' + S('keyterms', lang) + ':** ' + esc(top.join(', ')));
    lines.push('- **' + S('words', lang) + ':** ' + ((body.match(/\S+/g) || []).length));
    var fmt = function (t) { try { return new Date(t).toISOString().slice(0, 10); } catch (e) { return ''; } };
    if (n.created) lines.push('- **' + S('created', lang) + ':** ' + fmt(n.created));
    if (n.updated && n.updated !== n.created) lines.push('- **' + S('updated', lang) + ':** ' + fmt(n.updated));
    if (heads.length) { lines.push('', '**' + S('outline', lang) + '**'); heads.forEach(function (h) { lines.push('- ' + esc(h)); }); }
    if (kbHits && kbHits.length) {
      lines.push('', '**' + S('kbLinks', lang) + '**');
      kbHits.forEach(function (f) { var t = lang !== 'ru' && f.en ? f.en : f.a; lines.push('- ' + esc(String(t).slice(0, 200))); });
    }
    lines.push('', '**' + S('source', lang) + ':** ' + S('noteSrc', lang));
    return lines.join('\n');
  }

  // aiPrompt(cardMarkdown, lang) → {system, user}: ИИ объясняет ТОЛЬКО на основе карточки, догадки помечает
  function aiPrompt(card, lang) {
    lang = L(lang);
    var langName = { ru: 'русском', en: 'English', de: 'Deutsch' }[lang];
    var system = lang === 'ru'
      ? 'Ты помогаешь понять запись. Опирайся только на ДАННЫЕ ИЗ ИСТОЧНИКА ниже (источник — не доказательство истины). Не добавляй новых дат, имён, чисел и фактов, которых нет в данных; если без этого нельзя — прямо скажи «в данных этого нет». Похожие записи используй только как сравнение: не утверждай прямую или причинную связь без явного поля. Ответ на ' + langName + ' языке, Markdown: 2–4 коротких абзаца — суть, почему это важно, как связаны факты.'
      : 'You help the user understand an item. Use ONLY the DATA FROM THE SOURCE below (a source is not proof of truth). Do not add dates, names, numbers or facts that are not in the data; if something is missing say so. Use similar entries only for comparison; do not claim a direct or causal relationship without an explicit field. Answer in ' + langName + ', Markdown, 2–4 short paragraphs: the gist, why it matters, how the facts connect.';
    return { system: system, user: (lang === 'ru' ? 'ДАННЫЕ ИЗ ИСТОЧНИКА:\n' : 'DATA FROM SOURCE:\n') + card };
  }
  // combine(card, aiText, lang) — проверенные факты и текст ИИ визуально разделены
  function combine(card, aiText, lang) {
    var out = '**' + S('verified', lang) + '**\n\n' + card;
    if (aiText) out += '\n\n---\n\n**' + S('aiText', lang) + '**\n\n' + String(aiText).trim();
    return out;
  }
  // splitKbId('kbl_people_ab12cd', domains) → {domain, hash} (домены могут содержать «_» — берём самый длинный известный)
  function splitKbId(id, domains) {
    var m = /^kbl_(.+)_([0-9a-f]+)$/.exec(String(id || '')); if (!m) return null;
    var best = null;
    for (var d in (domains || {})) if (id.indexOf('kbl_' + d + '_') === 0 && (!best || d.length > best.length)) best = d;
    best = best || m[1];
    return { domain: best, hash: id.slice(('kbl_' + best + '_').length) };
  }
  function kbRelatedIds(id, entry, domains) {
    var s = splitKbId(id, domains); if (!s || !entry || !entry.r) return [];
    return entry.r.map(function (h) { return 'kbl_' + s.domain + '_' + h; });
  }
  // v14.13.0: «📌 В заметку» — чистый фрагмент для дописывания в заметку (без маркеров, кнопок и тегов)
  function cleanText(t) {
    return strip(t).replace(/⟦[^⟧]*⟧/g, '').replace(/<[^>]{0,200}>/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function noteEntry(title, text, src, lang, date) {
    var head = cleanText(title), body = cleanText(text), d = date ? new Date(date) : null;
    var day = d && !isNaN(d) ? d.toISOString().slice(0, 10) : '';
    var foot = '— ' + S('source', lang) + ': ' + cleanText(src || '') + (day ? ' · ' + day : '');
    return (head ? '📌 ' + head + '\n\n' : '') + body + '\n\n' + foot;
  }
  function appendBody(body, entry) { var b = String(body || '').replace(/\s+$/, ''); return b ? b + '\n\n' + entry : entry; }
  // targetNote(notes, id) — заметка-цель или null (удалена → снова выбор)
  function targetNote(notes, id) { if (!id) return null; for (var i = 0; i < (notes || []).length; i++) if (notes[i] && notes[i].id === id) return notes[i]; return null; }
  function fmt(key, lang, x) { return S(key, lang).replace('%s', String(x == null ? '' : x)); }
  // v14.13.0: карточка «Рассуждение» — компактный HTML (markdown-рендерер ставит <br> вокруг блоков и пустых строк)
  function tidyHtml(h) {
    var GAP = '<span class="eiti-rel-gap" style="display:block;height:6px;"></span>';
    return String(h || '')
      .replace(/(<br\s*\/?>\s*)+(<(?:div|hr|h[1-6]|ul|ol|p|blockquote|span class="eiti-rel-gap")[\s>])/gi, '$2')
      .replace(/(<\/(?:div|h[1-6]|ul|ol|p|blockquote)>|<hr[^>]*>)(\s*<br\s*\/?>)+/gi, '$1')
      .replace(/(<br\s*\/?>\s*){2,}/gi, GAP)
      .replace(/^(\s*<br\s*\/?>)+|(<br\s*\/?>\s*)+$/gi, '');
  }
  // plainCard(markdown) — чистый текст карточки для «📋 Скопировать» (без разметки и экранирования)
  function plainCard(t) {
    return strip(t).split('\n').map(function (l) {
      l = l.replace(/^#{1,6}\s+/, '').replace(/^\s*-{3,}\s*$/, '———').replace(/^\s*[-*]\s+/, '· ').replace(/\*\*/g, '').replace(/\\([\\`*_\[\]<>|])/g, '$1');
      return l.replace(/\s+$/, '');
    }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // marker(kind, id) — маркер под ответом в чате; рендерер заменяет его на кнопки
  function marker(kind, id, st, lang) {
    st = st || { related: true, reasoning: true };
    if (!(st.related || st.reasoning || (st.save && kind !== 'note')) || !id || !/^(kb|tale|note)$/.test(kind)) return '';
    return '\n\n⟦EITIREL:' + kind + ':' + String(id).replace(/[^\w.-]/g, '') + (lang === 'en' || lang === 'de' ? '@' + lang : '') + '⟧';
  }
  var MARK_RE = /⟦EITIREL:(kb|tale|note):([\w.-]+)(?:@(ru|en|de))?⟧/g;
  function strip(text) { return String(text || "").replace(/\n*⟦EITIFOOT⟧[\s\S]*?⟦\/EITIFOOT⟧/g, "").replace(/\n*⟦EITIREL:[^⟧]*⟧/g, ""); }
  function isDetailAsk(text) {
    var q = String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q || q.length > 80) return false;
    var ru = /^(?:(?:а|и)\s+)?(?:(?:можно|давай)\s+)?(?:(?:объясни|объясните|поясни|поясните|расскажи|расскажите|разверни|разверните)(?:\s+(?:мне|это|его|ее))?\s+)?(?:еще\s+)?(?:подробнее|подробней|поподробнее|детальнее|детальней|развернуто|больше деталей)(?:\s+(?:пожалуйста|прошу))?$/;
    var en = /^(?:(?:please|can you)\s+)?(?:(?:explain(?: this| that| it)?|tell me|go)\s+)?(?:in\s+)?(?:more|greater)\s+detail(?:s)?(?:\s+please)?$|^(?:tell me more|elaborate(?: please)?|can you elaborate)$/;
    var de = /^(?:bitte\s+)?(?:(?:erklär(?:e)?|erkläre|erzaehl|erzähl)(?:\s+(?:es|das))?\s+)?(?:ausführlicher|ausfuhrlicher|genauer|mehr details)(?:\s+bitte)?$/;
    return ru.test(q) || en.test(q) || de.test(q);
  }

  return { KEYS: KEYS, settings: settings, setSetting: setSetting, S: S, tokens: tokens, relatedNotes: relatedNotes, parseFacts: parseFacts,
           kbCard: kbCard, kbDetailCard: kbDetailCard, isDetailAsk: isDetailAsk, taleCard: taleCard, noteCard: noteCard, aiPrompt: aiPrompt, combine: combine, splitKbId: splitKbId,
           kbRelatedIds: kbRelatedIds, marker: marker, cleanText: cleanText, noteEntry: noteEntry, appendBody: appendBody, targetNote: targetNote, fmt: fmt, tidyHtml: tidyHtml, plainCard: plainCard, MARK_RE: MARK_RE, strip: strip, version: 1 };
});
