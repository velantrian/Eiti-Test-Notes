// @ts-check
// v14.7.0: Google Drive — sign in once (consent only first time), auto-sync triggers, restore writes notes into IndexedDB without reload.
// Google endpoints are fully mocked: GIS script + Drive v3 REST (in-memory).
const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block', locale: 'ru-RU' });

const FAKE_GIS = `
window.__gis = { prompts: [], revoked: 0 };
window.google = { accounts: { oauth2: {
  initTokenClient: function (cfg) {
    window.__gis.cfg = { client_id: cfg.client_id, scope: cfg.scope };
    return { requestAccessToken: function (o) {
      window.__gis.prompts.push(o && o.prompt);
      setTimeout(function () { cfg.callback({ access_token: 'tok' + window.__gis.prompts.length, expires_in: 3600 }); }, 10);
    } };
  },
  revoke: function (t, cb) { window.__gis.revoked++; cb && cb(); }
} } };`;

function mockDrive(page, seed) {
  const files = {};          // id → {id,name,mimeType,parents,content,version,modifiedTime}
  const log = [];
  let n = 0;
  const add = (f) => { const id = 'id' + (++n); files[id] = Object.assign({ id, version: '1', modifiedTime: new Date().toISOString(), parents: [] }, f); return files[id]; };
  if (seed) seed(add);
  const bump = (f) => { f.version = String(+f.version + 1); f.modifiedTime = new Date(Date.now() + +f.version).toISOString(); };
  const meta = (f) => ({ id: f.id, name: f.name, version: f.version, modifiedTime: f.modifiedTime, trashed: false });
  page.route('https://accounts.google.com/gsi/client', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_GIS }));
  page.route('https://www.googleapis.com/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    const auth = req.headers()['authorization'] || '';
    log.push({ m, path: url.pathname, q: url.searchParams.get('q') || '', auth, body: m === 'GET' ? '' : (req.postData() || '') });
    const json = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (!/^Bearer tok\d+$/.test(auth)) return json({ error: 'unauth' }, 401);
    const p = url.pathname;
    if (p === '/drive/v3/about') return json({ user: { emailAddress: 'me@example.com' } });
    if (p === '/drive/v3/files' && m === 'GET') {
      const q = url.searchParams.get('q') || '';
      const name = (q.match(/name='([^']+)'/) || [])[1];
      const parent = (q.match(/'([^']+)' in parents/) || [])[1];
      const isFolder = /google-apps\.folder/.test(q);
      const list = Object.values(files).filter((f) => f.name === name && (!parent || f.parents.includes(parent)) && (!isFolder || f.mimeType === 'application/vnd.google-apps.folder'));
      return json({ files: list.map(meta) });
    }
    if (p === '/drive/v3/files' && m === 'POST') { const b = JSON.parse(req.postData() || '{}'); return json(meta(add({ name: b.name, mimeType: b.mimeType }))); }
    let mm = p.match(/^\/drive\/v3\/files\/([^/]+)$/);
    if (mm && m === 'GET') {
      const f = files[mm[1]]; if (!f) return json({ error: 'nf' }, 404);
      if (url.searchParams.get('alt') === 'media') return route.fulfill({ status: 200, contentType: 'application/json', body: f.content || '' });
      return json(meta(f));
    }
    if (p === '/upload/drive/v3/files' && m === 'POST') {
      const body = req.postData() || '';
      const parts = body.split(/--eitiboundary\d+/);
      const mt = JSON.parse(parts[1].split('\r\n\r\n')[1]);
      const content = parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
      return json(meta(add({ name: mt.name, parents: mt.parents, mimeType: 'application/json', content })));
    }
    mm = p.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/);
    if (mm && m === 'PATCH') { const f = files[mm[1]]; f.content = req.postData() || ''; bump(f); return json(meta(f)); }
    return json({ error: 'unmocked ' + m + ' ' + p }, 400);
  });
  return { files, log };
}

async function boot(page, extra) {
  await page.addInitScript((x) => {
    if (sessionStorage.getItem('__booted')) return;
    sessionStorage.setItem('__booted', '1');
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_drive_client_id', 'test-client.apps.googleusercontent.com');
    localStorage.setItem('deepseek_api_key', 'sk-SECRET-should-not-sync');
    Object.keys(x || {}).forEach((k) => localStorage.setItem(k, x[k]));
  }, extra || {});
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof eitiDb !== 'undefined' && !!eitiDb && typeof window.eitiDriveSyncNow === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal').forEach((e) => e.remove()));
}

const legacyBackup = JSON.stringify({
  version: '13.0', exported: '2026-01-01T00:00:00Z', settings: { eiti_drive_test_flag: 'x', eiti_e2e_setting: 'from-drive' },
  notes: [{ id: 'drive_note_1', title: 'С другого устройства', body: 'Привет с Drive', created: 1767225600000, updated: 1767225600000, tags: [] }],
  chats: [], files: [], l2: [], kb: [],
});

