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
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
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
  // название файла не сжимается кнопками, шапка помещается в 412px
  const geo = await page.evaluate(() => {
    const t = document.getElementById('fv-title').getBoundingClientRect(), h = document.getElementById('fv-header').getBoundingClientRect();
    const c = document.getElementById('fv-controls').getBoundingClientRect();
    return { tw: t.width, hw: h.width, cRight: c.right, vw: window.innerWidth, scroll: document.getElementById('fv-header').scrollWidth - document.getElementById('fv-header').clientWidth };
  });
  expect(geo.tw).toBeGreaterThanOrEqual(200); // в строке 1 ещё «➕ Блок» (и «✨ Оформить» при ИИ)
  expect(geo.cRight).toBeLessThanOrEqual(geo.vw);
  expect(geo.scroll).toBeLessThanOrEqual(0);
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
    const vb = await page.evaluate(() => { const b = document.getElementById('fv-view-btn'); const cs = getComputedStyle(b); return { fg: cs.color, bg: cs.backgroundColor }; });
    expect(ratio(vb.fg, vb.bg)).toBeGreaterThanOrEqual(4.5);
    await shot(page, `files-${theme}-rendered.png`);
    await expect(page.locator('#fv-view-btn')).toHaveText('📄 Текст');
    await page.locator('#fv-view-btn').click(); // исходный текст
    await expect(page.locator('#fv-view-btn')).toHaveText('📖 Reader');
    await expect(page.locator('#fv-pre')).toHaveText(SAMPLE);
    await shot(page, `files-${theme}-source.png`);
    await page.locator('#fv-view-btn').click(); // обратно к оформлению
    await expect(page.locator('#fv-view-btn')).toHaveText('📄 Текст');
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

const BEAUTY = '## 🛒 Заголовок 👋\n\n> [!tip] 💡 Текст с ==выделением==, **жирным**, [[Другая заметка]] и #идея.\n\n| Колонка | Значение |\n|---|:-:|\n| A | 1 |\n\n- пункт\n  - вложенный\n- [x] сделано\n- [ ] не сделано\n\nСноска[^1].\n\n```mermaid\ngraph TD; A-->B\n```\n\n[^1]: Текст сноски\n\ntags демо eiti author Руслан Свернуть Внутри callout скрытый комментарий';

test('✨ Оформить в файле: загрузка, применение с ↶, обрезка не применяется', async ({ page }) => {
  await bootWithFile(page, { eiti_ai_provider: 'grok', eiti_grok_key: 'xai-test', eiti_notes_ai_model: 'same' });
  let n = 0; let release;
  const gate = new Promise((r) => { release = r; });
  await page.route('https://api.x.ai/v1/chat/completions', async (route) => {
    n += 1;
    if (n === 1) await gate;
    await route.fulfill({ json: { choices: [{ message: { content: n === 1 ? BEAUTY : '## обрез' }, finish_reason: n === 1 ? 'stop' : 'length' }] } });
  });
  const btn = page.locator('#fv-beautify-btn');
  await expect(btn).toBeVisible();
  const geo = await page.evaluate(() => { const b = document.getElementById('fv-beautify-btn').getBoundingClientRect(), t = document.getElementById('fv-title').getBoundingClientRect(); return { bt: b.top, tt: t.top, br: b.right, tw: t.width, vw: innerWidth }; });
  expect(Math.abs(geo.bt - geo.tt)).toBeLessThan(12); // в верхней строке
  expect(geo.br).toBeLessThanOrEqual(geo.vw);
  for (const sw of ['#fv-bg-black', '#fv-bg-paper', '#fv-bg-white']) {
    await page.locator(sw).click();
    const c = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('fv-beautify-btn')); return { fg: cs.color, bg: cs.backgroundColor }; });
    expect(ratio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
  }
  await btn.click();
  await expect(btn).toBeDisabled();
  await expect(btn).toHaveText(/Оформляю/);
  release();
  await expect(btn).toBeEnabled();
  expect(await page.evaluate(() => window.__saved.at(-1).content)).toContain('[!tip] 💡');
  await page.waitForTimeout(300);
  await shot(page, 'files-beautify.png');
  await page.locator('#fv-ai-ask').click();
  await page.locator('#fv-ai-undo').click();
  expect(await page.evaluate(() => window.__saved.at(-1).content)).toContain('# Заголовок 👋');
  await page.locator('#fv-ai-close').click();
  const count = await page.evaluate(() => window.__saved.length);
  await btn.click();
  await expect(btn).toBeEnabled();
  expect(await page.evaluate(() => window.__saved.length)).toBe(count);
});

