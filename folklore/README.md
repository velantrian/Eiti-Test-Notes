# Фольклорные коллекции / Folklore collections

**Статус / Status (24.10.2026, PR #38):** `STRUCTURE VERIFIED`; `SOURCE ACCURACY: NOT VERIFIED`. Это **1 015 записей**, а не подтверждённое количество уникальных исторических произведений. / These are **1,015 records**, not an independently verified count of unique historical works.

**Структурная проверка / Structural parity:** `python3 folklore/tools/check.py`; тесты регрессии / regression tests: `python3 -m unittest discover -s folklore/tools -p 'test_*.py' -v`. Эти проверки НЕ устанавливают историческую достоверность или авторские права / These checks do NOT establish source fidelity or rights.

**Проверка ссылок, пересказов и согласованности / Link, retelling and consistency check:** [VERIFICATION.md](VERIFICATION.md); `python3 folklore/tools/check.py`. HTTP-прогон / HTTP run 2026-10-24: 559 URL: 552 → 200, 7 → другое / other (см. / see VERIFICATION.md). Пересказы перепроверены по источнику / re-checked against source: 166; USSR, написаны по прочитанному тексту / authored from read text: 107; не проверено / not verified: 742 (только Википедия / Wikipedia-only: 195).

| Раздел / Collection | Записей / Records |
| --- | ---: |
| [Кавказ / Caucasus](caucasus/index.md) | 596 |
| [Народы СССР / Peoples of the USSR](ussr/index.md) | 130 |
| [Древние традиции / Ancient traditions and later accounts](ancient/index.md) | 193 |
| [Америка / Americas](americas/index.md) | 96 |
| **Всего / Total** | **1 015** |

## RU — Описание и границы проверки

Пересказы мифов, легенд, сказок, преданий и исторических **сообщений о традициях**, сначала на русском, затем на английском, с отдельной редакторской моралью и ссылками. В каждой папке: `index.md`, общий `<collection>.json`, пары `tales_<group>.md/.json`. Исходные тексты здесь не воспроизводятся целиком.

- **STRUCTURE VERIFIED (24.10.2026):** проверены количества по группам, сводным JSON и индексам; наличие обязательных полей RU/EN, описаний, морали и URL; соответствие записей JSON/Markdown. Для Кавказа проверено совпадение состава сводного и групповых JSON независимо от порядка ключей.
- **SAMPLE REVIEWED:** отдельные записи сопоставлены с доступными текстами и библиографическими сведениями. См. [протокол аудита](AUDIT_2026-10-24.md). Выводы выборки нельзя распространять на весь корпус.
- **NOT VERIFIED:** что каждый источник прочитан полностью; что все ссылки доступны сейчас и ведут к конкретной нужной странице; что каждый пересказ точен и не содержит привнесённых деталей; что каждая культурная атрибуция подтверждена; что отсутствуют смысловые дубли; что все тексты и переводы свободны от авторских ограничений. Формальная корректность URL не доказывает доступности или качества источника.
- Совпадение названия, мотива или персонажа **не основание для удаления**. Разные записи и национальные варианты сохраняются до источниковедческой сверки.
- `moral` / `moral_en` — **авторская интерпретация**, а не засвидетельствованная мораль носителей традиции. Миф и предание — не доказательство исторического события. `[Свидетельство]` означает сообщение автора источника, **не независимое подтверждение его утверждений**.
- `ancient/` включает и поздние письменные пересказы, и свидетельства внешних авторов; друиды — общественно-религиозная группа, **не отдельный народ**. `ussr/` — условный географико-исторический каталог, а не утверждение о советском времени происхождения каждого сюжета. В `people` иногда включены библиографические пометы; это требует отдельной нормализации.
- Ссылки могут вести на оригинальные переводы, научные статьи, энциклопедии или лишь **страницы книг**. Общего статуса «источник — общественное достояние» нет; права на редакции и современные переводы проверяются отдельно. Например, CELT явно ограничивает использование части электронных текстов.

## EN — Description and verification limits

Russian-first and English-second retellings of myths, legends, folktales, traditions, and **historical accounts about traditions**, with editorial morals and references. Each collection has an `index.md`, a combined `<collection>.json`, and paired `tales_<group>.md/.json` files. These are not full reproductions of the original texts.

- **STRUCTURE VERIFIED (2026-10-24):** group and combined-JSON record counts, indices, required RU/EN fields, narrative and moral text, URLs, and corresponding Markdown records were checked. Caucasus combined/group membership was also verified irrespective of key ordering.
- **SAMPLE REVIEWED:** some entries were compared with accessible sources and bibliographic records; see the [audit log](AUDIT_2026-10-24.md). Sampling is not corpus-wide certification.
- **NOT VERIFIED:** full reading of every source; live accessibility and exact relevance of every URL; fidelity and absence of invented details in every retelling; all cultural labels; semantic deduplication; rights to every edition and translation. A syntactically valid link is not proof of a verified source.
- Shared titles, plots, and motifs **do not justify deletion**: distinct variants are preserved pending direct source comparison.
- `moral` / `moral_en` are **editorial interpretations**, not automatically the tradition bearers' own words. Myth is not historical proof; `[Testimony]` identifies an author's report, not independent historical verification.
- `ancient/` includes later written accounts and outsider testimonies; druids are a religious/social role, not a distinct people. `ussr/` is an editorial geo-historical grouping, not a dating claim. Some `people` values mix ethnicity with bibliographic notes.
- Links may lead to translations, scholarship, encyclopedias, or merely book catalogues. **Public-domain rights are not established for the whole corpus**; each edition and translation needs its own rights check. Some CELT materials have explicit access restrictions.

## Права и статус проекта / Rights and project status
**RU.** Это личный тестовый проект. Все пересказы написаны своими словами. Часть записей опирается на издания с ограниченным доступом или под авторским правом: CELT Muirchú (RESTRICTED), Lambert 1960, перевод Popol Vuh Christenson 2007, современные сборники. Такие записи помечены полем `rights` в JSON/Markdown и столбцом «Права / Rights» в [VERIFICATION.md](VERIFICATION.md). Перед любой публичной публикацией или выпуском нативного приложения они будут сокращены до коротких цитат с указанием источника или удалены.

**EN.** This is a personal test project. All retellings are written in my own words. Some records rely on restricted or copyrighted editions: CELT Muirchú (RESTRICTED), Lambert 1960, Christenson's 2007 Popol Vuh translation, and modern collections. They are flagged with a `rights` field in JSON/Markdown and in the "Права / Rights" column of [VERIFICATION.md](VERIFICATION.md). Before any public or native-app release, these items will be reduced to short attributed quotes or removed.
