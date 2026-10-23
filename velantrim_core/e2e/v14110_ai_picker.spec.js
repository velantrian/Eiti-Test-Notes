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

test('«+» shows one compact AI row; «change» opens a separate sheet with a provider accordion', async ({ page }) => {
  await boot(page, 'ru', { eiti_ai_provider: 'deepseek', eiti_ds_model: 'deepseek-flash', deepseek_api_key: 'x', eiti_or_key: 'x' });
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('.cpi-ai-change') });
  await expect(item.locator('.cpi-ai-cur')).toHaveText('DeepSeek · V4.1 Flash');
  await expect(item.locator('.cpi-state')).toHaveText(/вкл|выкл/);
  await expect(page.locator('#chat-plus-popup .chat-ai-row, #chat-plus-popup [data-ai-model]')).toHaveCount(0); // no model list in «+»
  await page.screenshot({ path: '/workspace/screens/plus-menu-compact.png' }).catch(() => {});
  await item.locator('.cpi-ai-change').click();
  await expect(page.locator('#chat-plus-popup')).toBeHidden();
  const sheet = page.locator('#eiti-ai-sheet');
  await expect(sheet.locator('.eas-panel')).toBeVisible();
  const h = await sheet.locator('.eas-panel').evaluate((e) => e.getBoundingClientRect().height);
  expect(h).toBeLessThanOrEqual(844 * 0.6 + 1);
  await expect(sheet.locator('.eas-group')).toHaveCount(4);
  await expect(sheet.locator('.eas-none')).toBeVisible();
  // accordion: current provider expanded, others collapsed
  await expect(sheet.locator('.eas-group.eas-open')).toHaveCount(1);
  await expect(sheet.locator('.eas-group.eas-open')).toHaveAttribute('data-ai-prov', 'deepseek');
  await expect(sheet.locator('.eas-model:visible')).toHaveCount(4);
  await expect(sheet.locator('.eas-group[data-ai-prov="gemini"] .eas-sub')).toHaveText(/нужен ключ/);
  await expect(sheet.locator('.eas-group[data-ai-prov="deepseek"] .eas-sub')).toHaveText('V4.1 Flash');
  await page.screenshot({ path: '/workspace/screens/ai-picker-sheet.png' }).catch(() => {});
  await sheet.locator('.eas-group[data-ai-prov="openrouter"] .eas-prov').click();
  await expect(sheet.locator('.eas-group.eas-open')).toHaveCount(1);
  await expect(sheet.locator('.eas-group.eas-open')).toHaveAttribute('data-ai-prov', 'openrouter');
  await sheet.locator('[data-ai-model="anthropic/claude-sonnet-5.5"]').click();
  await expect(sheet).toHaveCount(0); // closes on select
  expect(await page.evaluate(() => [localStorage.getItem('eiti_ai_provider'), localStorage.getItem('eiti_or_model')])).toEqual(['openrouter', 'anthropic/claude-sonnet-5.5']);
  await expect(page.locator('#eiti-pcheck-or')).toHaveText('✅');
  await page.locator('#chat-plus-btn').click();
  await expect(item.locator('.cpi-ai-cur')).toHaveText('OpenRouter · anthropic/claude-sonnet-5.5');
  await expect(item.locator('.cpi-icon')).toHaveText('🔀');
  // backdrop closes; close button closes
  await item.locator('.cpi-ai-change').click();
  await page.mouse.click(195, 60);
  await expect(sheet).toHaveCount(0);
  await page.locator('#chat-plus-btn').click();
  await item.locator('.cpi-ai-change').click();
  await sheet.locator('.eas-close').click();
  await expect(sheet).toHaveCount(0);
  // no key → settings key field
  await page.locator('#chat-plus-btn').click();
  await item.locator('.cpi-ai-change').click();
  await sheet.locator('.eas-group[data-ai-prov="qwen"] .eas-prov').click();
  await sheet.locator('.eas-group[data-ai-prov="qwen"] .chat-ai-key').click();
  await expect(page.locator('#qwen-key-main')).toBeFocused({ timeout: 3000 });
  expect(await page.evaluate(() => localStorage.getItem('eiti_ai_provider'))).toBe('openrouter');
});

test('sheet is translated (EN/DE)', async ({ page }) => {
  await boot(page, 'de', { eiti_ai_provider: 'none' });
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('.cpi-ai-change') });
  await expect(item.locator('.cpi-ai-cur')).toHaveText('KI deaktivieren');
  await expect(item.locator('.cpi-ai-change')).toHaveText('ändern');
  await item.locator('.cpi-ai-change').click();
  await expect(page.locator('#eiti-ai-sheet .eas-head')).toContainText('Chat-Modell');
  await expect(page.locator('#eiti-ai-sheet .eas-sub').first()).toContainText('Schlüssel nötig');
  await expect(page.locator('#eiti-ai-sheet .eas-close')).toHaveAttribute('aria-label', 'Schließen');
});
