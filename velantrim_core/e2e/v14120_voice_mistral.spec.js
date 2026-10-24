// v14.12.0: voice assistant providers (OpenAI / Qwen / Alice (Yandex) / Mistral) + Mistral AI chat provider.
const { test, expect } = require('@playwright/test');

async function boot(page, loc, ls = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ l, ls }) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_locale', l);
    for (const k of Object.keys(ls)) localStorage.setItem(k, ls[k]);
  }, { l: loc, ls });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
}

test('voice provider select: 6 options, boxes toggle, need-key/proxy hints', async ({ page }) => {
  await boot(page, 'ru');
  await page.evaluate(() => window.eitiOpenSettingsAt('ai-voice-provider'));
  const sel = page.locator('#ai-voice-provider');
  await expect(sel).toBeVisible();
  expect(await sel.locator('option').evaluateAll((o) => o.map((x) => x.value))).toEqual(['grok', 'gemini', 'openai', 'qwen', 'yandex', 'mistral']);
  await expect(sel.locator('option[value="yandex"]')).toHaveText('Алиса (Яндекс)');
  await sel.selectOption('qwen');
  await expect(page.locator('#ai-voice-qwen-box')).toBeVisible();
  await expect(page.locator('#ai-voice-grok-box')).toBeHidden();
  await expect(page.locator('#ai-voice-state')).toContainText('нужен прокси');
  await page.locator('#qwen-voice-proxy').fill('wss://proxy.example.com/rt');
  await page.locator('#qwen-voice-proxy').dispatchEvent('change');
  expect(await page.evaluate(() => [localStorage.getItem('eiti_voice_provider'), EitiVoice.needs('qwen')])).toEqual(['qwen', '']);
  await sel.selectOption('openai');
  await expect(page.locator('#ai-voice-openai-box')).toBeVisible();
  await expect(page.locator('#openai-voice-model option')).not.toHaveCount(0);
  await sel.selectOption('mistral');
  await expect(page.locator('#ai-voice-mistral-box')).toBeVisible();
  await expect(page.locator('#ai-voice-state')).toContainText('нужен ключ');
  await sel.selectOption('yandex');
  await expect(page.locator('#ai-voice-yandex-box')).toBeVisible();
  await page.locator('#ai-voice-settings').screenshot({ path: '/workspace/screens/settings-voice-providers.png' }).catch(() => {});
  expect(await page.evaluate(() => EitiVoice.label('yandex'))).toBe('Алиса (Яндекс)');
});

test('voice labels translated EN/DE', async ({ page }) => {
  await boot(page, 'en');
  expect(await page.evaluate(() => EitiVoice.label('yandex'))).toBe('Alice (Yandex)');
  await page.evaluate(() => window.eitiOpenSettingsAt('ai-voice-provider'));
  await expect(page.locator('#ai-voice-provider option[value="yandex"]')).toHaveText('Alice (Yandex)');
});

test('Mistral: settings card, key, picker group, streamed chat reply', async ({ page }) => {
  await page.route('https://api.mistral.ai/v1/chat/completions', (r) => r.fulfill({
    status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' },
    body: 'data: {"choices":[{"delta":{"content":"Привет "}}]}\n\ndata: {"choices":[{"delta":{"content":"от Mistral"}}]}\n\ndata: [DONE]\n\n',
  }));
  await boot(page, 'ru', { eiti_ai_provider: 'deepseek', deepseek_api_key: 'x' });
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('.cpi-ai-change') });
  await item.locator('.cpi-ai-change').click();
  const sheet = page.locator('#eiti-ai-sheet');
  await expect(sheet.locator('.eas-group[data-ai-prov="mistral"]')).toBeVisible();
  await sheet.locator('.eas-group[data-ai-prov="mistral"] .eas-prov').click();
  await page.screenshot({ path: '/workspace/screens/ai-picker-mistral.png' }).catch(() => {});
  await sheet.locator('.eas-group[data-ai-prov="mistral"] .chat-ai-key').click();
  await expect(page.locator('#mistral-key')).toBeFocused({ timeout: 3000 });
  await page.locator('#mistral-key').fill('test-key');
  await page.evaluate(() => window.eitiSetProvider('mistral'));
  await expect(page.locator('#eiti-pcheck-mistral')).toHaveText('✅');
  await page.evaluate(() => window.eitiMistralSetModel('mistral-large-4'));
  expect(await page.evaluate(() => [localStorage.getItem('eiti_ai_provider'), MISTRAL.getModel(), !!MISTRAL.getKey()])).toEqual(['mistral', 'mistral-large-4', true]);
  const out = await page.evaluate(() => window.eitiAskDeepSeek('тест'));
  expect(out).toBe('Привет от Mistral');
});
