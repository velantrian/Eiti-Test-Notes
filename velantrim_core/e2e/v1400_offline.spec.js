// @ts-check
// v14.0.0: offline dialogs — chat answers without network/key, tales with «дальше», Notes Ask AI fallback, style setting.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SHOTS = process.env.EITI_SHOTS_DIR || path.join(__dirname, 'test-results', 'shots-v1400');

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.EitiOffline === 'object' && typeof window.eitiAskDeepSeek === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.removeItem('eiti_ds_off'); localStorage.setItem('eiti_offline_mode', '0'); });
}

async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}

test('офлайн-движок не грузится на старте, init в простое быстрый, пакеты лениво', async ({ page }) => {
  const req = [];
  page.on('request', (r) => { if (/\/offline\//.test(r.url())) req.push(r.url()); });
  await boot(page);
  expect(req.length).toBe(0); // ничего офлайн-ного не грузится до load+4s/idle
  const r = await page.evaluate(async () => {
    const t0 = performance.now(); await EitiOffline.init(); const init = performance.now() - t0;
    const a = await EitiOffline.reply('расскажи грузинскую сказку');
    return { init, intent: a && a.intent, text: a && a.text, stats: EitiOffline.stats };
  });
  expect(r.text).toBeTruthy();
  expect(req.some((u) => /core\.json/.test(u))).toBe(true);
  expect(req.some((u) => /tales_caucasian\.json/.test(u))).toBe(true);
  expect(req.some((u) => /tales_slavic\.json/.test(u))).toBe(false);
  console.log('offline timing', JSON.stringify({ init: Math.round(r.init), stats: r.stats }));
});

test('чат без ключа: офлайн-диалог с контекстом и сказка с «дальше»', async ({ page }) => {
  await boot(page);
  await send(page, 'привет, как дела?');
  const msgs = page.locator('#messages .message.incoming');
  await expect(msgs.last()).toContainText(/Офлайн|офлайн|привет|Привет/, { timeout: 15000 });
  await send(page, 'расскажи сказку на ночь');
  await expect(msgs.last()).toContainText(/Режим сна|сказк|Сладких/i, { timeout: 15000 });
  const n = await msgs.count();
  await send(page, 'дальше');
  await expect.poll(() => msgs.count(), { timeout: 15000 }).toBeGreaterThan(n);
  await send(page, 'кто такой Кухулин');
  await expect(msgs.last()).toContainText('Кухулин', { timeout: 15000 });
  await expect(msgs.last().locator('.message-sender')).toContainText('EITI Offline');
  const st = await page.evaluate(() => new Promise((res) => { setTimeout(() => { const r = indexedDB.open('eiti_offline'); r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('state'); g.onsuccess = () => res(!!(g.result && g.result.st)); }; r.onerror = () => res(false); }, 700); }));
  expect(st).toBe(true); // состояние диалога — в IndexedDB
  if (test.info().project.name === 'webkit-iphone') {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, 'v1400-iphone-offline-chat.png') });
  }
});

test('нет сети: ИИ не вызывается, отвечает офлайн; стиль «деловой» без эмодзи', async ({ page, context }) => {
  await boot(page);
  await page.evaluate(async () => { localStorage.setItem('deepseek_api_key', window._obfKey('sk-test')); await EitiOffline.init(); });
  let aiCalls = 0;
  await page.route(/api\.deepseek\.com/, (r) => { aiCalls++; return r.abort(); });
  await context.setOffline(true);
  await expect(page.locator('#eiti-offline-style option')).toHaveCount(6);
  await page.evaluate(() => { const s = document.getElementById('eiti-offline-style'); s.value = 'pro'; s.dispatchEvent(new Event('change')); });
  const t = await page.evaluate(() => eitiAskDeepSeek('мне грустно'));
  expect(t).toBeTruthy();
  expect(/[\u{1F300}-\u{1FAFF}]/u.test(t.replace(/⟦EITIFOOT⟧[\s\S]*?⟦\/EITIFOOT⟧/, ''))).toBe(false);
  expect(aiCalls).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('eiti_offline_style'))).toBe('pro');
  await context.setOffline(false);
});

test('ИИ упал → офлайн-ответ вместо «❌ Ошибка»', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem('deepseek_api_key', window._obfKey('sk-test')));
  await page.route(/api\.deepseek\.com/, (r) => r.abort('failed'));
  const t = await page.evaluate(() => eitiAskDeepSeek('расскажи анекдот'));
  expect(t).toBeTruthy();
  expect(t).not.toContain('Ошибка');
});

test('Notes Ask AI: ошибка ИИ → офлайн-ответ в панели', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(async () => {
    window.eitiNotesAIIsEnabled = () => true;
    window.eitiNotesAICall = () => Promise.reject(new Error('Failed to fetch'));
    await eitiNotesAISend('привет');
    const k = eitiNotesAIChatKey();
    const chat = (typeof _eitiNotesAIChats !== 'undefined' ? _eitiNotesAIChats : {})[k] || [];
    return chat.map((m) => m.role + ':' + m.text).join('\n');
  });
  expect(out).toContain('assistant:');
  expect(out).toContain('Офлайн-ответ');
});
