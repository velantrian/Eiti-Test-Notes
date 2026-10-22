'use strict';
// v13.7.22: «💾 Сохранить чат» (md/txt/pdf), AI Voice (Grok xAI / Gemini Live), тихое обновление SW.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadFunctions, extractFunction, INDEX_HTML } = require('./harness');

const INDEX = fs.readFileSync(INDEX_HTML, 'utf8');
const SW = fs.readFileSync(path.join(path.dirname(INDEX_HTML), 'sw.js'), 'utf8');

const EXPORT_FNS = ['eitiNotesSanitizeFilename', 'eitiChatExportRole', 'eitiChatExportCleanText',
  'eitiChatExportVisible', 'eitiChatExportStamp', 'eitiChatExportContent'];

function sampleLog() {
  return [
    { id: 's', role: 'system', text: 'секретный системный промпт', ts: new Date(2026, 9, 22, 9, 0).getTime() },
    { id: 'u1', role: 'user', text: 'Привет! Вот фото ![кот](data:image/png;base64,AAAA)', ts: new Date(2026, 9, 22, 14, 5).getTime() },
    { id: 'a1', role: 'ai', text: 'Здравствуйте, **Руслан**.', ts: new Date(2026, 9, 22, 14, 6).getTime(), provider: 'deepseek' },
    { id: 'h', role: 'ai', text: 'скрытое', ts: 1, hidden: true },
    { id: 'e', role: 'user', text: '   ', ts: 2 },
    { id: 'a2', role: 'assistant', text: '[🗣️ AI Voice] Готово', ts: new Date(2026, 9, 22, 14, 7).getTime(), provider: 'gemini-live' },
    { id: 'a3', role: 'ai', text: 'Ок', ts: new Date(2026, 9, 22, 14, 8).getTime(), provider: 'openrouter', model: 'anthropic/claude' },
  ];
}

test('экспорт чата: Markdown — точный текст, роли, время, без system/hidden/пустых', () => {
  const { eitiChatExportContent } = loadFunctions(EXPORT_FNS);
  const out = eitiChatExportContent(sampleLog(), 'md', { title: 'Мой чат: план?', date: new Date(2026, 9, 22, 15, 30) });
  assert.equal(out.filename, 'chat-Мой_чат__план_-2026-10-22.md');
  assert.equal(out.mime, 'text/markdown;charset=utf-8');
  assert.equal(out.count, 4);
  assert.equal(out.content,
    '# Мой чат: план?\n\n' +
    '_Экспорт: 22.10.2026 15:30_\n\n' +
    '**Вы** · 22.10.2026 14:05\n\nПривет! Вот фото [изображение: кот]' +
    '\n\n---\n\n' +
    '**DeepSeek** · 22.10.2026 14:06\n\nЗдравствуйте, **Руслан**.' +
    '\n\n---\n\n' +
    '**AI Voice (Gemini)** · 22.10.2026 14:07\n\n[🗣️ AI Voice] Готово' +
    '\n\n---\n\n' +
    '**anthropic/claude** · 22.10.2026 14:08\n\nОк\n');
  assert.equal(out.content.includes('секретный'), false);
  assert.equal(out.content.includes('скрытое'), false);
  assert.equal(out.content.includes('base64'), false);
});

test('экспорт чата: TXT — точный текст с ролями', () => {
  const { eitiChatExportContent } = loadFunctions(EXPORT_FNS);
  const out = eitiChatExportContent(sampleLog().slice(0, 3), 'txt', { title: '', date: new Date(2026, 0, 5, 8, 3) });
  assert.equal(out.filename, 'chat-Чат-2026-01-05.txt');
  assert.equal(out.mime, 'text/plain;charset=utf-8');
  assert.equal(out.content,
    'Чат\nЭкспорт: 05.01.2026 08:03\n\n' +
    '[22.10.2026 14:05] Вы:\nПривет! Вот фото [изображение: кот]\n\n' +
    '[22.10.2026 14:06] DeepSeek:\nЗдравствуйте, **Руслан**.\n');
});

