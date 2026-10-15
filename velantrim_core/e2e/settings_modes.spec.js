// @ts-check
const { test, expect } = require('@playwright/test');

test('settings open in the everyday mode and reveal preserved developer settings on demand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    if (sessionStorage.getItem('eiti_settings_modes_test_started') !== '1') {
      localStorage.removeItem('eiti_settings_audience_mode_v1');
      sessionStorage.setItem('eiti_settings_modes_test_started', '1');
    }
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiSetSettingsMode === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, .toast').forEach((element) => element.remove()));

  const settingsNav = page.locator('.tab-item[data-view="settings"]');
  await expect(settingsNav).toBeVisible();
  const navItemCount = await page.locator('.tab-item').count();
  await settingsNav.evaluate((element) => element.click());

  const view = page.locator('#view-settings');
  const everydayButton = page.locator('#settings-mode-ordinary');
  const developerButton = page.locator('#settings-mode-developer');
  await expect(view).toBeVisible();
  await expect(everydayButton).toHaveAttribute('aria-pressed', 'true');
  await expect(developerButton).toHaveAttribute('aria-pressed', 'false');
  await expect(view).toHaveAttribute('data-settings-mode', 'ordinary');
  await expect(page.locator('#settings-mode-note')).toBeVisible();
  await expect(page.locator('#lang-settings-group')).toBeVisible();
  await expect(page.locator('#eiti-notes-ai-settings')).toBeVisible();
  await expect(page.locator('#eiti-files-ai-settings')).toBeVisible();
  await expect(page.locator('#files-ai-toggle')).toHaveAttribute('aria-checked', 'false');
  await expect(view.locator('.settings-title[data-i18n="💬 Правила для AI"]')).toBeVisible();

  const advancedGroups = view.locator('.settings-group[data-settings-audience="advanced"]');
  expect(await advancedGroups.count()).toBe(18);
  await expect(view.locator('.settings-title[data-i18n="🧬 PKG — Хеббианский Граф Знаний"]')).toBeHidden();
  await expect(view.locator('.settings-title[data-i18n="📄 RAG — Умное чтение файлов"]')).toBeHidden();
  await expect(view.locator('[data-i18n="Включите, чтобы AI мог автоматически искать нужную информацию в истории чатов. Выключено по умолчанию."]')).toBeVisible();
  await expect(view.locator('[data-i18n="Автопоиск по истории сообщений (L1) выключен по умолчанию. Явный запрос к истории продолжает поиск. L2-дайджесты, профиль и другие источники памяти не меняются."]')).toBeHidden();

  // Keep everyday-use controls visible, while hiding tuning and diagnostics.
  await expect(page.locator('#eiti-only-ai-btn')).toBeHidden();
  await expect(page.locator('#token-budget')).toBeHidden();
  await expect(page.locator('#fullctx-toggle-slider')).toBeHidden();
  await expect(page.locator('#chunk-size')).toBeHidden();
  await expect(page.locator('#eiti-suggestions-settings')).toBeHidden();
  await expect(page.locator('button[onclick="eitiAICheck()"]')).toBeHidden();
  await expect(page.locator('button[onclick="eitiObserverRun()"]')).toBeHidden();
  await expect(page.locator('button[onclick="eitiExportAll()"]')).toBeVisible();

  await developerButton.click();
  await expect(view).toHaveAttribute('data-settings-mode', 'developer');
  await expect(developerButton).toHaveAttribute('aria-pressed', 'true');
  await expect(everydayButton).toHaveAttribute('aria-pressed', 'false');
  await expect(view.locator('.settings-title[data-i18n="🧬 PKG — Хеббианский Граф Знаний"]')).toBeVisible();
  await expect(view.locator('[data-i18n="Включите, чтобы AI мог автоматически искать нужную информацию в истории чатов. Выключено по умолчанию."]')).toBeHidden();
  await expect(view.locator('[data-i18n="Автопоиск по истории сообщений (L1) выключен по умолчанию. Явный запрос к истории продолжает поиск. L2-дайджесты, профиль и другие источники памяти не меняются."]')).toBeVisible();
  await expect(page.locator('#eiti-only-ai-btn')).toBeVisible();
  await expect(page.locator('#token-budget')).toBeVisible();
  await expect(page.locator('button[onclick="eitiAICheck()"]')).toBeVisible();
  await expect(page.locator('button[onclick="eitiObserverRun()"]')).toBeVisible();

  const tokenBudget = page.locator('#token-budget');
  await tokenBudget.evaluate((element) => {
    element.value = '12000';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => localStorage.getItem('eiti_token_budget'))).toBe('12000');

  await everydayButton.click();
  await expect(tokenBudget).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('eiti_token_budget'))).toBe('12000');
  await developerButton.click();
  await expect(tokenBudget).toHaveValue('12000');
  expect(await page.evaluate(() => localStorage.getItem('eiti_settings_audience_mode_v1'))).toBe('developer');
  expect(await page.locator('.tab-item').count()).toBe(navItemCount);

  await page.reload();
  await page.waitForFunction(() => typeof window.eitiSetSettingsMode === 'function');
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, .toast').forEach((element) => element.remove()));
  await page.locator('.tab-item[data-view="settings"]').evaluate((element) => element.click());
  await expect(page.locator('#view-settings')).toHaveAttribute('data-settings-mode', 'developer');
  await expect(page.locator('#token-budget')).toHaveValue('12000');
});
