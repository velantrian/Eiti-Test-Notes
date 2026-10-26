# 🎙️ План работ: единый голосовой модуль EitiVoice

> Статус: **P0 реализован** (P0-1, P0-2, P0-3) — см. `local/eiti_voice.js`, `docs/ARCHITECTURE.md` §7.1. **P1-1 — черновик PR** (fallback по `ready()`, переподключение 2×(1с/3с), текстовый режим). P1-2, P1-3, P2 — впереди.
> Основа: `main` @ `77b1608` (после #45–#50), v14.13.0.
> Источник идеи: предложение ChatGPT «один модуль голосового ассистента для разных ИИ». Принцип: **не второй движок, а развитие существующего `window.EitiVoice`**.

## 🔎 1. Что есть сейчас (по коду)

| Что | Где | Комментарий |
|---|---|---|
| Реестр `window.EitiVoice` | `index.html` (IIFE после `eitiVoiceNeedFix`) | провайдеры `grok`, `gemini`, `openai`, `qwen`, `yandex` (Алиса), `mistral`; API: `providers, current, active, start, stop, mute, isActive, offerSwitch, label, tr, needs, ids` |
| Старт провайдеров | `_eitiGrokVoiceStartCore`, `eitiGeminiVoiceStart`, `eitiOpenAIVoiceStart` (WebRTC), `eitiRtProxyVoiceStart('qwen'|'yandex')`, `eitiMistralVoiceStart` | каждый сам открывает микрофон и сокет |
| Общий стоп / mute | `eitiGrokVoiceStop`, `eitiGrokMuteToggle` | общие для всех, но названы «grok» |
| Состояние | глобалы `window._grokVoiceActive`, `window._eitiVoiceProv`, `window._geminiLiveReady`, `_grokWS` | неявная машина состояний |
| Общие хелперы | `_eitiVoiceBegin`, `_eitiVoiceFail`, `_eitiRtHandle`, `_eitiVoiceLang`, `_eitiVoiceInstr` | `_eitiVoiceInstr` строит контекст через `eitiGeminiLiveInstructions(chatLog, …)` |
| Выбор провайдера | `eitiVoiceProvider`, `window.eitiSetVoiceProvider`, `eitiVoiceSettingsRender`, `eitiVoiceExtRender`, `eitiVoiceLabelsRender` | ключи/прокси: `eitiVoiceProxyUrl`, `eitiVoiceProxyValid` |
| Голосовой набор (STT) | `window.eitiDictationSupported` + Web Speech (`SpeechRecognition`, «на устройстве») | отдельно от ассистента |
| Модули `local/` | `eiti_local.js`, `eiti_dstate.js`, `eiti_typo.js`, `eiti_journal.js`, `eiti_related.js`, `eiti_drive_sync.js` | подключены `<script defer>`, кешируются в `sw.js`, публикуются через `local/eiti_*.js` в `scripts/build_pages.py` |
| Тесты | `e2e/chat_save_voice.spec.js` (mock WS Gemini/Grok), `e2e/v14120_voice_mistral.spec.js`, `e2e/v1490_journal_voice.spec.js`, `tests_js/v14120_voice.test.js`, `tests_js/chat_save_voice.test.js` | |

**Найденные пробелы:**
- `offerSwitch` → `other(id)` предлагает только `grok ↔ gemini`, остальные 4 провайдера в fallback не участвуют.
- Нет явных состояний (`idle/connecting/listening/…`) и единого кода ошибок — каждый провайдер шлёт свой тост.
- Нет переподключения при обрыве: `_eitiVoiceFail` сразу останавливает сессию.
- Нет честного офлайн-поведения у ассистента (сеть пропала → просто ошибка сокета).
- Контекст памяти собирается только из `chatLog`; L3/источники в голос не идут единым путём.

## ⚖️ 2. Противоречие с правилом одного файла

`AGENTS.md`: «Single-file architecture is sacred… Do NOT split… unless explicitly asked». При этом прецедент уже есть: `local/eiti_*.js` — движки без UI, грузятся отдельно, кешируются SW.

**Решение:**
1. Владелец проекта явно просит модуль → это и есть «explicitly asked». Фиксируем в PR.
2. Дописываем в `AGENTS.md` узкое исключение: «чистые движки без DOM можно выносить в `local/eiti_*.js`; UI, стили и разметка остаются в `index.html`».
3. `local/eiti_voice.js` — **только** контроллер, контракт и адаптеры-обёртки; низкоуровневый код провайдеров (WS/WebRTC, PCM) на первом этапе **остаётся** в `index.html` и вызывается через адаптеры. Так не ломаются тесты, которые вынимают функции из `index.html`.
4. Нет модуля (не загрузился) → `index.html` работает по-старому через текущий IIFE (graceful degradation).

## 🧩 3. Целевая архитектура

```
UI (index.html: кнопки, тосты, настройки)
        │  события voice:state / voice:error
        ▼
EitiVoice (local/eiti_voice.js) — контроллер + машина состояний
        │  контракт адаптера
        ├── grok · gemini · openai · qwen · yandex · mistral  (адаптеры → функции index.html)
        └── offline: dictation (Web Speech on-device) → текстовый конвейер
        ▲
ContextProvider (getContext) ← память EITI (IndexedDB: l3, kb, memkv, journal) + chatLog
```

**Контракт адаптера** (без DOM, пригоден для нативного/серверного клиента):
```js
{ id, label, caps: { stt, tts, duplex, offline, needsKey, needsProxy },
  ready(): ''|'key'|'proxy'|'network',
  start(ctx, hooks) → Promise, stop(), mute(on), sendText(txt) }
// hooks: onState(s), onTranscript({role, text, final}), onError({code, retriable, msg})
```
**Состояния:** `idle → requesting_mic → connecting → listening ⇄ speaking → reconnecting → stopped | error`.
**Коды ошибок:** `mic_denied`, `mic_absent`, `no_key`, `no_proxy`, `offline`, `socket`, `auth`, `quota`, `timeout`, `unknown`.

**Независимость:** память не знает о голосе, голос не знает о DOM, UI подписан на события. Память — IndexedDB-first, в localStorage только выбор провайдера и мелкие флаги (как сейчас).

## 🗺️ 4. Этапы

### 🟥 P0-1. Контракт и инвентаризация (без изменения поведения)
- **Что:** описать контракт, состояния, коды ошибок; карта всех путей голоса (функции выше); раздел в `docs/ARCHITECTURE.md` §7 обновить (сейчас там только Grok/Gemini).
- **Файлы:** `docs/ARCHITECTURE.md`, `AGENTS.md` (исключение для `local/`), `data/eiti_voice_contract_v1.json` (схема состояний/ошибок).
- **Тесты (unit):** `tests_js/voice_contract.test.js` — схема валидна; каждый id из `EitiVoice.ids()` есть в контракте; публичный API `EitiVoice` содержит все 12 текущих методов.
- **Приёмка:** CI зелёный, поведение 1:1, `index.html` не менялся по логике.

### 🟥 P0-2. `local/eiti_voice.js`: контроллер + адаптеры-обёртки
- **Что:** `EitiVoiceCore` с машиной состояний; 6 адаптеров, оборачивающих `_eitiGrokVoiceStartCore`, `eitiGeminiVoiceStart`, `eitiOpenAIVoiceStart`, `eitiRtProxyVoiceStart`, `eitiMistralVoiceStart`, `eitiGrokVoiceStop`, `eitiGrokMuteToggle`; `_eitiVoiceBegin/_eitiVoiceFail/_eitiRtHandle` дёргают `hooks.onState/onError`. `window.EitiVoice` остаётся фасадом с тем же API + новые `state()`, `on(event, fn)`, `caps(id)`.
- **Файлы:** `local/eiti_voice.js` (новый), `index.html` (`<script src="./local/eiti_voice.js" defer>`, тонкие вызовы хуков), `sw.js` (в список кеша + bump `CACHE`), `scripts/build_pages.py` уже покрывает `local/eiti_*.js` — проверить тестом.
- **Тесты:** unit `tests_js/eiti_voice_core.test.js` (переходы состояний, запрет двойного старта, stop из любого состояния → `idle`); unit `tests_js/eiti_voice_compat.test.js` (старый API: `start/stop/mute/isActive/label/needs/offerSwitch` работают, и без модуля — фолбэк на IIFE); Playwright `e2e/v14140_voice_controller.spec.js` (mock WS: Gemini и Grok проходят `connecting → listening → stopped`, события `voice:state` видны UI); существующие `chat_save_voice.spec.js`, `v14120_voice_mistral.spec.js` — без правок.
- **Приёмка:** все старые голосовые тесты зелёные без изменений; модуль в SW-кеше и в Pages allowlist (`test_pages_export.py`).

### 🟥 P0-3. Микрофон, разрешения и единые ошибки
- **Что:** один `getUserMedia` в контроллере (`requesting_mic`), понятные тосты по кодам (`mic_denied` → как разрешить; `no_key`/`no_proxy` → `eitiVoiceNeedFix`), i18n RU/EN/DE через `EitiVoice.tr`. Убрать разнобой тостов в провайдерах.
- **Файлы:** `local/eiti_voice.js`, `index.html` (тосты/стили).
- **Тесты:** unit `tests_js/eiti_voice_errors.test.js` (маппинг ошибок → код → текст на 3 языках); Playwright `e2e/v14140_voice_mic.spec.js` (отказ в разрешении микрофона через `context.grantPermissions([])`/мок → тост `mic_denied`, состояние `error → idle`, не висит ⏳).
- **Приёмка:** для каждого провайдера при отказе мика — одно понятное сообщение, кнопка голоса возвращается в исходное состояние.

### 🟧 P1-1. Fallback и переподключение
- **Что:** заменить `other(id)` (grok↔gemini) на цепочку: следующий **готовый** провайдер по `ready()`, затем текст. Переподключение при `socket/timeout` (до 2 попыток, backoff 1с/3с, состояние `reconnecting`), без повторов при `auth/quota/no_key`.
- **Файлы:** `local/eiti_voice.js`, `index.html` (`offerSwitch` UI).
- **Тесты:** unit `tests_js/eiti_voice_fallback.test.js` (выбор следующего провайдера, пропуск неготовых, лимит попыток); Playwright `e2e/v14140_voice_reconnect.spec.js` (mock WS закрывается → `reconnecting` → `listening`; второй обрыв → предложение переключиться на готового провайдера, например OpenAI с ключом).
- **Приёмка:** fallback предлагает только реально готовых провайдеров; нет бесконечных реконнектов.
- **Реализация (черновик PR):** `EitiVoice.handleDrop(id, code)` → `reconnect` | `fallback` | `text`; `fallbackOrder(from, order?)`, `pickFallback`, `cancelReconnect`, `reconnectInfo`, `textMode`; события `reconnect`, `fallback`, `text_mode`. Повтор только для `socket/timeout` при наличии сети; `auth/quota/no_key/no_proxy/mic_*/unknown` — без повторов. Счётчик сбрасывается успешным `listening` или новым стартом пользователем. Провайдер **не** переключается автоматически — только кнопка в `offerSwitch` (выбор пользователя). Нет готовых → тост «других готовых голосовых провайдеров нет» + кнопка «✍️ Написать текстом» (фокус в поле ввода); прежняя кнопка «Переключить на Grok» сохранена для совместимости. Тесты: `tests_js/eiti_voice_fallback.test.js`, `e2e/v14140_voice_reconnect.spec.js` (mock WS, без реальных провайдеров).
- **Ограничения:** проверено только на моках; Mistral (HTTP, пофразовый) не сообщает об обрыве в `handleDrop` (переподключение подключено для Grok, Gemini, OpenAI, Qwen, Алисы; OpenAI и прокси — через `_eitiVoiceFail`, тестами браузера покрыт путь Gemini); переподключение без жеста пользователя на iOS может оставить AudioContext в suspended — не проверено на устройстве; `CACHE` в `sw.js` не менялся (при старом закешированном модуле `index.html` деградирует к прежнему поведению).

### 🟧 P1-2. Честный офлайн
- **Что:** различать две возможности: **офлайн-распознавание речи** (Web Speech on-device, `eitiDictationSupported`) и **офлайн-ответ** (существующий офлайн-конвейер §6). Нет сети: если on-device STT есть → голосовой набор → офлайн-ответ текстом (озвучка `speechSynthesis`, если доступна); если нет → честное сообщение «распознавание без сети недоступно» + фокус в текстовое поле. Состояние `offline`, слушаем `online/offline`.
- **Файлы:** `local/eiti_voice.js` (адаптер `offline`), `index.html` (сообщение, фокус).
- **Тесты:** unit `tests_js/eiti_voice_offline.test.js` (матрица: сеть × STT on-device × TTS); Playwright `e2e/v14140_voice_offline.spec.js` (`context.setOffline(true)` → нет WS-попыток, тост + фокус ввода; с моком `SpeechRecognition` → ответ из офлайн-конвейера).
- **Приёмка:** офлайн ни один провайдер не пытается открыть сокет; пользователь всегда получает путь к ответу.

### 🟧 P1-3. Единый путь памяти и контекста
- **Что:** `getContext({lang, budget})` — один сборщик для текста и голоса: хвост `chatLog`, тема из `eiti_dstate.js`, релевантные факты L3 (IndexedDB `l3`/`memkv`), источники KB. Уважает «не запоминай»/«я ещё не решил» (#46) и Strict Memory. Транскрипты голоса пишутся тем же путём, что текст (никаких новых ключей localStorage). `_eitiVoiceInstr` → через `getContext`.
- **Файлы:** `local/eiti_voice.js` (только вызов), `index.html` (`eitiGeminiLiveInstructions` → общий сборщик), `docs/ARCHITECTURE.md`.
- **Тесты:** unit `tests_js/eiti_voice_context.test.js` (бюджет символов, нет фактов с `superseded_by`, нет «не запоминай»); Playwright `e2e/v14140_voice_memory.spec.js` (факт в L3 → попадает в `session.update`/setup mock WS; голосовой транскрипт → в `chatLog` и IDB, размер localStorage не растёт).
- **Приёмка:** контекст одинаков для текста и голоса; память только IndexedDB-first.

### 🟨 P2-1. Контракт для нативного и серверного клиента
- **Что:** вынести контракт в независимый от DOM вид (JSON-схема + TS-типы `docs/eiti_voice.d.ts`), описать маппинг на iOS/Android (AVAudioSession / AudioRecord) и серверный прокси (Qwen/Алиса уже через `wss://`-прокси). Дополнить §18 `ARCHITECTURE.md`.
- **Тесты:** unit `tests_js/eiti_voice_dom_free.test.js` — ядро запускается в Node без `window/document`.
- **Приёмка:** ядро и адаптерный контракт не обращаются к DOM.

### 🟨 P2-2. Постепенный перенос кода провайдеров и уборка имён
- **Что:** по одному провайдеру переносить WS/WebRTC-код из `index.html` в адаптеры; переименовать `_grokVoiceActive`/`eitiGrokVoiceStop` в нейтральные с алиасами для совместимости. Только после зелёных P0/P1.
- **Тесты:** существующие голосовые spec — неизменны; по unit-тесту на каждый перенесённый адаптер.
- **Приёмка:** `index.html` меньше, поведение то же.

## ⚠️ 5. Риски
- **Тесты, вынимающие функции из `index.html`** по позиции → переносить код только в P2, адаптеры сначала оборачивают.
- **Порядок загрузки `defer`**: модуль может прийти позже кликов → фасад в `index.html` с фолбэком.
- **SW-кеш**: забыть `local/eiti_voice.js` в `sw.js` → голос сломается офлайн/после обновления. Bump `CACHE`.
- **Разные протоколы** (Gemini Live, OpenAI Realtime/WebRTC, прокси, Mistral STT+TTS) → в контракт только общее, особенности внутри адаптера.
- **Ключи**: не логировать, не класть в события/контекст; модель угроз секретов — отдельная задача.
- **Мигающие e2e** (`v14130_save.spec.js:31`) могут маскировать регрессии → ретраи только для известных.
- **Приватность**: в голосовой контекст не должны утекать факты «не запоминай» и черновики.

## ✅ 6. Definition of Done
- [ ] `window.EitiVoice` сохраняет все текущие методы; старые голосовые тесты зелёные без правок.
- [ ] `local/eiti_voice.js`: машина состояний, коды ошибок, 6 адаптеров + офлайн.
- [ ] Fallback по готовности для всех провайдеров, реконнект с лимитом.
- [ ] Офлайн: STT и генерация ответа — отдельные возможности, честное сообщение + текстовый ввод.
- [ ] Один `getContext` для текста и голоса; память IndexedDB-first, localStorage не растёт.
- [ ] Ядро без DOM, контракт описан для нативного/серверного клиента.
- [ ] `AGENTS.md` и `docs/ARCHITECTURE.md` (§7, §18) обновлены; `sw.js` и Pages allowlist включают модуль.
- [ ] Все 4 проверки CI зелёные; ручная проверка Grok/Gemini на телефоне.