test('экспорт чата: PDF — тело markdown без заголовка, картинки/вложения → плейсхолдеры', () => {
  const { eitiChatExportContent, eitiChatExportCleanText } = loadFunctions(EXPORT_FNS);
  const log = [{ role: 'user', text: 'см. <img src="x.png"> и data:audio/mp3;base64,QUJD', ts: 0, attachments: [{ name: 'a.pdf' }] }];
  const out = eitiChatExportContent(log, 'pdf', { title: 'T', date: new Date(2026, 9, 22) });
  assert.equal(out.format, 'pdf');
  assert.equal(out.filename, 'chat-T-2026-10-22.pdf');
  assert.equal(out.content.startsWith('# '), false);
  assert.match(out.content, /\*\*Вы\*\*\n\nсм\. \[изображение\] и \[аудио\]\n\[вложение\]/);
  assert.equal(eitiChatExportCleanText('<EITI_FILE:a.txt>много</EITI_FILE>'), '[файл: a.txt]');
});

test('экспорт: download через код заметок (BOM), PDF через eitiNotesPrintPdf', () => {
  const fn = extractFunction('eitiChatSaveAs');
  assert.match(fn, /eitiNotesPrintPdf\(packed\.title, packed\.content\)/);
  assert.match(fn, /eitiNotesDownloadFile\(packed\.content, packed\.filename, packed\.mime\)/);
  assert.match(fn, /objectStore\('chats'\)\.get\(eitiCurrentChatId\)/);
  assert.match(extractFunction('eitiNotesDownloadFile'), /\\uFEFF/);
});

test('меню «+»: «💾 Сохранить чат» сразу после «Скопировать чат», включён по умолчанию', () => {
  const block = INDEX.slice(INDEX.indexOf('var EITI_CHAT_PLUS_ITEMS'), INDEX.indexOf('];', INDEX.indexOf('var EITI_CHAT_PLUS_ITEMS')));
  const ids = [...block.matchAll(/id: '(\w+)'/g)].map((m) => m[1]);
  assert.equal(ids[ids.indexOf('copyChat') + 1], 'saveChat');
  assert.match(block, /id: 'saveChat',\s+icon: '💾', label: 'Сохранить чат'.*defaultOn: true/);
  assert.match(INDEX, /copyChat: true, saveChat: true, clearInput: true/);
  // старые сохранённые настройки без ключа saveChat → пункт всё равно виден
  assert.match(INDEX, /if \(on === undefined\) on = !!item\.defaultOn;/);
  assert.match(INDEX, /'Сохранить чат': 'Save chat'/);
  assert.match(INDEX, /'Сохранить чат': 'Chat speichern'/);
});

test('переименование: нет видимого «Grok Voice» (только комментарии и совместимость)', () => {
  const offenders = INDEX.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => {
    const t = l.trim();
    if (!/Grok Voice|Grok-Voice|Grok Голос/.test(t)) return false;
    if (/^(\/\/|\/\*|\*|<!--)/.test(t)) return false;
    // обратная совместимость: распознаём старый префикс в истории
    if (t.includes("indexOf('[🗣️ Grok Voice]')")) return false;
    return true;
  });
  assert.deepEqual(offenders, []);
  assert.match(INDEX, /'🗣️ AI Voice остановлен'/);
  assert.match(INDEX, /label: 'AI Voice'/);
  // внутренние id / ключи localStorage прежние
  for (const k of ["'eiti_grok_key'", "'eiti_grok_voice_name'", "id=\"chat-grok-btn\"", "'eiti_grok_voice'"]) assert.ok(INDEX.includes(k), k);
});