test('✨ Оформить в заметке: вверху, применяется через ИИ-правку с ↶; без ключа скрыта', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
    localStorage.setItem('eiti_notes_ai_model', 'same');
    localStorage.setItem('eiti_ai_provider', 'grok');
    localStorage.setItem('eiti_grok_key', 'xai-test');
  });
  const ORIG = 'Купить молоко и хлеб. Позвонить маме в пятницу. Встреча в 10:00 с командой по проекту Альфа, обсудить бюджет и сроки запуска.';
  await page.route('https://api.x.ai/v1/chat/completions', async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ json: { choices: [{ message: { content: '## 🛒 Дела\n- Купить молоко и хлеб.\n- 📞 Позвонить маме в пятницу.\n\n> [!note] 📅 Встреча в 10:00 с командой по проекту Альфа, обсудить ==бюджет== и сроки запуска.' }, finish_reason: 'stop' }] } });
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNoteBeautify === 'function' && typeof window.notesOpenEditor === 'function');
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, #eiti-pin-modal, .toast').forEach((el) => el.remove()));
  await page.evaluate(() => { if (typeof openView === 'function') openView('notes'); notesOpenEditor(null); });
  await page.locator('#noteEditorTitle').fill('План');
  await page.locator('#noteEditorBody').fill(ORIG);
  const btn = page.locator('#noteBeautifyBtn');
  await expect(btn).toBeVisible();
  const g = await page.evaluate(() => ({ b: document.getElementById('noteBeautifyBtn').getBoundingClientRect().top, body: document.getElementById('noteEditorBody').getBoundingClientRect().top, t: document.getElementById('noteEditorTitle').getBoundingClientRect().width }));
  expect(g.b).toBeLessThan(g.body);
  expect(g.t).toBeGreaterThanOrEqual(150);
  const c = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('noteBeautifyBtn')); return { fg: cs.color, bg: cs.backgroundColor }; });
  expect(ratio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
  await btn.click();
  await expect(btn).toBeDisabled();
  await expect(btn).toBeEnabled();
  await expect(page.locator('#noteEditorBody')).toHaveValue(/\[!note\] 📅/);
  await page.evaluate(() => document.querySelectorAll('.toast').forEach((el) => el.remove()));
  await shot(page, 'notes-beautify.png');
  await expect(page.locator('#noteUndoBtn')).toBeEnabled();
  await page.locator('#noteUndoBtn').click();
  await expect(page.locator('#noteEditorBody')).toHaveValue(ORIG);
  await page.evaluate(() => { localStorage.removeItem('eiti_grok_key'); eitiNoteBeautifySync(); });
  await expect(btn).toBeHidden();
});

const BLOCKS_DOC = 'Вступление к плану 🗒️\n\n---\n## 🧩 Покупки\n\n- молоко\n- хлеб\n\n---\n## ⚠️ Важное\n\nПозвонить маме **в пятницу**.\n\n---\n## 📌 Новый контекст\n\nПроект ==Альфа==: бюджет и сроки.\n';

