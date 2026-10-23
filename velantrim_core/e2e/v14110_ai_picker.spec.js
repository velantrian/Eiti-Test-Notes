// v14.11.0: «+» → chat AI item shows the current provider/model; «change» opens an inline picker of all chat models.
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

test('chat AI item: current model, change → picker, pick switches & persists, no-key → settings', async ({ page }) => {
  await boot(page, 'ru', { eiti_ai_provider: 'deepseek', eiti_ds_model: 'deepseek-flash', deepseek_api_key: 'x', eiti_or_key: 'x' });
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('.cpi-ai-change') });
  await expect(item.locator('.cpi-ai-cur')).toHaveText('DeepSeek · V4.1 Flash');
  await expect(item.locator('.cpi-state')).toHaveText(/вкл|выкл/);
  await item.locator('.cpi-ai-change').click();
  const rows = page.locator('#chat-plus-popup .chat-ai-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(19); // 4 DS + 4 Gemini + 5 OR + 6 Qwen + off
  await expect(page.locator('.chat-ai-row.cpi-active')).toHaveAttribute('data-ai-model', 'deepseek-flash');
  await expect(page.locator('.chat-ai-row[data-ai-prov="gemini"]').first().locator('.chat-ai-key')).toHaveText(/нужен ключ/);
  await expect(page.locator('.chat-ai-row[data-ai-prov="deepseek"]').first().locator('.chat-ai-key')).toHaveCount(0);
  await page.screenshot({ path: '/workspace/screens/plus-ai-picker.png' }).catch(() => {});
  await page.locator('.chat-ai-row[data-ai-model="anthropic/claude-sonnet-5.5"]').click();
  expect(await page.evaluate(() => [localStorage.getItem('eiti_ai_provider'), localStorage.getItem('eiti_or_model')])).toEqual(['openrouter', 'anthropic/claude-sonnet-5.5']);
  await expect(item.locator('.cpi-ai-cur')).toHaveText('OpenRouter · anthropic/claude-sonnet-5.5');
  await expect(item.locator('.cpi-icon')).toHaveText('🔀');
  // same setting as Settings: the provider card is checked
  await expect(page.locator('#eiti-pcheck-or')).toHaveText('✅');
  // no key → link opens Settings at the key field
  await item.locator('.cpi-ai-change').click();
  await page.locator('.chat-ai-row[data-ai-prov="qwen"]').first().locator('.chat-ai-key').click();
  await expect(page.locator('#qwen-key-main')).toBeFocused({ timeout: 3000 });
  expect(await page.evaluate(() => localStorage.getItem('eiti_ai_provider'))).toBe('openrouter');
});

test('picker is translated (EN/DE)', async ({ page }) => {
  await boot(page, 'de', { eiti_ai_provider: 'none' });
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('.cpi-ai-change') });
  await expect(item.locator('.cpi-ai-cur')).toHaveText('KI deaktivieren');
  await expect(item.locator('.cpi-ai-change')).toHaveText('ändern');
  await item.locator('.cpi-ai-change').click();
  await expect(page.locator('.chat-ai-head')).toContainText('Chat-Modell');
  await expect(page.locator('.chat-ai-key').first()).toContainText('Schlüssel nötig');
});