function voiceSandbox(store) {
  const ls = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const models = [{ id: 'gemini-3.8-live' }, { id: 'gemini-3.8-live-extended-thinking' }, { id: 'gemini-3.1-flash-live-preview' }];
  const voices = ['Puck', 'Kore', 'Charon', 'Zephyr'];
  return loadFunctions(['_obfKey', 'eitiVoiceProvider', 'eitiGeminiLiveModel', 'eitiGeminiLiveVoice', 'eitiGeminiLiveKey',
    'eitiGeminiLiveUrl', 'eitiGeminiLiveSetupMessage', 'eitiGeminiLiveCloseMessage', 'eitiGeminiLiveInstructions'], {
    localStorage: ls, encodeURIComponent, btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    _deobfKey: (s) => (s ? Buffer.from(s, 'base64').toString('binary').split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (42 + i % 7))).join('') : ''),
    EITI_GEMINI_LIVE_MODELS: models, EITI_GEMINI_LIVE_VOICES: voices,
  });
}

test('AI Voice: провайдер/модель/голос из localStorage, дефолты, ключ Gemini как fallback', () => {
  const store = {};
  const sb = voiceSandbox(store);
  assert.equal(sb.eitiVoiceProvider(), 'grok');
  assert.equal(sb.eitiGeminiLiveModel(), 'gemini-3.8-live');
  assert.equal(sb.eitiGeminiLiveVoice(), 'Puck');
  store.eiti_voice_provider = 'gemini';
  store.eiti_gemini_live_model = 'gemini-3.8-live-extended-thinking';
  store.eiti_gemini_live_voice = 'Kore';
  assert.equal(sb.eitiVoiceProvider(), 'gemini');
  assert.equal(sb.eitiGeminiLiveModel(), 'gemini-3.8-live-extended-thinking');
  assert.equal(sb.eitiGeminiLiveVoice(), 'Kore');
  store.eiti_voice_provider = 'nonsense'; store.eiti_gemini_live_model = 'bogus'; store.eiti_gemini_live_voice = 'Bob';
  assert.equal(sb.eitiVoiceProvider(), 'grok');
  assert.equal(sb.eitiGeminiLiveModel(), 'gemini-3.8-live');
  assert.equal(sb.eitiGeminiLiveVoice(), 'Puck');
  assert.equal(sb.eitiGeminiLiveKey(), '');
  store.eiti_gemini_key = sb._obfKey('AIza-shared');
  assert.equal(sb.eitiGeminiLiveKey(), 'AIza-shared');
  store.eiti_gemini_live_key = sb._obfKey('AIza-own');
  assert.equal(sb.eitiGeminiLiveKey(), 'AIza-own');
});

test('Gemini Live: WS URL и setup-сообщение по документации', () => {
  const sb = voiceSandbox({});
  assert.equal(sb.eitiGeminiLiveUrl('k&y=1'),
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=k%26y%3D1');
  const msg = JSON.parse(JSON.stringify(sb.eitiGeminiLiveSetupMessage({ model: 'gemini-3.8-live', voice: 'Kore', instructions: 'Ты — AI Voice' })));
  assert.deepEqual(msg, {
    setup: {
      model: 'models/gemini-3.8-live',
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: 'Ты — AI Voice' }] },
    },
  });
  const ext = sb.eitiGeminiLiveSetupMessage({ model: 'models/gemini-3.8-live-extended-thinking', voice: 'Puck' });
  assert.equal(ext.setup.model, 'models/gemini-3.8-live-extended-thinking');
  assert.deepEqual(JSON.parse(JSON.stringify(ext.setup.generationConfig.thinkingConfig)), { thinkingLevel: 'low' });
  assert.equal(ext.setup.systemInstruction, undefined);
});

