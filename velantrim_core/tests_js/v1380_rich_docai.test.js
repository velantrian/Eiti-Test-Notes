'use strict';
// v13.8.0: оформление Markdown/Obsidian, темы окна файла, общий AI-слой (история, обрезка, «как в чате»).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions } = require('./harness');

const RICH = ['eitiRichEsc', 'eitiRichSafeUrl', 'eitiRichInline', 'eitiRichParseFrontmatter', 'eitiRichBlocks', 'eitiRichList', 'eitiRichRender', 'eitiRichNeedsMermaid'];
const r = () => loadFunctions(RICH);

test('Markdown: заголовки, таблица, вложенный список, задачи, ссылки, сноски', () => {
  const { html } = r().eitiRichRender([
    '# Заголовок', '', '| A | B |', '|---|:-:|', '| 1 | 2 |', '',
    '- один', '  - вложенный', '- [x] готово', '- [ ] не готово', '',
    'Ссылка [сайт](https://example.com) и сноска[^1].', '', '[^1]: Текст сноски',
  ].join('\n'));
  assert.match(html, /<h1>Заголовок<\/h1>/);
  assert.match(html, /<table><thead><tr><th>A<\/th><th style="text-align:center">B<\/th>/);
  assert.match(html, /<ul><li>один<ul><li>вложенный<\/li><\/ul><\/li>/);
  assert.match(html, /<input type="checkbox" disabled checked>готово/);
  assert.match(html, /<input type="checkbox" disabled>не готово/);
  assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">сайт<\/a>/);
  assert.match(html, /<sup class="fnref"><a href="#fn-1">\[1\]<\/a><\/sup>/);
  assert.match(html, /<section class="footnotes"><ol><li id="fn-1">Текст сноски<\/li>/);
});

