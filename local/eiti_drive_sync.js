/* VELANTRIM EITI — v14.7.0 Drive sync merge engine (pure, no DOM, no network).
 * Loaded lazily by the Google Drive block in index.html (only once the user is signed in).
 * One JSON file on Drive (EITI/eiti_backup.json, format "eiti-sync/2"):
 *   { format, version, exported, settings:{k:v} (compat with <=14.6 restore),
 *     sync:{ settings:{k:{t,v}|{t,del:1}}, stores:{store:{id:{t,d}|{t,del:1}}} } }
 * Rules: per item by id, newest t wins (tie → local, no write); deletions are kept as
 * tombstones (pruned after 90 days); settings are merged per key; API keys / tokens never leave the device.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiDriveSync = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FORMAT = 'eiti-sync/2';
  var TOMBSTONE_TTL = 90 * 86400000;
  var MAX_SETTING_LEN = 256 * 1024;
  // Never synced: API keys, tokens, secrets, PINs, Drive/sync bookkeeping, device-only flags.
  var SECRET_RE = /api[_-]?key|apikey|token|secret|passw|_pin|pincode|bearer|auth|cookie|session|openrouter|eiti_grok|eiti_xai|_key$|_key_|^eiti_drive_|^eiti_sync_/i;

  function isSecretKey(k) { return !k || SECRET_RE.test(String(k)); }

  function hash(v) {
    var s = typeof v === 'string' ? v : JSON.stringify(v);
    var h1 = 5381, h2 = 52711;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = (h1 * 33) ^ c; h2 = (h2 * 33) ^ c; }
    return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36);
  }

  function toMs(x) {
    if (x == null || x === '') return 0;
    if (typeof x === 'number') return x < 1e11 ? x * 1000 : x;
    var n = Date.parse(x); return isNaN(n) ? 0 : n;
  }
  function itemTime(it) {
    if (!it || typeof it !== 'object') return 0;
    return Math.max(toMs(it.updatedAt), toMs(it.updated), toMs(it.modified), toMs(it.lastModified),
      toMs(it.ts), toMs(it.created), toMs(it.createdAt), toMs(it.date));
  }

  function filterSettings(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (isSecretKey(k) || typeof v !== 'string' || v.length > MAX_SETTING_LEN) return;
      out[k] = v;
    });
    return out;
  }

  /* Build the local side.
   * data: { stores:{name:[items]}, settings:{k:v} }, keys: {name: 'id'|'name'|fn}
   * state (from last sync): { stores:{name:{id:[h,t,del]}}, settings:{k:[h,t,del]} }
   * Changed-since-last-sync items get t = max(itemTime, now) so a local edit beats the old remote copy;
   * items missing locally but known in state become tombstones (local delete). */
  function side(cur, st, now, valueOf) {
    var out = {};
    st = st || {};
    Object.keys(cur).forEach(function (id) {
      var v = cur[id], h = hash(v), prev = st[id], t;
      if (prev && !prev[2] && prev[0] === h) t = prev[1];
      else if (prev) t = Math.max(valueOf(v), now, prev[1] + 1);
      else t = valueOf(v) || now;
      out[id] = { t: t, d: v, h: h };
    });
    Object.keys(st).forEach(function (id) {
      if (out[id]) return;
      var p = st[id];
      out[id] = p[2] ? { t: p[1], del: 1 } : { t: Math.max(now, p[1] + 1), del: 1 };
    });
    return out;
  }

  function keyFn(k) { return typeof k === 'function' ? k : function (it) { return it && it[k || 'id']; }; }

  function buildLocal(data, keys, state, now) {
    now = now || Date.now(); state = state || {}; keys = keys || {};
    var stores = {};
    Object.keys((data && data.stores) || {}).forEach(function (name) {
      var kf = keyFn(keys[name]), cur = {};
      (data.stores[name] || []).forEach(function (it) { var id = kf(it); if (id != null && id !== '') cur[String(id)] = it; });
      stores[name] = side(cur, (state.stores || {})[name], now, itemTime);
    });
    var settings = side(filterSettings(data && data.settings), state.settings, now, function () { return 0; });
    return { stores: stores, settings: settings };
  }

  /* Normalize a remote file (new format, legacy v12.9.12 backup, or nothing). */
  function fromRemote(json) {
    var empty = { stores: {}, settings: {} };
    if (!json || typeof json !== 'object') return empty;
    if (json.sync && json.sync.stores) {
      var s = { stores: json.sync.stores || {}, settings: json.sync.settings || {} };
      Object.keys(s.settings).forEach(function (k) { if (isSecretKey(k)) delete s.settings[k]; });
      return s;
    }
    // legacy: { settings:{}, chats:[], notes:[], files:[], l2:[], kb:[] } — every item counts as "old" (t from its own fields)
    var legacyKeys = { notes: 'id', chats: 'id', files: 'name', l2: 'chatId', kb: 'id' };
    var out = { stores: {}, settings: {} };
    Object.keys(legacyKeys).forEach(function (name) {
      if (!Array.isArray(json[name])) return;
      var m = {};
      json[name].forEach(function (it) { var id = it && it[legacyKeys[name]]; if (id != null) m[String(id)] = { t: itemTime(it), d: it }; });
      out.stores[name] = m;
    });
    var st = filterSettings(json.settings);
    Object.keys(st).forEach(function (k) { out.settings[k] = { t: 0, v: st[k] }; });
    return out;
  }

  function mergeMap(loc, rem, now, isSettings) {
    var merged = {}, puts = [], dels = [], remoteChanged = false;
    var ids = {};
    Object.keys(loc || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(rem || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) {
      var l = loc && loc[id], r = rem && rem[id];
      var rv = r && !r.del ? (isSettings ? r.v : r.d) : undefined;
      var win;
      if (!r) win = 'l';
      else if (!l) win = 'r';
      else if (r.t > l.t) win = 'r';
      else win = 'l';
      if (win === 'l') {
        var e = l.del ? { t: l.t, del: 1 } : (isSettings ? { t: l.t, v: l.d } : { t: l.t, d: l.d });
        if (!r || r.t !== e.t || !!r.del !== !!e.del || (!e.del && hash(rv) !== l.h)) remoteChanged = true;
        merged[id] = e;
      } else {
        merged[id] = r.del ? { t: r.t, del: 1 } : (isSettings ? { t: r.t, v: rv } : { t: r.t, d: rv });
        if (r.del) { if (l && !l.del) dels.push(id); }
        else if (!l || l.del || hash(rv) !== l.h) puts.push(isSettings ? [id, rv] : rv);
      }
      if (merged[id].del && now - merged[id].t > TOMBSTONE_TTL) { delete merged[id]; remoteChanged = true; }
    });
    return { merged: merged, puts: puts, dels: dels, remoteChanged: remoteChanged };
  }

  /* merge(local, remote) → { file:{sync}, apply:{stores:{name:{puts,dels}}, settings:{puts:[[k,v]],dels:[k]}}, remoteChanged, state } */
  function merge(local, remote, now) {
    now = now || Date.now();
    remote = remote || { stores: {}, settings: {} };
    var out = { sync: { stores: {}, settings: {} }, apply: { stores: {}, settings: null }, remoteChanged: false, state: { stores: {}, settings: {} } };
    var names = {};
    Object.keys(local.stores || {}).forEach(function (n) { names[n] = 1; });
    Object.keys(remote.stores || {}).forEach(function (n) { names[n] = 1; });
    Object.keys(names).forEach(function (n) {
      var m = mergeMap((local.stores || {})[n], (remote.stores || {})[n], now, false);
      out.sync.stores[n] = m.merged;
      out.apply.stores[n] = { puts: m.puts, dels: m.dels };
      if (m.remoteChanged) out.remoteChanged = true;
      out.state.stores[n] = stateOf(m.merged, false);
    });
    var sm = mergeMap(local.settings, remote.settings, now, true);
    out.sync.settings = sm.merged;
    out.apply.settings = { puts: sm.puts, dels: sm.dels };
    if (sm.remoteChanged) out.remoteChanged = true;
    out.state.settings = stateOf(sm.merged, true);
    return out;
  }

  function stateOf(m, isSettings) {
    var st = {};
    Object.keys(m).forEach(function (id) { var e = m[id]; st[id] = e.del ? [0, e.t, 1] : [hash(isSettings ? e.v : e.d), e.t]; });
    return st;
  }

  function toFile(sync, version, now) {
    var plain = {};
    Object.keys(sync.settings || {}).forEach(function (k) { var e = sync.settings[k]; if (!e.del && !isSecretKey(k)) plain[k] = e.v; });
    return { format: FORMAT, version: version || '?', exported: new Date(now || Date.now()).toISOString(), settings: plain, sync: sync };
  }

  return { FORMAT: FORMAT, hash: hash, itemTime: itemTime, isSecretKey: isSecretKey, filterSettings: filterSettings,
    buildLocal: buildLocal, fromRemote: fromRemote, merge: merge, toFile: toFile };
});
