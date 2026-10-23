// @ts-check
// v14.9.0: дневник — записи в IDB journal/contexts (миграция из старого блоба, по чатам, удаление метками),
// выбор голосового провайдера (Grok Voice / Gemini Live), тост «Переключить на …», 16 кГц для Gemini.
const { test, expect } = require('@playwright/test');
const SHOTS = process.env.EITI_SHOTS_DIR || '';
test.use({ locale: 'ru-RU', serviceWorkers: 'block' });

const LEGACY = { goals: [{ id: 'g1', text: 'Выучить немецкий' }], facts: [{ text: 'Живу в Берлине' }, { text: 'Живу в Берлине' }],
  questions: [{ text: 'Какой курс выбрать?' }], gaps: [], solutions: [{ text: 'Курс A1 онлайн', for_goal: 'g1' }],
  smartSections: [], chatHistory: [], lastExtracted: 0, msgCountSinceExtract: 0 };

function mocks() {
  window.__ws = [];
  class FakeWS {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; window.__ws.push(this); setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); }, 10); }
    send(d) { this.sent.push(typeof d === 'string' ? JSON.parse(d) : d); }
    close(code, reason) { if (this.readyState === 3) return; this.readyState = 3; setTimeout(() => this.onclose && this.onclose({ code: code || 1000, reason: reason || '' }), 0); }
  }
  FakeWS.OPEN = 1;
  window.WebSocket = FakeWS;
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => new Promise(() => {});
}

async function boot(page, ls) {
  await page.addInitScript(({ ls }) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [k, v] of Object.entries(ls || {})) localStorage.setItem(k, v);
  }, { ls });
  await page.addInitScript(mocks);
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof openView === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb && !!window.EitiJournal && !!window.EitiVoice, null, { timeout: 30_000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); });
}

