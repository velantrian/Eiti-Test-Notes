// @ts-nocheck
// v13.8.0: окно файла — темы с контрастом, 👁 оформление, Mermaid offline-fallback, AI Docs ↶↷; 👁/✎ в заметках.
const { test, expect } = require('@playwright/test');
const path = require('path');

const SHOTS = process.env.EITI_SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

const SAMPLE = [
  '---', 'tags: [демо, eiti]', 'author: Руслан', '---',
  '# Заголовок 👋', '', 'Текст с ==выделением==, **жирным**, [[Другая заметка]] и #идея.', '%%скрытый комментарий%%', '',
  '| Колонка | Значение |', '|---|:-:|', '| A | 1 |', '',
  '- пункт', '  - вложенный', '- [x] сделано', '- [ ] не сделано', '',
  '> [!note]- Свернуть', '> Внутри callout', '',
  'Сноска[^1].', '', '```mermaid', 'graph TD; A-->B', '```', '', '[^1]: Текст сноски',
].join('\n');

async function bootWithFile(page, storage = {}) {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.route(/cdn\.jsdelivr\.net\/npm\/mermaid/, (route) => route.abort());
  await page.addInitScript((values) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, storage);
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiFvEnhance === 'function' && typeof window.openEitiFiles === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.evaluate((content) => {
    document.querySelectorAll('#eiti-onboarding, #eiti-pin-modal, .toast').forEach((el) => el.remove());
    window.__saved = [];
    window.upsertAiFile = (name, mime, c) => {
      window.__saved.push({ name, mime, content: c });
      const i = window._idbFilesCache.findIndex((f) => f.name === name);
      if (i >= 0) window._idbFilesCache[i].content = c;
    };
    window.getAiTextStore = () => ({ files: window._idbFilesCache });
    window.updateCount = () => {}; window.eitiUpdateFileCount = () => {}; window.eitiQueueIndexDoc = () => {}; window.showToast = () => {};
    window.isUserFile = (f) => !!(f && f.name);
    window._idbFilesCache.push({ id: 'e2e-demo', name: 'Euue.md', mime: 'text/markdown', content, updated: Date.now() });
    window.openEitiFiles();
  }, SAMPLE);
  const card = page.locator('.ef-file-card').filter({ hasText: 'Euue' });
  await card.locator('[data-v]').evaluate((el) => el.click());
  await expect(page.locator('#fv-header')).toBeVisible();
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((n) => { const c = Number(n) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('окно файла: светлая тема по умолчанию, контраст ≥ 4.5 во всех темах, выбор запоминается', async ({ page }) => {
  await bootWithFile(page);
  const viewer = page.locator('#fv-header').locator('xpath=..');
  await expect(viewer).toHaveAttribute('data-fv-theme', 'light');
  for (const [btn, theme] of [['#fv-bg-white', 'light'], ['#fv-bg-black', 'dark'], ['#fv-bg-paper', 'paper']]) {
    await page.locator(btn).click();
    await expect(viewer).toHaveAttribute('data-fv-theme', theme);
    const c = await page.evaluate(() => {
      const v = document.getElementById('fv-header').parentElement;
      const cs = (sel, p) => getComputedStyle(document.querySelector(sel))[p];
      return { bg: getComputedStyle(v).backgroundColor, title: cs('#fv-title', 'color'), copyFg: cs('#fv-copy-btn', 'color'), copyBg: cs('#fv-copy-btn', 'backgroundColor'), closeFg: cs('#fv-close-btn', 'color'), closeBg: cs('#fv-close-btn', 'backgroundColor'), renFg: cs('#fv-rename-btn', 'color'), renBg: cs('#fv-rename-btn', 'backgroundColor') };
    });
    expect(ratio(c.title, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(c.copyFg, c.copyBg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(c.closeFg, c.closeBg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(c.renFg, c.renBg)).toBeGreaterThanOrEqual(4.5);
    await page.locator('#fv-view-btn').click(); // исходный текст
    await shot(page, `files-${theme}-source.png`);
    await page.locator('#fv-view-btn').click(); // обратно к оформлению
    await shot(page, `files-${theme}-rendered.png`);
  }
  expect(await page.evaluate(() => localStorage.getItem('eiti_fv_theme'))).toBe('paper');
  await page.locator('#fv-bg-white').click();
});

test('👁 оформление: Markdown + Obsidian, Mermaid без сети показывает код', async ({ page }) => {
  await bootWithFile(page);
  const rich = page.locator('#fv-rich');
  await expect(rich).toBeVisible();
  await expect(rich.locator('h1')).toHaveText('Заголовок 👋');
  await expect(rich.locator('table th').first()).toHaveText('Колонка');
  await expect(rich.locator('mark')).toHaveText('выделением');
  await expect(rich.locator('.wikilink')).toHaveText('Другая заметка');
  await expect(rich.locator('.tag')).toHaveText('#идея');
  await expect(rich.locator('details.callout summary')).toHaveText('Свернуть');
  await expect(rich.locator('.props')).toContainText('Руслан');
  await expect(rich.locator('input[type=checkbox]')).toHaveCount(2);
  await expect(rich).not.toContainText('скрытый комментарий');
  await expect(rich.locator('.eiti-mermaid pre')).toContainText('graph TD');
  await expect(rich.locator('.mermaid-note')).toContainText('показан код');
  await page.locator('#fv-view-btn').click();
  await expect(page.locator('#fv-pre')).toContainText('%%скрытый комментарий%%');
});

test('AI Docs в файле: история, правка с подсветкой, ↶↷, «как в чате» = Grok', async ({ page }) => {
  await bootWithFile(page, { eiti_ai_provider: 'grok', eiti_grok_key: 'xai-test', eiti_notes_ai_model: 'same' });
  const calls = [];
  await page.route('https://api.x.ai/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body);
    const content = calls.length === 1
      ? 'В файле заголовок и таблица.'
      : JSON.stringify({ reply: 'Заменил заголовок', mutation: { action: 'replace_text', find: '# Заголовок 👋', text: '# Новый заголовок ✨' } });
    await route.fulfill({ json: { choices: [{ message: { content }, finish_reason: 'stop' }] } });
  });
  await expect(page.locator('#fv-ai-bar')).toBeVisible();
  await page.locator('#fv-ai-ask').click();
  await page.locator('#fv-ai-input').fill('Перескажи файл');
  await page.locator('#fv-ai-send').click();
  await expect(page.locator('.fv-ai-msg.assistant').last()).toContainText('заголовок и таблица');
  await page.locator('#fv-ai-input').fill('Замени заголовок на «Новый заголовок»');
  await page.locator('#fv-ai-send').click();
  await expect(page.locator('.fv-ai-msg.assistant').last()).toContainText('Заменил заголовок');
  expect(calls[0].model).toBe('grok-4.7');
  expect(calls[1].messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
  expect(calls[1].messages[0].content).toContain('graph TD'); // весь файл целиком
  const saved = await page.evaluate(() => window.__saved.at(-1).content);
  expect(saved).toContain('# Новый заголовок ✨');
  await shot(page, 'files-ai-docs-panel.png');
  await expect(page.locator('#fv-ai-undo')).toBeEnabled();
  await page.locator('#fv-ai-undo').click();
  expect(await page.evaluate(() => window.__saved.at(-1).content)).toContain('# Заголовок 👋');
  await page.locator('#fv-ai-redo').click();
  expect(await page.evaluate(() => window.__saved.at(-1).content)).toContain('# Новый заголовок ✨');
});

test('AI Docs: обрезанный ответ не применяет правку молча', async ({ page }) => {
  await bootWithFile(page, { eiti_ai_provider: 'openai', eiti_openai_key: 'sk-test', eiti_notes_ai_model: 'same' });
  let model = '';
  await page.route('https://api.openai.com/v1/chat/completions', async (route) => {
    model = route.request().postDataJSON().model;
    await route.fulfill({ json: { choices: [{ message: { content: '{"reply":"ok","mutation":{"action":"replace_note","body":"# обрез' }, finish_reason: 'length' }] } });
  });
  await page.locator('#fv-ai-ask').click();
  await page.locator('#fv-ai-input').fill('Перепиши весь файл');
  await page.locator('#fv-ai-send').click();
  await expect(page.locator('.fv-ai-msg.assistant').last()).toContainText('НЕ применена');
  expect(model).toMatch(/^gpt-/);
  expect(await page.evaluate(() => window.__saved.length)).toBe(0);
});

test('AI Docs выключается в настройках', async ({ page }) => {
  await bootWithFile(page, { eiti_files_aidocs_enabled: '0' });
  await expect(page.locator('#fv-ai-bar')).toHaveCount(0);
  await expect(page.locator('#fv-view-btn')).toBeVisible();
});

test('заметки: 👁 показывает оформление, ✎ возвращает редактор', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.route(/cdn\.jsdelivr\.net\/npm\/mermaid/, (route) => route.abort());
  await page.addInitScript(() => localStorage.setItem('eiti_onboarded', 'true'));
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNoteViewToggle === 'function' && typeof window.notesOpenEditor === 'function');
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, .toast').forEach((el) => el.remove()));
  await page.evaluate(() => { if (typeof openView === 'function') openView('notes'); notesOpenEditor(null); });
  await expect(page.locator('#noteEditorOverlay')).toHaveClass(/active/);
  await page.locator('#noteEditorBody').fill('# Заметка 📝\n\n- [x] задача\n\n> [!tip] Совет\n> текст\n\n==важно== #тег');
  await page.locator('#noteMoreBtn').click();
  await page.locator('#noteViewToggleBtn').click();
  const prev = page.locator('#noteEditorPreview');
  await expect(prev.locator('h1')).toHaveText('Заметка 📝');
  await expect(prev.locator('.callout.c-tip')).toBeVisible();
  await expect(page.locator('#noteEditorBody')).toBeHidden();
  await expect(page.locator('#noteViewExitBtn')).toBeVisible();
  await shot(page, 'notes-rendered.png');
  await page.locator('#noteViewExitBtn').click();
  await expect(page.locator('#noteViewExitBtn')).toBeHidden();
  await expect(page.locator('#noteEditorBody')).toBeVisible();
  await expect(page.locator('#noteEditorBody')).toHaveValue(/==важно==/);
});
