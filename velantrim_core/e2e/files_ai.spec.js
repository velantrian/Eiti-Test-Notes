// @ts-nocheck
const { test, expect } = require('@playwright/test');

async function bootApp(page, extraStorage = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((values) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, extraStorage);
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiFilesAISetEnabled === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, .toast').forEach((element) => element.remove()));
}

async function openSettings(page) {
  await page.locator('.tab-item[data-view="settings"]').evaluate((element) => element.click());
  await expect(page.locator('#view-settings')).toBeVisible();
}

async function installFileStoreStub(page, seedSource = false) {
  await page.evaluate((withSource) => {
    window.__filesSaved = [];
    window.__filesRequest = null;
    window.upsertAiFile = (name, mime, content) => {
      window.__filesSaved.push({ name, mime, content });
      const existing = window._idbFilesCache.findIndex((file) => file.name === name);
      const entry = { id: 'e2e-' + name, name, mime, content, updated: Date.now() };
      if (existing >= 0) window._idbFilesCache[existing] = entry;
      else window._idbFilesCache.push(entry);
    };
    window.getAiTextStore = () => ({ files: window._idbFilesCache });
    window.updateCount = () => {};
    window.eitiUpdateFileCount = () => {};
    window.eitiQueueIndexDoc = () => {};
    window.showToast = () => {};
    window.isUserFile = (file) => !!(file && file.name);
    if (withSource) {
      window._idbFilesCache.push({
        id: 'e2e-source', name: 'journal.md', mime: 'text/markdown',
        content: '# Original journal\nKeep this source unchanged.', updated: Date.now(),
      });
    }
  }, seedSource);
}

test('Files AI is opt-in and selected Markdown format is used for manual file creation', async ({ page }) => {
  await bootApp(page);
  await openSettings(page);

  const settings = page.locator('#eiti-files-ai-settings');
  const toggle = page.locator('#files-ai-toggle');
  await expect(settings).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  await installFileStoreStub(page);
  await page.evaluate(() => window.openEitiFiles());
  const format = page.locator('#eiti-files-ai-format');
  await expect(format).toHaveValue('json');
  await expect(page.locator('#eiti-files-ai-open')).toBeVisible();
  await format.selectOption('markdown');
  await expect(format).toHaveValue('markdown');
  expect(await page.evaluate(() => localStorage.getItem('eiti_files_output_format'))).toBe('markdown');

  await page.locator('#eiti-new-file-btn').click();
  await page.locator('#new-file-name').fill('daily-notes');
  await page.locator('#new-file-content').fill('# Daily notes\n\nSaved in Markdown.');
  await page.locator('#new-file-save').click();
  await expect(page.locator('.ef-file-card').filter({ hasText: 'daily-notes.md' })).toBeVisible();
  const saved = await page.evaluate(() => window.__filesSaved.at(-1));
  expect(saved.name).toBe('daily-notes.md');
  expect(saved.mime).toBe('text/markdown');
  expect(saved.content).toContain('# Daily notes');
});

test('Files AI generates an editable JSON draft from a source file and saves a new file', async ({ page }) => {
  await bootApp(page, {
    eiti_files_ai_enabled: '1', eiti_files_output_format: 'json',
    eiti_ai_provider: 'deepseek', eiti_notes_ai_model: 'same',
  });
  await installFileStoreStub(page, true);
  await page.evaluate(() => {
    window._eitiUniversalAICall = (user, sys, maxTokens, needJson, opts) => {
      window.__filesRequest = { user, sys, maxTokens, needJson, opts };
      return Promise.resolve('{"headline":"Generated"}');
    };
    window.openEitiFiles();
  });

  await expect(page.locator('#eiti-files-ai-open')).toBeVisible();
  await page.locator('#eiti-files-ai-open').click();
  await expect(page.locator('#eiti-files-ai-panel')).toBeVisible();
  await page.locator('#eiti-files-ai-source').selectOption('journal.md');
  await expect(page.locator('#eiti-files-ai-name')).toHaveValue('journal-ai');
  await page.locator('#eiti-files-ai-prompt').fill('Create a concise headline');
  await page.locator('#eiti-files-ai-generate').click();
  await expect(page.locator('#eiti-files-ai-output')).toHaveValue(`{
  "headline": "Generated"
}`);
  await expect(page.locator('#eiti-files-ai-save')).toBeEnabled();

  const request = await page.evaluate(() => window.__filesRequest);
  expect(request.user).toBe('Create a concise headline');
  expect(request.needJson).toBe(false);
  expect(request.sys).toContain('# Original journal');
  expect(request.opts.provider).toBeTruthy();
  expect(request.opts.model).toBeTruthy();

  await page.locator('#eiti-files-ai-save').click();
  await expect(page.locator('.ef-file-card').filter({ hasText: 'journal-ai.json' })).toBeVisible();
  const state = await page.evaluate(() => ({
    original: window._idbFilesCache.find((file) => file.name === 'journal.md'),
    saved: window.__filesSaved.at(-1),
  }));
  expect(state.original.content).toBe('# Original journal\nKeep this source unchanged.');
  expect(state.saved.name).toBe('journal-ai.json');
  expect(state.saved.mime).toBe('application/json');
  expect(JSON.parse(state.saved.content).headline).toBe('Generated');
});