test('дневник: миграция старого блоба → записи journal, бэкап, дедуп, удаление меткой', async ({ page }) => {
  await boot(page, { eiti_rne_v1: JSON.stringify(LEGACY) });
  await page.evaluate(() => { openView('journal'); window.eitiJournalReload && window.eitiJournalReload(); });
  await page.waitForFunction(() => window._eitiJournalDebug().ready && window._eitiJournalDebug().items.length >= 4, null, { timeout: 15_000 });
  const st = await page.evaluate(() => new Promise((res) => {
    const tx = eitiDb.transaction(['journal', 'contexts', 'reasoning'], 'readonly'); const out = {};
    tx.objectStore('journal').getAll().onsuccess = (e) => { out.items = e.target.result; };
    tx.objectStore('contexts').getAll().onsuccess = (e) => { out.ctx = e.target.result; };
    tx.objectStore('reasoning').get('journal_meta').onsuccess = (e) => { out.meta = e.target.result; };
    tx.objectStore('reasoning').get('eiti_rne_data_v1_bak').onsuccess = (e) => { out.bak = e.target.result; };
    tx.oncomplete = () => res({ n: out.items.length, kinds: out.items.map((r) => r.kind).sort(), ctx: out.ctx.map((c) => c.title),
      sol: out.items.find((r) => r.kind === 'solution'), goal: out.items.find((r) => r.kind === 'goal'), migrated: out.meta && out.meta.migrated,
      bak: !!(out.bak && out.bak.data), ls: localStorage.getItem('eiti_rne_v1'), v: eitiDb.version });
  }));
  expect(st.v).toBe(17);
  expect(st.n).toBe(4); // дубль «Живу в Берлине» слит
  expect(st.ctx).toContain('Общее');
  expect(st.sol.parentId).toBe(st.goal.id);
  expect(st.migrated).toBe(1);
  expect(st.bak).toBe(true);
  expect(st.ls).toBeNull();
  // UI прежний: секция «Цели» показывает пункт
  await page.evaluate(() => eitiRneSwitchSection('goals'));
  await expect(page.locator('#view-journal')).toContainText('Выучить немецкий');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/journal.png` });
  // удаление → del:1, после перезагрузки не возвращается и миграция не повторяется
  await page.evaluate(() => eitiRneDeleteItem('goals', 0));
  await page.waitForFunction(() => new Promise((res) => { // запись транзакции завершена
    eitiDb.transaction('journal', 'readonly').objectStore('journal').getAll().onsuccess = (e) => res(e.target.result.some((r) => r.del === 1));
  }));
  await page.reload();
  await page.waitForFunction(() => !!window._eitiJournalDebug && window._eitiJournalDebug().ready, null, { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => { openView('journal'); return window.eitiJournalReload(); });
  const after = await page.evaluate(() => { const d = window._eitiJournalDebug(); return { live: d.items.filter((r) => !r.del).length, dead: d.items.filter((r) => r.del).length, goals: window.eitiRNEGet().goals.length }; });
  expect(after).toEqual({ live: 3, dead: 1, goals: 0 });
});

test('дневник «для каждого чата»: пункты привязаны к chatId', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async () => {
    await window.eitiJournalReload();
    const J = window.EitiJournal, d = window._eitiJournalDebug();
    J.upsert(d.items, 'fact', 'Факт чата 1', { chatId: 'c1' });
    J.upsert(d.items, 'fact', 'Факт чата 2', { chatId: 'c2' });
    eitiCurrentChatId = 'c1';
    openView('journal'); eitiRneSwitchSection('facts');
    eitiRneSetDiaryType('perchat');
    const txt = () => document.getElementById('view-journal').innerText;
    const a = ['Факт чата 1', 'Факт чата 2'].filter((t) => txt().includes(t));
    eitiRneSetDiaryType('dated');
    const b = ['Факт чата 1', 'Факт чата 2'].filter((t) => txt().includes(t)).length;
    const ai = window.eitiRNEGet().facts.map((f) => f.text); // ИИ: сначала текущий чат
    window.eitiJournalDetachChat('c1');
    return { a, b, ai0: ai[0], detached: d.items.find((x) => x.text === 'Факт чата 1').chatId };
  });
  expect(r.a).toEqual(['Факт чата 1']);
  expect(r.b).toBe(2);
  expect(r.ai0).toBe('Факт чата 1');
  expect(r.detached).toBeNull();
});

test('голос: выбор провайдера в настройках, подпись кнопки, тост «Переключить на Grok Voice»', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => openView('settings'));
  await expect(page.locator('#ai-voice-provider')).toHaveValue('gemini');
  await expect(page.locator('#ai-voice-settings')).toContainText('Голосовой ассистент');
  expect(await page.evaluate(() => EitiVoice.label())).toBe('Gemini Live');
  if (SHOTS) { await page.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); document.getElementById('ai-voice-settings').scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/voice-settings.png` }); }
  await page.evaluate(() => { localStorage.removeItem('eiti_gemini_key'); localStorage.removeItem('eiti_gemini_live_key'); openView('chat'); eitiChatGrokToggle(); });
  const btn = page.locator('.eiti-voice-switch-btn');
  await expect(btn).toContainText('Grok Voice');
  await btn.click();
  expect(await page.evaluate(() => ({ p: localStorage.getItem('eiti_voice_provider') || 'grok', l: EitiVoice.label() }))).toEqual({ p: 'grok', l: 'Grok Voice' });
});

test('Gemini Live: всегда audio/pcm;rate=16000, пересэмплирование 48к→16к', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  const r = await page.evaluate(() => {
    const out = window.eitiResamplePCM16(new Int16Array(960).fill(500), 48000, 16000);
    return { n: out.length, v: out[100] };
  });
  expect(r).toEqual({ n: 320, v: 500 });
  await page.evaluate(() => { localStorage.setItem('eiti_gemini_live_key', _obfKey('AIza-x')); openView('chat'); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].sent.length === 1);
  expect(await page.evaluate(() => window.__ws[0].url)).toContain('BidiGenerateContent?key=AIza-x');
  await page.evaluate(() => eitiChatGrokToggle());
});
