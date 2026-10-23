# Что не работает в PWA и что заработает в нативном приложении

*What does not work in the PWA and what a native app would unlock (v14.9.0).*

EITI — это PWA: один `index.html`, данные в IndexedDB/localStorage, без сервера. Ниже — ограничения, которые видны в коде приложения, и что изменит нативная обёртка (iOS/Android). Таблица собрана по текущему коду, а не по общим спискам.

> **EN, short:** EITI is a backend-less PWA. Google Drive tokens last ~1 h with no refresh token; nothing runs in the background (sync, voice, reminders stop when the app is hidden); iOS mic/AudioContext quirks; Web Push only for home-screen apps on iOS 16.4+ and EITI has no push server; storage can be evicted; no real file-system access and no share target. A native app fixes these with refresh tokens, background tasks, native audio sessions, APNs/FCM, app-sandbox storage and share extensions.

| Функция | PWA сейчас (как в коде) | Нативное приложение |
|---|---|---|
| **Вход Google Drive** | GIS token client, scope `drive.file`; токен живёт ~1 ч (`expires_in` 3600), продлевается тихо (`prompt: ''`). Refresh token без своего сервера получить нельзя; на iPhone (ITP, блок сторонних cookie, закрытые попапы) Google иногда снова показывает окно — тогда плашка «Нажми, чтобы продолжить синхронизацию». | Нативный Google Sign-In выдаёт refresh token, хранится в Keychain/Keystore — вход один раз, без повторных окон. |
| **Фоновая синхронизация Drive** | Только пока приложение открыто: при старте, через 8 с после изменений и при сворачивании (`visibilitychange`). Background Sync / Periodic Sync на iOS нет, Service Worker не будит приложение. | BGAppRefreshTask / WorkManager — синхронизация по расписанию и при появлении сети. |
| **Голос (Grok Voice / Gemini Live)** | WebSocket + `getUserMedia` + AudioContext. При сворачивании/блокировке экрана iOS останавливает микрофон и звук — сеанс обрывается. Gemini Live ограничивает сеанс ~15 мин. Ключ Gemini передаётся в адресе WebSocket (временные токены требуют сервера). | Аудиосессия `AVAudioSession` (background audio / CallKit) — разговор продолжается с выключенным экраном; ключи за своим бэкендом. |
| **Частота микрофона на iOS** | Safari часто игнорирует `AudioContext({sampleRate:16000})` и даёт 44,1/48 кГц; с v14.9.0 EITI пересэмплирует в 16 кГц для Gemini и создаёт AudioContext прямо в нажатии кнопки (иначе он «suspended»). Микрофон — только после жеста пользователя. | Прямой захват PCM 16 кГц через AVAudioEngine/AudioRecord, без пересэмплирования в JS. |
| **Напоминания и уведомления** | `Notification.requestPermission` + таймеры на странице: срабатывают, только пока EITI открыт. Web Push на iOS — только для иконки на «Домой» (iOS 16.4+), и у EITI нет push-сервера. | Локальные уведомления (UNUserNotificationCenter / AlarmManager) по времени, даже если приложение закрыто; APNs/FCM. |
| **Хранилище** | IndexedDB (заметки, чаты, дневник `journal`), localStorage ~5 МБ. Квота зависит от браузера; `navigator.storage.persist()` запрашивается, но Safari может стереть данные сайта, если им не пользоваться ~7 дней (вне «Домой») или при нехватке места. Отсюда — Google Drive как резервная копия. | Песочница приложения/SQLite без вытеснения, iCloud/Auto Backup. |
| **Файлы** | Только `<input type=file>` и скачивание; нет доступа к папкам (File System Access API на iOS нет), нельзя следить за файлами. | Files/Document Provider, доступ к папкам, фоновый импорт. |
| **«Поделиться»** | Отправить из EITI можно (`navigator.share`), а **принять** «Поделиться → EITI» из других приложений нельзя (Share Target на iOS не поддерживается). | Share Extension — текст, ссылки, PDF прямо в заметки. |
| **Вибрация** | `navigator.vibrate` вызывается, но в Safari iOS его нет — отклика нет. | Taptic Engine / Haptics. |
| **Экран и фон** | Wake Lock работает только при открытой вкладке; любые таймеры (Dreaming дневника, авто-извлечение) не идут в фоне. | Фоновые задачи, длительная обработка. |
| **Обновления** | Service Worker; на iPhone новая версия видна после перезапуска приложения. Старая открытая вкладка может держать БД при обновлении схемы (v17) — EITI просит перезапуск. | Обновление через App Store/Play, миграции при запуске. |
| **Сеть к ИИ** | Ключи API хранятся в браузере (обфускация, не шифрование), запросы прямо к провайдерам; CORS ограничивает некоторые API. | Ключи в Keychain/за сервером, без CORS. |

См. также: [README](../README.md), [AGENTS.md](../AGENTS.md).