test('Gemini Live: понятные русские ошибки закрытия; инструкции с историей чата', () => {
  const sb = voiceSandbox({});
  assert.equal(sb.eitiGeminiLiveCloseMessage(1000, ''), '');
  assert.match(sb.eitiGeminiLiveCloseMessage(1007, 'API key not valid. Please pass a valid API key.'), /^❌ Gemini Live: ключ отклонён/);
  assert.match(sb.eitiGeminiLiveCloseMessage(1008, 'models/x is not found'), /ключ отклонён|модель недоступна/);
  assert.match(sb.eitiGeminiLiveCloseMessage(1011, 'Internal'), /соединение закрыто \(код 1011\)/);
  const txt = sb.eitiGeminiLiveInstructions([{ role: 'system', text: 'x' }, { role: 'user', text: 'привет' }, { role: 'ai', text: 'ответ' }], { version: '13.7.22', lang: 'ru' });
  assert.match(txt, /VELANTRIM EITI v13\.7\.22/);
  assert.match(txt, /\[Пользователь\]: привет\n\[AI\]: ответ/);
  assert.equal(txt.includes('[AI]: x'), false);
});

test('Gemini Live: протокол — setupComplete, realtimeInput.audio, audioStreamEnd, text', () => {
  const start = extractFunction('eitiGeminiVoiceStart');
  assert.match(start, /ws\.binaryType = 'arraybuffer'/);
  assert.match(start, /new TextDecoder\('utf-8'\)/);
  assert.match(start, /realtimeInput: \{ audio: \{ data: btoa\(bin\), mimeType: mime \} \}/);
  assert.match(start, /'audio\/pcm;rate=' \+ Math\.round/);
  assert.match(start, /!window\._geminiLiveReady/);
  const h = extractFunction('_eitiGeminiLiveHandle');
  assert.match(h, /msg\.setupComplete/);
  assert.match(h, /sc\.interrupted/);
  assert.match(h, /_grokPlayChunk\(part\.inlineData\.data\)/);
  assert.match(h, /sc\.turnComplete/);
  assert.match(extractFunction('eitiGrokMuteToggle'), /realtimeInput: \{ audioStreamEnd: true \}/);
  assert.match(INDEX, /_grokWS\.send\(JSON\.stringify\(\{ realtimeInput: \{ text: txt\.trim\(\) \} \}\)\)/);
});

test('Grok путь без изменений: URL, подпротокол, client_secrets, session.update', () => {
  // (тело содержит шаблон AudioWorklet со своими «}» — берём срез до eitiGrokVoiceStop)
  const start = INDEX.slice(INDEX.indexOf('function eitiGrokVoiceStart()'), INDEX.indexOf('function eitiGrokVoiceStop()'));
  assert.match(start, /'wss:\/\/api\.x\.ai\/v1\/realtime\?model=grok-voice-latest',\s*\['xai-client-secret\.' \+ authToken\]/);
  assert.match(start, /fetch\('https:\/\/api\.x\.ai\/v1\/realtime\/client_secrets'/);
  assert.match(start, /type: 'input_audio_buffer\.append', audio: b64/);
  assert.match(start, /type: 'session\.update',\s*session: \{\s*voice: _grokVoiceName/);
  assert.match(start, /eitiVoiceProvider\(\) === 'gemini'\) \{ eitiGeminiVoiceStart\(\); return; \}/);
  const toggle = extractFunction('eitiChatGrokToggle');
  assert.match(toggle, /eiti_grok_key/);
});

test('тихое обновление: нет тоста с версией при SW_UPDATED / updatefound', () => {
  assert.equal(/showToast\([^)]*Обновление v/.test(INDEX), false);
  assert.equal(INDEX.includes('Обновление готово — нажмите'), false);
  const i = INDEX.indexOf("e.data.type === 'SW_UPDATED'");
  assert.ok(i > 0);
  const handler = INDEX.slice(i, i + 400);
  assert.equal(handler.includes('showToast'), false);
  assert.match(handler, /window\._eitiSwUpdatedVersion = e\.data\.version/);
  assert.match(INDEX, /nw\.postMessage\(\{ type: 'SKIP_WAITING' \}\)/);
  // SW: механизм обновления на месте
  assert.match(SW, /self\.skipWaiting\(\)/);
  assert.match(SW, /SKIP_WAITING/);
  const ver = INDEX.match(/var EITI_VERSION = "([\d.]+)"/)[1];
  assert.ok(SW.includes("type: 'SW_UPDATED', version: '" + ver + "'"));
});