test('Obsidian: [[ссылки]], callout, ==выделение==, #теги, %%комментарии%%, свойства', () => {
  const { html, props } = r().eitiRichRender([
    '---', 'tags: [a, b]', 'author: Руслан', '---',
    'См. [[Проект|проект]] и ==важно== #идея', '%%скрыто%%',
    '> [!warning]- Осторожно', '> внутри',
  ].join('\n'));
  assert.equal(props.length, 2);
  assert.match(html, /class="props"/);
  assert.match(html, /<span class="wikilink" data-wikilink="Проект" title="Проект">проект<\/span>/);
  assert.match(html, /<mark>важно<\/mark>/);
  assert.match(html, /<span class="tag" data-tag="идея">#идея<\/span>/);
  assert.doesNotMatch(html, /скрыто/);
  assert.match(html, /<details class="callout c-warning"><summary>Осторожно<\/summary><p>внутри<\/p><\/details>/);
});

test('Mermaid помечается для ленивой загрузки, код остаётся как запасной вариант', () => {
  const s = r();
  const src = 'Текст\n\n```mermaid\ngraph TD; A-->B\n```\n';
  assert.equal(s.eitiRichNeedsMermaid(src), true);
  assert.equal(s.eitiRichNeedsMermaid('```js\nx\n```'), false);
  const out = s.eitiRichRender(src);
  assert.equal(out.hasMermaid, true);
  assert.match(out.html, /<div class="eiti-mermaid" data-mermaid="1"><pre><code>graph TD; A--&gt;B\n?<\/code><\/pre><\/div>/);
  assert.equal(s.eitiRichRender('просто текст').hasMermaid, false);
});

test('XSS: сырой HTML и javascript:-ссылки не исполняются', () => {
  const { html } = r().eitiRichRender('<img src=x onerror=alert(1)> <script>alert(1)</script>\n\n[x](javascript:alert(1)) ![i](javascript:alert(2)) [[a"><b onclick=1>]]');
  assert.doesNotMatch(html, /<img|<script|javascript:|<b /);
  assert.match(html, /&lt;script&gt;/);
});

test('эмодзи и символы сохраняются как есть, код не форматируется', () => {
  const { html } = r().eitiRichRender('Привет 👋 ✓ → ∑ © — 🎉\n\n`**не жирный**`');
  assert.match(html, /Привет 👋 ✓ → ∑ © — 🎉/);
  assert.match(html, /<code>\*\*не жирный\*\*<\/code>/);
});

test('темы окна файла: контраст названия и кнопок ≥ 4.5:1, по умолчанию светлая', () => {
  const store = {};
  const s = loadFunctions(['eitiHexLuminance', 'eitiContrastRatio', 'eitiFvThemeGet', 'eitiFvThemeSet'], {
    EITI_FV_THEME_KEY: 'eiti_fv_theme',
    EITI_FV_THEMES: {
      light: { bg: '#f8f8f8', fg: '#111111', title: '#1d4ed8', btnBg: '#ffffff', btnFg: '#111111', closeBg: '#111111', closeFg: '#ffffff' },
      dark: { bg: '#000000', fg: '#ffffff', title: '#ffd700', btnBg: '#1c1c1e', btnFg: '#ffffff', closeBg: '#ffd700', closeFg: '#000000' },
      paper: { bg: '#f5f0e7', fg: '#3a2810', title: '#7a3e00', btnBg: '#fffaf0', btnFg: '#3a2810', closeBg: '#5a3a12', closeFg: '#fffaf0' },
    },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  });
  assert.equal(s.eitiFvThemeGet(), 'light');
  for (const k of ['light', 'dark', 'paper']) {
    const t = s.EITI_FV_THEMES[k];
    assert.ok(s.eitiContrastRatio(t.title, t.bg) >= 4.5, k + ' title');
    assert.ok(s.eitiContrastRatio(t.fg, t.bg) >= 4.5, k + ' text');
    assert.ok(s.eitiContrastRatio(t.btnFg, t.btnBg) >= 4.5, k + ' buttons');
    assert.ok(s.eitiContrastRatio(t.closeFg, t.closeBg) >= 4.5, k + ' close');
  }
  // старый жёлтый заголовок на светлом фоне не проходил порог
  assert.ok(s.eitiContrastRatio('#ffd700', '#f8f8f8') < 2);
  s.eitiFvThemeSet('paper');
  assert.equal(s.eitiFvThemeGet(), 'paper');
  s.eitiFvThemeSet('neon');
  assert.equal(s.eitiFvThemeGet(), 'light');
});

const DOC = ['eitiDocAILongWarning', 'eitiDocAIOutputBudget', 'eitiDocAILongRule', 'eitiDocAIBuildMessages', 'eitiDocAITruncationNote', 'eitiDocAIApplyText', 'eitiDocAIChangedRange', 'eitiDocAIParseCompletion'];
const d = () => loadFunctions(DOC, { EITI_DOCAI_LONG_CHARS: 30000, EITI_DOCAI_HISTORY_TURNS: 10 });

test('история окна уходит в запрос, лимит — последние 10 пар', () => {
  const s = d();
  const hist = [];
  for (let i = 0; i < 30; i++) hist.push({ role: i % 2 ? 'assistant' : 'user', text: 'm' + i });
  const msgs = s.eitiDocAIBuildMessages('SYS', hist, 'новый вопрос');
  assert.equal(msgs[0].role, 'system');
  assert.equal(msgs.length, 1 + 20 + 1);
  assert.equal(msgs[1].content, 'm10');
  assert.deepEqual(JSON.parse(JSON.stringify(msgs[msgs.length - 1])), { role: 'user', content: 'новый вопрос' });
});

test('длинный текст: больший лимит ответа и предупреждение', () => {
  const s = d();
  assert.equal(s.eitiDocAILongWarning(1000), '');
  assert.match(s.eitiDocAILongWarning(45000), /Длинный текст/);
  assert.ok(s.eitiDocAIOutputBudget(40000, 'openrouter') > 12000);
  assert.ok(s.eitiDocAIOutputBudget(40000, 'deepseek') <= 16000);
  assert.equal(s.eitiDocAIOutputBudget(100, 'openai'), 4000);
  assert.match(s.eitiDocAILongRule(40000), /replace_text/);
});

test('обрезанный JSON-ответ блокирует правку; finish_reason распознаётся', () => {
  const s = d();
  const t = s.eitiDocAITruncationNote('{"reply":"ok","mutation":{"action":"replace_note","body":"нача', true);
  assert.equal(t.blockMutation, true);
  assert.match(t.note, /НЕ применена/);
  assert.equal(s.eitiDocAITruncationNote('обычный текст', true).blockMutation, false);
  assert.equal(s.eitiDocAITruncationNote('{"a":1}', false).blockMutation, false);
  assert.equal(s.eitiDocAIParseCompletion('openai', { choices: [{ message: { content: 'x' }, finish_reason: 'length' }] }).truncated, true);
  assert.equal(s.eitiDocAIParseCompletion('grok', { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }).truncated, false);
  assert.equal(s.eitiDocAIParseCompletion('gemini', { candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] }, finishReason: 'MAX_TOKENS' }] }).text, 'ab');
});

