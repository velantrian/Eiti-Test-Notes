// VELANTRIM EITI v14.14.0 — EITI Frames: офлайн-понимание формулировок (RU).
// Чистая логика без DOM, без сети и без localStorage (UMD: window.EitiFrames / module.exports).
//   • нормализация, выкидывание слов-паразитов, оговорки диктовки («поцелуй» → «поясни», только если дальше тема);
//   • маленький стеммер в духе Snowball-RU (без lookbehind — работает и в старом Safari);
//   • речевые акты и вопросы (расскажи / объясни / по сути / зачем / когда / сколько / откуда / это точно…) в любом порядке слов;
//   • тема + местоимения («поясни это», «а кто это открыл?») → последняя карточка;
//   • ответы по полям карточек понятий KB (def/short/ex/why/use/how/when/origin/count/who/verify), честное «нет данных»;
//   • продолжение диалога («да / ещё / а зачем? / короче / хватит») — только после ответа фреймов;
//   • defer-список (стихи, сказки, заметки, файлы, погода…) → молчим, отвечают другие движки.
// Данные — local/eiti_frames.json (правится без кода). Хост (index.html) даёт lookup(тема) и pass(текст).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiFrames = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TTL = 20 * 60 * 1000;
  var P = null;

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function toks(s) { var n = norm(s); return n ? n.split(' ') : []; }

  // ── стеммер (упрощённый Snowball-RU; группы «после а/я» проверяются вручную, без lookbehind) ──
  var VOW = /[аеиоуыэюя]/;
  var PERF_P = ['ив', 'ивши', 'ившись', 'ыв', 'ывши', 'ывшись'], PERF_A = ['в', 'вши', 'вшись'];
  var REFL = ['ся', 'сь'];
  var ADJ = ['ее', 'ие', 'ые', 'ое', 'ими', 'ыми', 'ей', 'ий', 'ый', 'ой', 'ем', 'им', 'ым', 'ом', 'его', 'ого', 'ему', 'ому', 'их', 'ых', 'ую', 'юю', 'ая', 'яя', 'ою', 'ею'];
  var PART_P = ['ивш', 'ывш', 'ующ'], PART_A = ['ем', 'нн', 'вш', 'ющ', 'щ'];
  var VERB_P = ['ила', 'ыла', 'ена', 'ейте', 'уйте', 'ите', 'или', 'ыли', 'ей', 'уй', 'ил', 'ыл', 'им', 'ым', 'ен', 'ило', 'ыло', 'ено', 'ят', 'ует', 'уют', 'ит', 'ыт', 'ены', 'ить', 'ыть', 'ишь', 'ую', 'ю'];
  var VERB_A = ['ла', 'на', 'ете', 'йте', 'ли', 'й', 'л', 'ем', 'н', 'ло', 'но', 'ет', 'ют', 'ны', 'ть', 'ешь', 'нно'];
  var NOUN = ['а', 'ев', 'ов', 'ие', 'ье', 'е', 'иями', 'ями', 'ами', 'еи', 'ии', 'и', 'ией', 'ей', 'ой', 'ий', 'й', 'иям', 'ям', 'ием', 'ем', 'ам', 'ом', 'о', 'у', 'ах', 'иях', 'ях', 'ы', 'ь', 'ию', 'ью', 'ю', 'ия', 'ья', 'я'];
  var SUPER = ['ейш', 'ейше'];
  function ends(w, s) { return w.length >= s.length && w.slice(w.length - s.length) === s; }
  // cut(rv, plain, afterAYa) → rv без самого длинного подходящего окончания или null
  function cut(rv, plain, ay) {
    var best = 0, i, s;
    for (i = 0; i < plain.length; i++) { s = plain[i]; if (s.length > best && ends(rv, s)) best = s.length; }
    if (ay) for (i = 0; i < ay.length; i++) {
      s = ay[i];
      if (s.length > best && ends(rv, s)) { var c = rv.charAt(rv.length - s.length - 1); if (c === 'а' || c === 'я') best = s.length; }
    }
    return best ? rv.slice(0, rv.length - best) : null;
  }
  function stem(w) {
    w = String(w || '');
    if (w.length < 4 || !/^[а-я]+$/.test(w)) return w;
    var m = w.search(VOW); if (m < 0) return w;
    var pre = w.slice(0, m + 1), rv = w.slice(m + 1), r = cut(rv, PERF_P, PERF_A);
    if (r === null) {
      var t = cut(rv, REFL); if (t !== null) rv = t;
      r = cut(rv, ADJ);
      if (r !== null) { var t2 = cut(r, PART_P, PART_A); if (t2 !== null) r = t2; }
      else { r = cut(rv, VERB_P, VERB_A); if (r === null) { r = cut(rv, NOUN); if (r === null) r = rv; } }
    }
    rv = r;
    if (ends(rv, 'и')) rv = rv.slice(0, -1);
    var t3 = cut(rv, SUPER); if (t3 !== null) rv = t3;
    if (ends(rv, 'нн')) rv = rv.slice(0, -1); else if (ends(rv, 'ь')) rv = rv.slice(0, -1);
    return pre + rv;
  }

  // ── пакет ──
  var PRIO = { ask_compare: 9, q_verify: 8, q_origin: 8, q_purpose: 7, q_why: 7, q_when: 7, q_count: 7, q_who: 6, q_how: 5, ask_example: 5, ask_advice: 5, ask_define: 4, ask_essence: 3, ask_explain: 2, ask_tell: 1 };
  function phrases(list) { var o = []; (list || []).forEach(function (x) { var t = toks(Array.isArray(x) ? x.join(' ') : x); if (t.length) o.push(t); }); return o; }
  function stemmed(list) { return phrases(list).map(function (t) { return t.map(stem); }); }
  function set(list) { var o = {}; (list || []).forEach(function (x) { o[norm(x)] = 1; }); return o; }
  function compile(pack) {
    if (!pack || !Array.isArray(pack.intents)) return null;
    var c = { raw: pack, fillers: phrases(pack.fillers), stop: phrases(pack.stop), self: set(pack.self), pron: set(pack.pron), slips: {}, defer: (pack.defer || []).map(norm).filter(Boolean),
      mods: [], intents: [], fu: [], chain: pack.chain || ['def', 'ex', 'why', 'use', 'how', 'when', 'origin'] };
    Object.keys(pack.slips || {}).forEach(function (k) { c.slips[norm(k)] = norm(pack.slips[k]); });
    Object.keys(pack.modifiers || {}).forEach(function (k) { stemmed(pack.modifiers[k]).forEach(function (t) { c.mods.push({ id: k, t: t }); }); });
    pack.intents.forEach(function (it) { stemmed(it.triggers).forEach(function (t) { c.intents.push({ id: it.id, field: it.field, t: t, prio: PRIO[it.id] || 0 }); }); });
    var stopRaw = {}; c.fillers.concat(c.stop).forEach(function (t) { if (t.length === 1) stopRaw[t[0]] = 1; });
    c.stopRaw = stopRaw;
    (pack.followups || []).forEach(function (f) {
      phrases(f.triggers).forEach(function (t) {
        var red = t.filter(function (w) { return !stopRaw[w] && !c.pron[w]; }).map(stem);
        c.fu.push({ go: f.go, raw: t.join(' '), red: red.join(' ') });
      });
    });
    return c;
  }
  function load(pack) { P = compile(pack); return !!P; }
  function loaded() { return !!P; }
  function create() { return { card: null, told: {}, offer: null, at: 0 }; }
  function fresh(st, now) { return !!(st && st.card && (now || Date.now()) - st.at < TTL); }

  // найти фразу (массив) в массиве слов wl начиная с любой позиции среди неиспользованных; → индекс или -1
  function find(wl, used, ph, from) {
    for (var i = from || 0; i + ph.length <= wl.length; i++) {
      var ok = true;
      for (var j = 0; j < ph.length; j++) if (used[i + j] || wl[i + j] !== ph[j]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  }
  function markAll(wl, used, list, tag) {
    var hit = false;
    list.forEach(function (ph) { var i; while ((i = find(wl, used, ph, 0)) >= 0) { for (var j = 0; j < ph.length; j++) used[i + j] = tag || 1; hit = true; } });
    return hit;
  }
  function isDefer(w) {
    for (var i = 0; i < P.defer.length; i++) {
      var d = P.defer[i];
      if (w === d || (w.indexOf(d) === 0 && (d.length >= 4 || w.length <= d.length + 2))) return true;
    }
    return false;
  }
  var SEP = { 'и': 1, 'или': 1, 'от': 1, 'между': 1, 'vs': 1, 'versus': 1, 'с': 1, 'со': 1 };

  // parse(text, st, now) → null | {kind:'defer'} | {kind:'fu', go} | {kind:'ask', intent, field, mods, topic, topics, pron, slip, fixed, canon}
  function parse(text, st, now) {
    if (!P) return null;
    var s = String(text || '');
    if (!s || s.length > 220 || !/[а-яё]/i.test(s)) return null;
    var w = toks(s); if (!w.length || w.length > 24) return null;
    for (var d = 0; d < w.length; d++) if (isDefer(w[d])) return { kind: 'defer' };
    // продолжение диалога — только после ответа фреймов
    if (fresh(st, now)) {
      var raw = w.join(' '), red = w.filter(function (x) { return !P.stopRaw[x] && !P.pron[x]; }).map(stem).join(' ');
      for (var f = 0; f < P.fu.length; f++) if (P.fu[f].raw === raw || (red && P.fu[f].red === red)) return { kind: 'fu', go: P.fu[f].go };
    }
    var slip = null, fixedW = w.slice();
    for (var k = 0; k < w.length; k++) if (P.slips[w[k]]) { slip = w[k]; fixedW[k] = P.slips[w[k]]; }
    var used = [], sw = fixedW.map(stem);
    markAll(fixedW, used, P.fillers, 'f');
    var best = null, mods = {};
    P.mods.forEach(function (m) { var i = find(sw, used, m.t, 0); if (i >= 0) { mods[m.id] = 1; for (var j = 0; j < m.t.length; j++) used[i + j] = 'm'; } });
    var hits = [];
    P.intents.forEach(function (it) { var i = find(sw, used, it.t, 0); if (i >= 0) hits.push({ it: it, i: i, sc: it.t.length * 100 + it.prio }); });
    hits.sort(function (a, b) { return b.sc - a.sc; });
    hits.forEach(function (h) {
      var i = find(sw, used, h.it.t, 0); if (i < 0) return;
      if (!best) best = h.it;
      for (var j = 0; j < h.it.t.length; j++) used[i + j] = 'i';
    });
    if (!best && mods.short) best = { id: 'ask_essence', field: 'short' };
    if (!best && (mods.long || mods.simple)) best = { id: 'ask_explain', field: 'def' };
    if (!best) return null;
    var self = false;
    for (var y = 0; y < fixedW.length; y++) if (P.self[fixedW[y]] && used[y] !== 'i') self = true;
    markAll(fixedW, used, P.stop, 's');
    var topic = [], topics = [[]], pron = false;
    for (var x = 0; x < fixedW.length; x++) {
      var t = fixedW[x];
      if (SEP[t]) { if (topics[topics.length - 1].length) topics.push([]); continue; }
      if (used[x]) continue;
      if (P.pron[t]) { pron = true; continue; }
      if (P.self[t]) { self = true; continue; }
      topic.push(w[x]); topics[topics.length - 1].push(w[x]);
    }
    topics = topics.filter(function (a) { return a.length; }).map(function (a) { return a.join(' '); });
    var tp = topic.join(' ');
    if (slip && !tp && !fresh(st, now)) return null;
    var field = best.field;
    if (field === 'def' && mods.short) field = 'short';
    var tpl = (P.raw.canon || {})[field];
    return { kind: 'ask', intent: best.id, field: field, mods: mods, topic: tp, topics: topics, pron: pron, self: self, slip: slip,
      fixed: slip ? fixedW.join(' ') : null, canon: tp && tpl ? tpl.replace('{t}', tp) : null };
  }

  function fill(tpl, o) { return String(tpl || '').replace(/\{(\w+)\}/g, function (_m, k) { return o[k] != null ? o[k] : ''; }); }
  function pick(list) { return Array.isArray(list) ? list[0] : list; }
  function has(card, field) { if (!card) return false; if (field === 'def') return !!card.a; return !!(card.f && card.f[field]); }
  function nextField(card, st) {
    for (var i = 0; i < P.chain.length; i++) { var f = P.chain[i]; if (!st.told[f] && has(card, f)) return f; }
    return null;
  }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  // answer(card, field, mods, st, now) → {text, field, offer}
  function answer(card, field, mods, st, now) {
    mods = mods || {}; st = st || create();
    if (!st.card || st.card.id !== card.id) { st.told = {}; }
    st.card = card; st.at = now || Date.now();
    var R = P.raw, fr = R.frames || {}, fru = R.field_ru || {}, f = card.f || {}, title = cap(card.title), text;
    if (field === 'def' && mods.simple && f.short) field = 'short';
    if (field === 'def' || (field === 'short' && !f.short)) {
      field = 'def';
      text = '📘 **' + title + '**\n\n' + card.a;
      if (mods.long && f.ex && !st.told.ex) { text += '\n\n' + fill(pick(fr.ex), { ex: f.ex }); st.told.ex = 1; }
    } else if (f[field]) {
      var o = {}; o[field] = f[field];
      text = '📘 **' + title + '** · ' + (fru[field] || field) + '\n\n' + fill(pick(fr[field]), o);
    } else if (field === 'verify') {
      text = '📘 **' + title + '** · ' + (fru.verify || '') + '\n\n' + fill(pick(fr.verify), { verify: R.verify_default || '' });
    } else {
      text = fill(pick(fr.missing), { field: fru[field] || field, title: title, def: f.short || card.a });
    }
    st.told[field] = 1;
    var nx = nextField(card, st);
    st.offer = nx;
    if (nx && R.offers && R.offers[nx]) text += '\n\n' + fill(R.offer_tail, { offer: R.offers[nx] });
    return { text: text, field: field, offer: nx };
  }
  // followUp(go, st, now) → текст или null
  function followUp(go, st, now) {
    if (!fresh(st, now)) return null;
    var card = st.card;
    if (go === 'stop') { st.card = null; st.offer = null; return P.raw.stopped || '👌'; }
    if (go === 'offer') go = st.offer || 'next';
    if (go === 'next') {
      var nx = nextField(card, st);
      if (!nx) { var t = fill(P.raw.done, { title: cap(card.title) }); st.card = null; st.offer = null; return t; }
      go = nx;
    }
    if (go === 'short' && !(card.f && card.f.short)) go = 'def';
    return answer(card, go, {}, st, now).text;
  }
  function compare(a, b) {
    var sa = (a.f && a.f.short) || a.a, sb = (b.f && b.f.short) || b.a;
    return '⚖️ **' + cap(a.title) + '** и **' + cap(b.title) + '**\n\n• **' + cap(a.title) + '** — ' + sa + '\n\n• **' + cap(b.title) + '** — ' + sb;
  }

  // respond(text, st, deps) → Promise<string|null>
  // deps: { lookup(topic) → Promise<card|null>, pass(text) → Promise<string|null>, now? }
  // card: { id, title, a, f|null, kn:boolean }
  function respond(text, st, deps) {
    st = st || create();
    var now = deps.now || Date.now();
    function pass(q) {
      return Promise.resolve(deps.pass(q)).then(function (r) { if (r != null) { st.card = null; st.offer = null; } return r; });
    }
    var p = null;
    try { p = parse(text, st, now); } catch (e) { p = null; }
    if (p && p.kind === 'defer') return pass(text);
    if (!p) {
      // v14.14.0: голое понятие («наука», «фотосинтез») — сначала обычный путь, затем карточка понятия (только kn)
      var bare = toks(text);
      if (!P || !bare.length || bare.length > 3) return pass(text);
      return pass(text).then(function (r) {
        if (r != null) return r;
        return Promise.resolve(deps.lookup(norm(text))).then(function (c) { return c && c.kn ? answer(c, 'def', {}, st, now).text : null; });
      });
    }
    if (p.kind === 'fu') return Promise.resolve(followUp(p.go, st, now));
    var field = p.field;
    if (field === 'how_to') return pass(text);
    var cur = fresh(st, now) ? st.card : null;
    if (!p.topic) {
      if (cur && (p.pron || !p.self)) {
        // «расскажи ещё о нём» — без нового поля → следующее по цепочке
        if ((field === 'def' && st.told.def) || field === 'cmp') return Promise.resolve(followUp('next', st, now));
        return Promise.resolve(answer(cur, field, p.mods, st, now).text);
      }
      return pass(text);
    }
    if (field === 'cmp') {
      if (p.topics.length !== 2) return pass(text);
      return Promise.all([deps.lookup(p.topics[0]), deps.lookup(p.topics[1])]).then(function (cs) {
        if (cs[0] && cs[1] && cs[0].id !== cs[1].id) { st.card = null; return compare(cs[0], cs[1]); }
        return pass(text);
      });
    }
    return Promise.resolve(deps.lookup(p.topic)).then(function (card) {
      if (card && !card.kn && (field === 'def' || field === 'short')) {
        // обычная запись KB (не карточка понятия) — пусть отвечает KB в своём формате (🧠 KB · …, «Похожие»); карточка — запасной вариант
        return pass(text).then(function (r) { return r != null || !p.canon ? r : pass(p.canon); })
          .then(function (r) { return r != null ? r : answer(card, field, p.mods, st, now).text; });
      }
      if (card && card.kn) {
        if (cur && cur.id === card.id && field === 'def' && st.told.def && !p.mods.long) return followUp('next', st, now);
        return answer(card, field, p.mods, st, now).text;
      }
      return pass(text).then(function (r) {
        if (r != null || p.slip || !p.canon || norm(p.canon) === norm(text)) return r;
        return pass(p.canon);
      });
    });
  }

  // тема для запасных путей (журнал «нет в базе», карточки из Википедии, кнопки) — из фрейма, иначе вся фраза без паразитов
  function topicOf(text) {
    var p = null; try { p = parse(text, null, 0); } catch (e) {}
    if (p && p.kind === 'ask' && p.topic) return p.topic;
    if (p && p.kind === 'defer') return '';
    if (!P) return norm(text);
    var w = toks(text), used = [];
    markAll(w, used, P.fillers, 'f'); markAll(w, used, P.stop, 's');
    return w.filter(function (x, i) { return !used[i] && !P.self[x] && !P.pron[x]; }).join(' ');
  }
  function fallbackText(topic) {
    var R = (P && P.raw) || {}, t = String(topic || '').trim().slice(0, 80);
    var s = t ? fill(R.fallback || '🤷 Не знаю, этого нет в базе: «{topic}».', { topic: t }) : (R.fallback_notopic || '🤷 Не знаю, этого нет в базе.');
    // v14.14.0: коротко и честно + подсказка, где пополнить базу (Настройки → «🔄 Обновить базу офлайн-ответов»)
    if (R.fallback_hint) s += '\n' + R.fallback_hint;
    return s + '\n\n' + marker(t);
  }
  function marker(topic) { return '⟦EITIFB:' + encodeURIComponent(String(topic || '').slice(0, 80)) + '⟧'; }

  // ── Википедия (без ключа): только URL-ы и очистка ответа; сеть — у хоста и только по кнопке «🔄 Обновить базу» ──
  function wikiSearchUrl(q, lang) {
    return 'https://' + (lang === 'en' ? 'en' : 'ru') + '.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=' + encodeURIComponent(String(q || '').slice(0, 120));
  }
  function wikiSummaryUrl(title, lang) {
    return 'https://' + (lang === 'en' ? 'en' : 'ru') + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(String(title || '').replace(/ /g, '_'));
  }
  function wikiPick(json) {
    var h = json && json.query && json.query.search && json.query.search[0];
    return h && typeof h.title === 'string' ? h.title : null;
  }
  function clean(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f\u2028\u2029\uE000-\uF8FF⟦⟧]/g, ' ')
      .replace(/[<>`*_\[\]|#~\\]/g, '').replace(/\s+/g, ' ').replace(/ ([,.;:!?)»])/g, '$1').trim();
  }
  function wikiClean(json, lang) {
    if (!json || typeof json !== 'object' || json.type === 'disambiguation') return null;
    var title = clean(json.title).slice(0, 120), ex = clean(json.extract);
    if (!title || ex.length < 20) return null;
    if (ex.length > 700) { var c = ex.slice(0, 700), d = c.lastIndexOf('. '); ex = (d > 200 ? c.slice(0, d + 1) : c + '…'); }
    var host = 'https://' + (lang === 'en' ? 'en' : 'ru') + '.wikipedia.org/wiki/';
    var u = json.content_urls && json.content_urls.desktop && json.content_urls.desktop.page;
    var url = (typeof u === 'string' && u.indexOf(host) === 0 && !/[\s<>"'`]/.test(u)) ? u : host + encodeURIComponent(title.replace(/ /g, '_'));
    return { title: title, text: ex, url: url, lang: lang === 'en' ? 'en' : 'ru' };
  }
  function wikiFormat(r) {
    // v14.14.0: локальная карточка, сохранённая кнопкой «🔄 Обновить базу офлайн-ответов» — дальше отвечает без сети
    return '🌐 **из Википедии · ' + r.title + '**' + (r.lang === 'en' ? ' (англ.)' : '') + '\n\n' + r.text + '\n\nИсточник: ' + r.url;
  }

  return { load: load, loaded: loaded, create: create, parse: parse, answer: answer, followUp: followUp, respond: respond,
    topicOf: topicOf, fallbackText: fallbackText, marker: marker, stem: stem, norm: norm, TTL: TTL,
    wikiSearchUrl: wikiSearchUrl, wikiSummaryUrl: wikiSummaryUrl, wikiPick: wikiPick, wikiClean: wikiClean, wikiFormat: wikiFormat };
});
