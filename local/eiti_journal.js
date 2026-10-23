/* v14.9.0: EITI Journal — нормализованный дневник (RNE).
 * Pure UMD engine: one record per item, chat/context links, hash dedup, tombstones,
 * migration from the legacy blob and a compatibility view in the old shape.
 * record: {id:'j_<uuid>', kind, text, status, confidence, priority, blocking, chatId, contextId,
 *          msgIds[], noteIds[], parentId, source, hash, createdAt, updatedAt, del}
 * context: {id, title, chatIds[], updatedAt, del} */
(function (root, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else root.EitiJournal = m; })(this, function () {
  'use strict';
  var SECTIONS = ['goals', 'facts', 'questions', 'gaps', 'solutions'];
  var KIND = { goals: 'goal', facts: 'fact', questions: 'question', gaps: 'gap', solutions: 'solution' };
  var SECT = { goal: 'goals', fact: 'facts', question: 'questions', gap: 'gaps', solution: 'solutions' };
  var LEGACY_CTX = 'ctx_legacy', MSG_MAX = 20;

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function hash(s) {
    var h = 0x811c9dc5; s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function uuid() {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  var SKIP = { id: 1, confidence: 1, status: 1, priority: 1, blocking: 1, for_goal: 1 };
  function textOf(it) {
    if (typeof it === 'string') return it;
    if (!it || typeof it !== 'object') return '';
    var t = it.text || it.claim || it.what || it.description || it.content || '';
    if (!t) { var k = Object.keys(it).find(function (x) { return !SKIP[x] && typeof it[x] === 'string' && it[x].length > 2; }); if (k) t = it[k]; }
    return String(t || '').trim();
  }
  function ctxIdFor(title) { return 'ctx_' + hash(norm(title)); }

  /* Upsert one item. Dedup key: kind + hash(normalized text) + chatId (live records only). */
  function upsert(items, kind, raw, c) {
    c = c || {};
    var text = textOf(raw); if (!text) return null;
    var now = c.now || Date.now(), chatId = c.chatId == null ? null : String(c.chatId), h = hash(norm(text));
    var o = typeof raw === 'object' && raw ? raw : {};
    for (var i = 0; i < items.length; i++) {
      var r = items[i];
      if (!r.del && r.kind === kind && r.hash === h && (r.chatId || null) === chatId) {
        r.updatedAt = Math.max(now, (r.updatedAt || 0) + 1);
        if (typeof o.confidence === 'number') r.confidence = Math.max(r.confidence || 0, o.confidence);
        if (o.status) r.status = o.status;
        (c.msgIds || []).forEach(function (m) { if (r.msgIds.indexOf(m) < 0) r.msgIds.push(m); });
        if (r.msgIds.length > MSG_MAX) r.msgIds = r.msgIds.slice(-MSG_MAX);
        if (!r.contextId && c.contextId) r.contextId = c.contextId;
        return { rec: r, created: false };
      }
    }
    var rec = { id: 'j_' + (c.uuid || uuid)(), kind: kind, text: text, status: o.status || '', confidence: typeof o.confidence === 'number' ? o.confidence : null,
      priority: o.priority || '', blocking: !!o.blocking, chatId: chatId, contextId: c.contextId || null,
      msgIds: (c.msgIds || []).slice(-MSG_MAX), noteIds: (c.noteIds || []).slice(), parentId: c.parentId || null,
      source: c.source || 'auto', hash: h, createdAt: c.createdAt || now, updatedAt: now, del: 0 };
    items.push(rec);
    return { rec: rec, created: true };
  }

  /* Merge an LLM extraction {goals:[],facts:[],...}; for_goal → parentId (within batch, else same-chat goal). Returns changed records. */
  function mergeExtracted(items, ex, c) {
    c = c || {}; var changed = [], goalMap = {};
    if (!ex || typeof ex !== 'object') return changed;
    SECTIONS.forEach(function (sec) {
      (Array.isArray(ex[sec]) ? ex[sec] : []).forEach(function (raw) {
        var parentId = null;
        if (sec === 'solutions' && raw && raw.for_goal) parentId = goalMap[raw.for_goal] || null;
        var r = upsert(items, KIND[sec], raw, Object.assign({}, c, { parentId: parentId }));
        if (!r) return;
        if (sec === 'goals' && raw && raw.id) goalMap[raw.id] = r.rec.id;
        if (changed.indexOf(r.rec) < 0) changed.push(r.rec);
      });
    });
    return changed;
  }

  function ensureContext(contexts, id, title, chatId, now) {
    now = now || Date.now();
    var cx = contexts.find(function (x) { return x.id === id; });
    if (!cx) { cx = { id: id, title: String(title || id), chatIds: [], updatedAt: now, del: 0 }; contexts.push(cx); }
    else if (cx.del) { cx.del = 0; cx.updatedAt = now; }
    if (chatId != null && cx.chatIds.indexOf(String(chatId)) < 0) { cx.chatIds.push(String(chatId)); cx.updatedAt = Math.max(now, cx.updatedAt + 1); }
    return cx;
  }

  /* Legacy blob → records. Idempotent: re-running over the same items adds nothing (hash dedup). */
  function migrate(blob, items, contexts, c) {
    c = c || {}; var now = c.now || Date.now(); items = items || []; contexts = contexts || [];
    var d = (blob && blob.data) || blob || {};
    ensureContext(contexts, LEGACY_CTX, 'Общее', null, now);
    var changed = [], goalMap = {};
    SECTIONS.forEach(function (sec) {
      (Array.isArray(d[sec]) ? d[sec] : []).forEach(function (raw) {
        var parentId = sec === 'solutions' && raw && raw.for_goal ? (goalMap[raw.for_goal] || null) : null;
        var r = upsert(items, KIND[sec], raw, { now: now, uuid: c.uuid, chatId: null, contextId: LEGACY_CTX, source: 'auto', parentId: parentId, createdAt: d.lastExtracted || now });
        if (!r) return;
        if (sec === 'goals' && raw && raw.id) goalMap[raw.id] = r.rec.id;
        if (r.created) changed.push(r.rec);
      });
    });
    (Array.isArray(d.smartSections) ? d.smartSections : []).forEach(function (s) {
      if (!s || !s.title) return;
      var cx = ensureContext(contexts, ctxIdFor(s.title), s.title, null, now);
      (s.items || []).forEach(function (t) {
        var r = upsert(items, 'fact', t, { now: now, uuid: c.uuid, chatId: null, contextId: cx.id, source: 'smart' });
        if (r && r.created) changed.push(r.rec);
      });
    });
    return { items: items, contexts: contexts, changed: changed,
      meta: { id: 'journal_meta', migrated: 1, v: 1, chatHistory: d.chatHistory || [], smartSections: d.smartSections || [],
        lastExtracted: d.lastExtracted || 0, msgCountSinceExtract: d.msgCountSinceExtract || 0, migratedAt: now } };
  }

  function legacyItem(r) {
    var o = { id: r.id, _jid: r.id, text: r.text };
    if (r.status) o.status = r.status;
    if (r.priority) o.priority = r.priority;
    if (r.confidence != null) o.confidence = r.confidence;
    if (r.blocking) o.blocking = true;
    if (r.parentId) o.for_goal = r.parentId;
    return o;
  }
  function empty() { return { goals: [], facts: [], questions: [], gaps: [], solutions: [] }; }
  function live(items) { return (items || []).filter(function (r) { return r && !r.del && SECT[r.kind]; }); }

  /* Compatibility view in the old shape. mode: perchat (only chatId) | dated (updatedAt desc) | smart (grouped by context) | user (creation order). */
  function view(items, o) {
    o = o || {}; var out = empty(), list = live(items);
    if (o.mode === 'perchat') list = list.filter(function (r) { return o.chatId != null && r.chatId === String(o.chatId); });
    if (o.mode === 'dated') list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    else if (o.mode === 'smart') list.sort(function (a, b) { return String(a.contextId || '~').localeCompare(String(b.contextId || '~')) || (a.createdAt || 0) - (b.createdAt || 0); });
    else list.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    list.forEach(function (r) { out[SECT[r.kind]].push(legacyItem(r)); });
    return out;
  }

  /* AI context: current chat → its context → global (rest), newest first inside each tier, cap per section. */
  function forAI(items, o) {
    o = o || {}; var cap = o.cap || 15, out = empty(), chatId = o.chatId == null ? null : String(o.chatId);
    var tier = function (r) { return chatId && r.chatId === chatId ? 0 : (o.contextId && r.contextId === o.contextId ? 1 : 2); };
    live(items).sort(function (a, b) { return tier(a) - tier(b) || (b.updatedAt || 0) - (a.updatedAt || 0); })
      .forEach(function (r) { var s = out[SECT[r.kind]]; if (s.length < cap) s.push(legacyItem(r)); });
    return out;
  }

  function tombstone(r, now) { now = now || Date.now(); r.del = 1; r.updatedAt = Math.max(now, (r.updatedAt || 0) + 1); return r; }
  function tombstoneAll(items, now) { return live(items).map(function (r) { return tombstone(r, now); }); }
  function detachChat(items, contexts, chatId, now) {
    now = now || Date.now(); chatId = String(chatId); var ch = [];
    (items || []).forEach(function (r) { if (r.chatId === chatId) { r.chatId = null; r.updatedAt = Math.max(now, (r.updatedAt || 0) + 1); ch.push(r); } });
    var cc = [];
    (contexts || []).forEach(function (x) { var i = x.chatIds.indexOf(chatId); if (i >= 0) { x.chatIds.splice(i, 1); x.updatedAt = Math.max(now, x.updatedAt + 1); cc.push(x); } });
    return { items: ch, contexts: cc };
  }

  return { SECTIONS: SECTIONS, KIND: KIND, SECT: SECT, LEGACY_CTX: LEGACY_CTX, norm: norm, hash: hash, uuid: uuid, textOf: textOf, ctxIdFor: ctxIdFor,
    upsert: upsert, mergeExtracted: mergeExtracted, ensureContext: ensureContext, migrate: migrate, view: view, forAI: forAI,
    tombstone: tombstone, tombstoneAll: tombstoneAll, detachChat: detachChat };
});