test('правки файла: replace_note / append / replace_text / replace_selection', () => {
  const s = d();
  assert.equal(s.eitiDocAIApplyText('a', { action: 'replace_note', body: 'b' }).body, 'b');
  assert.equal(s.eitiDocAIApplyText('a\n', { action: 'append', text: 'c' }).body, 'a\n\nc');
  assert.equal(s.eitiDocAIApplyText('x y z', { action: 'replace_text', find: 'y', text: 'Y' }).body, 'x Y z');
  assert.equal(s.eitiDocAIApplyText('y y', { action: 'replace_text', find: 'y', text: 'Y' }).ok, false);
  assert.equal(s.eitiDocAIApplyText('abc', { action: 'replace_selection', text: 'B' }, { start: 1, end: 2, text: 'b' }).body, 'aBc');
  assert.equal(s.eitiDocAIApplyText('abc', { action: 'delete_note' }).ok, false);
  assert.deepEqual(JSON.parse(JSON.stringify(s.eitiDocAIChangedRange('hello world', 'hello brave world'))), { start: 6, end: 12 });
});

test('«как в чате» с ChatGPT и Grok — выбранная модель, без подмены', () => {
  const store = { eiti_ai_provider: 'openai', eiti_notes_ai_enabled: '1', eiti_notes_ai_model: 'same', eiti_grok_vision_model: 'grok-4.7' };
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const s = loadFunctions(['eitiNotesAIIsEnabled', 'eitiNotesAIGetModel', 'eitiNotesAIResolveTarget', 'eitiDocAIResolveSame'], {
    localStorage: ls,
    eitiMigrateSavedModel: (k, v) => v || '',
    eitiGetOpenAIModel: () => 'gpt-6.1-sol',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(s.eitiNotesAIResolveTarget())), { provider: 'openai', model: 'gpt-6.1-sol' });
  store.eiti_ai_provider = 'grok';
  assert.deepEqual(JSON.parse(JSON.stringify(s.eitiNotesAIResolveTarget())), { provider: 'grok', model: 'grok-4.7' });
});

test('eitiDocAIRequest не подставляет другую модель, если нет ключа выбранной', async () => {
  const s = loadFunctions(['eitiDocAIKey', 'eitiDocAIRequest', 'eitiDocAIParseCompletion'], {
    localStorage: { getItem: (k) => (k === 'deepseek_api_key' ? 'ds' : null) },
    fetch: () => { throw new Error('fetch must not be called'); },
  });
  await assert.rejects(() => s.eitiDocAIRequest({ provider: 'grok', model: 'grok-4.7' }, [], 4000), /Нет ключа для grok/);
});

test('eitiDocAIRequest шлёт историю и модель Grok в api.x.ai', async () => {
  let seen = null;
  const s = loadFunctions(['eitiDocAIKey', 'eitiDocAIRequest', 'eitiDocAIParseCompletion'], {
    localStorage: { getItem: (k) => (k === 'eiti_grok_key' ? 'xai-k' : null) },
    fetch: (url, opts) => { seen = { url, body: JSON.parse(opts.body) }; return Promise.resolve({ json: () => Promise.resolve({ choices: [{ message: { content: 'ответ' }, finish_reason: 'stop' }] }) }); },
  });
  const msgs = [{ role: 'system', content: 'S' }, { role: 'user', content: 'q1' }, { role: 'assistant', content: 'a1' }, { role: 'user', content: 'q2' }];
  const res = await s.eitiDocAIRequest({ provider: 'grok', model: 'grok-4.7' }, msgs, 9000);
  assert.equal(seen.url, 'https://api.x.ai/v1/chat/completions');
  assert.equal(seen.body.model, 'grok-4.7');
  assert.equal(seen.body.max_tokens, 9000);
  assert.equal(seen.body.messages.length, 4);
  assert.equal(res.text, 'ответ');
  assert.equal(res.truncated, false);
});