test('блоки: ⋯ → ➕ Новый блок в заметке вставляет разделитель у курсора; Reader — карточки', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.addInitScript(() => localStorage.setItem('eiti_onboarded', 'true'));
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNoteNewBlock === 'function' && typeof window.notesOpenEditor === 'function');
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding, .toast').forEach((el) => el.remove()); if (typeof openView === 'function') openView('notes'); notesOpenEditor(null); });
  await page.locator('#noteEditorBody').fill('Первая строка\nВторая строка');
  await page.locator('#noteEditorBody').evaluate((el) => el.setSelectionRange(3, 3));
  await page.locator('#noteMoreBtn').click();
  await expect(page.locator('#noteNewBlockBtn')).toBeVisible();
  await shot(page, 'blocks-menu.png');
  await page.locator('#noteNewBlockBtn').click();
  await expect(page.locator('#eiti-block-dialog')).toBeVisible();
  await page.locator('#eiti-block-title').fill('Дедлайн');
  await page.locator('[data-block-type="important"]').click();
  await shot(page, 'blocks-dialog.png');
  await page.locator('#eiti-block-ok').click();
  await expect(page.locator('#noteEditorBody')).toHaveValue('Первая строка\n\n---\n## ⚠️ Дедлайн\n\nВторая строка');
  await page.locator('#noteMoreBtn').click();
  await page.locator('#noteViewToggleBtn').click();
  await expect(page.locator('#noteEditorPreview .eiti-block.b-important .eiti-block-title')).toHaveText('⚠️ Дедлайн');
});

test('блоки в файле: Reader-карточки, ➕ Блок, ИИ-правка ломающая блоки не применяется', async ({ page }) => {
  await bootWithFile(page, { eiti_ai_provider: 'grok', eiti_grok_key: 'xai-test', eiti_notes_ai_model: 'same' });
  let sys = '';
  await page.route('https://api.x.ai/v1/chat/completions', async (route) => {
    sys = route.request().postDataJSON().messages[0].content;
    const broken = BLOCKS_DOC.replace('\n\n---\n## ⚠️ Важное\n', '');
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ reply: 'Готово', mutation: { action: 'replace_note', body: broken } }) }, finish_reason: 'stop' }] } });
  });
  await page.evaluate((doc) => {
    document.getElementById('fv-close-btn').click();
    window._idbFilesCache.push({ id: 'e2e-blocks', name: 'План.md', mime: 'text/markdown', content: doc, updated: Date.now() + 1000 });
    window.openEitiFiles();
  }, BLOCKS_DOC);
  await page.locator('.ef-file-card').filter({ hasText: 'План' }).locator('[data-v]').evaluate((el) => el.click());
  const rich = page.locator('#fv-rich');
  await expect(rich.locator('.eiti-block')).toHaveCount(3);
  await expect(rich.locator('.eiti-block.b-topic .eiti-block-title')).toHaveText('🧩 Покупки');
  await expect(rich.locator('.eiti-block.b-context mark')).toHaveText('Альфа');
  const geo = await page.evaluate(() => ({ r: document.getElementById('fv-block-btn').getBoundingClientRect().right, vw: innerWidth, t: document.getElementById('fv-title').getBoundingClientRect().width }));
  expect(geo.r).toBeLessThanOrEqual(geo.vw);
  for (const sw of ['#fv-bg-black', '#fv-bg-paper', '#fv-bg-white']) {
    await page.locator(sw).click();
    const c = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('fv-block-btn')); return { fg: cs.color, bg: cs.backgroundColor }; });
    expect(ratio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
  }
  await page.waitForTimeout(200);
  await shot(page, 'blocks-reader.png');
  await page.locator('#fv-ai-ask').click();
  await page.locator('#fv-ai-input').fill('Перепиши файл короче');
  await page.locator('#fv-ai-send').click();
  await expect(page.locator('.fv-ai-msg.assistant').last()).toContainText('разделители блоков');
  expect(sys).toContain('Оглавление блоков');
  expect(sys).toContain('2. ⚠️ Важное');
  expect(await page.evaluate(() => window.__saved.length)).toBe(0);
  await page.locator('#fv-ai-close').click();
  await page.locator('#fv-block-btn').click();
  await page.locator('#eiti-block-title').fill('Итоги');
  await page.locator('#eiti-block-ok').click();
  expect(await page.evaluate(() => window.__saved.at(-1).content)).toMatch(/\n\n---\n## 🧩 Итоги\n\n$/);
});