test('вход через Google: существующая папка EITI, восстановление пишет заметку в IDB без перезагрузки, автосинхронизация', async ({ page }) => {
  test.setTimeout(90_000);
  const drive = mockDrive(page, (add) => {
    const folder = add({ name: 'EITI', mimeType: 'application/vnd.google-apps.folder' });
    add({ name: 'eiti_backup.json', parents: [folder.id], mimeType: 'application/json', content: legacyBackup });
  });
  await boot(page);
  // GIS is not loaded until the user signs in
  expect(await page.evaluate(() => !!(window.google && window.google.accounts))).toBe(false);

  await page.evaluate(() => eitiDriveOpenView());
  const btn = page.locator('#drive-connect-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Войти через Google');
  await expect(page.locator('#drive-client-id-group, #drive-client-id-input')).toHaveCount(0); // no client-ID field at all
  await expect(btn).toBeEnabled();
  await btn.click();

  await expect(page.locator('#drive-sync-status')).toContainText(/✅ Синхронизировано \d\d:\d\d/, { timeout: 20000 });
  await expect(page.locator('#drive-status-email')).toContainText('me@example.com');
  expect(await page.evaluate(() => window.__gis.prompts)).toEqual(['select_account consent']);
  expect(await page.evaluate(() => window.__gis.cfg.scope)).toBe('https://www.googleapis.com/auth/drive.file');

  // restore: the note is in memory and in IndexedDB, no reload; setting applied
  expect(await page.evaluate(() => notesLoad().some((n) => n.id === 'drive_note_1'))).toBe(true);
  const inIdb = await page.evaluate(() => new Promise((res) => {
    const rq = eitiDb.transaction(['notes'], 'readonly').objectStore('notes').get('drive_note_1');
    rq.onsuccess = () => res(rq.result && rq.result.body);
  }));
  expect(inIdb).toBe('Привет с Drive');
  expect(await page.evaluate(() => localStorage.getItem('eiti_e2e_setting'))).toBe('from-drive');

  // existing folder reused, no new folder; upgraded in place (PATCH, same file)
  expect(drive.log.filter((l) => l.m === 'POST' && l.path === '/drive/v3/files').length).toBe(0);
  expect(Object.values(drive.files).filter((f) => f.name === 'EITI').length).toBe(1);
  const file = Object.values(drive.files).find((f) => f.name === 'eiti_backup.json');
  expect(JSON.parse(file.content).format).toBe('eiti-sync/2');
  expect(file.content).not.toContain('sk-SECRET');
  expect(file.content).not.toContain('"tok');

  // change → debounced auto-sync (~8 s)
  const v0 = file.version;
  await page.evaluate(() => {
    const ns = notesLoad();
    ns.push({ id: 'local_new', title: 'Новая', body: 'Локальная заметка', created: Date.now(), updated: Date.now(), tags: [] });
    notesSave(ns);
  });
  await expect.poll(() => file.content.includes('Локальная заметка'), { timeout: 20000 }).toBe(true);
  expect(+file.version).toBeGreaterThan(+v0);

  // hidden → push immediately
  await page.evaluate(() => {
    const ns = notesLoad();
    ns.push({ id: 'local_hidden', title: 'H', body: 'Перед сворачиванием', created: Date.now(), updated: Date.now(), tags: [] });
    notesSave(ns);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => file.content.includes('Перед сворачиванием'), { timeout: 5000 }).toBe(true);

  // another device edits the file → visible → pull applies it without reload
  const f = JSON.parse(file.content);
  f.sync.stores.notes.remote_2 = { t: Date.now() + 60000, d: { id: 'remote_2', title: 'R2', body: 'Пришло при возврате', created: Date.now(), updated: Date.now() + 60000, tags: [] } };
  file.content = JSON.stringify(f); file.version = String(+file.version + 1);
  await page.evaluate(() => {
    localStorage.setItem('eiti_drive_last_sync', String(Date.now() - 60000)); // last sync > 30 s ago
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => notesLoad().some((n) => n.id === 'remote_2')), { timeout: 10000 }).toBe(true);

  // token expiry → silent renewal with prompt '' (not consent again), 401 retried once
  await page.evaluate(() => { localStorage.setItem('eiti_drive_token', 'expired'); localStorage.setItem('eiti_drive_token_exp', String(Date.now() + 3600000)); });
  await page.evaluate(() => eitiDriveSyncNow('manual'));
  await expect(page.locator('#drive-sync-status')).toContainText('✅', { timeout: 10000 });
  expect(await page.evaluate(() => window.__gis.prompts)).toEqual(['select_account consent', '']);
});

test('после перезагрузки: синхронизация при открытии без повторного согласия', async ({ page }) => {
  test.setTimeout(60_000);
  const drive = mockDrive(page);
  await boot(page, { eiti_drive_signed_in: '1', eiti_drive_consented: '1', eiti_drive_token: 'tok9', eiti_drive_token_exp: String(Date.now() + 3600000) });
  // on open (after IDB ready) a folder + file get created and the status shows synced
  await expect.poll(() => Object.values(drive.files).some((f) => f.name === 'eiti_backup.json'), { timeout: 20000 }).toBe(true);
  expect(Object.values(drive.files).filter((f) => f.name === 'EITI').length).toBe(1);
  expect(await page.evaluate(() => (window.__gis ? window.__gis.prompts.length : 0))).toBe(0);
  // sign out clears state and shows the sign-in button again
  await page.evaluate(() => { eitiDriveOpenView(); eitiDriveDisconnect(); });
  await expect(page.locator('#drive-connect-btn')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('eiti_drive_token'))).toBeNull();
});

test('без Client ID кнопка входа неактивна, поля для ID нет', async ({ page }) => {
  await boot(page, { eiti_drive_client_id: '' });
  await page.evaluate(() => { localStorage.removeItem('eiti_drive_client_id'); eitiDriveOpenView(); });
  await expect(page.locator('#drive-connect-btn')).toBeDisabled();
  await expect(page.locator('#drive-client-id-input')).toHaveCount(0);
});
