# Проверка записей / Record verification

Дата проверки / Checked: 2026-10-24. Записей / Records: **1015** (ancient 193, americas 96, caucasus 596, ussr 130).

## RU — сводка
- Проверка ссылок: 537 уникальных URL из `folklore/*/*.json` запрошены автоматически (GET, следование редиректам, тайм-аут 20 с). Итог: 530 → 200; 2 → 401 (pueblosoriginarios.com блокирует автоматические запросы; к записям добавлено открытое издание Bourne 1906 на archive.org); 5 → ошибка SSL в Python requests (scylax.one; через curl сайт отвечает 403 — блокировка ботов, содержимое не проверено). Прогон 24.10.2026. 404 после исправлений нет.
- Заменены ссылки: kunstkamera.ru (Далгат; таймаут/404) → verigi.ru/?book=117 (страница книги Далгата, 2004); eisenbrauns.org (страница продажи) → archive.org/details/babylonianwisdom0000lamb_c2i9 (Lambert 1960; на archive.org только выдача в аренду, полный текст не открыт).
- CELT T201045 (Muirchú, пер. Bieler): статус **[RESTRICTED]** — «доступно с согласия CELT для академических целей». Текст на странице читается; ссылка оставлена, ограничение отмечено здесь.
- Сверка пересказов с источником: да (перепроверено) — 115; написано по прочитанному PD-тексту при создании, без повторной проверки (СССР) — 107; не проверено — **793** (из них только Википедия, `SECONDARY_ONLY / CONTENT_NOT_VERIFIED` — 219). Проверка запускается: `python3 folklore/tools/check.py`.
- Исправлено при сверке: «Тыква Яйяэля» (тыкву снимает сам Яйя, а не жена — Pané гл. IX); «Баяманако» (старик не плюёт, а бросает «гуангуайо» с кохобой; касаби было у него, а не «пеклось» — гл. XI).
- Простой статус 200 не доказывает, что страница содержит пересказанный сюжет.

## EN — summary
- Link check: 537 unique URLs from `folklore/*/*.json` fetched automatically (GET, follow redirects, 20 s timeout). Result: 530 → 200; 2 → 401 (pueblosoriginarios.com blocks automated requests; the open Bourne 1906 edition on archive.org was added to those records); 5 → SSL error in Python requests (scylax.one; via curl the site answers 403, bot-blocked, content not checked). Run 2026-10-24. No 404s remain.
- Replaced: kunstkamera.ru (Dalgat; timeout/404) → verigi.ru/?book=117 (Dalgat 2004 book page); eisenbrauns.org (sales page) → archive.org/details/babylonianwisdom0000lamb_c2i9 (Lambert 1960; lending-only on archive.org, no open full text).
- CELT T201045 (Muirchú, tr. Bieler) is marked **[RESTRICTED]** ("available with prior consent of the CELT programme for academic research and teaching only"). The text is readable on the page; the link is kept and the restriction is recorded here.
- Retelling checked against source: yes (re-checked) — 115; authored from a read PD text, not re-checked (USSR) — 107; not verified — **793** (of which Wikipedia-only, `SECONDARY_ONLY / CONTENT_NOT_VERIFIED` — 219). Consistency check: `python3 folklore/tools/check.py`.
- Fixed: "Yayael's Gourd" (Yaya himself takes down the gourd — Pané ch. IX); "Bayamanaco" (he throws a guanguayo full of cohoba, he does not spit; he had cassava — ch. XI).
- A 200 status does not prove the page contains the retold story.

## Права и статус проекта / Rights and project status
**RU.** Это личный тестовый проект. Все пересказы написаны своими словами, не являются копиями переводов. Часть записей опирается на издания с ограниченным доступом или под авторским правом (CELT Muirchú — RESTRICTED; Lambert 1960; перевод Popol Vuh Christenson 2007; современные советские и постсоветские сборники). Такие записи помечены в столбце «Права / Rights» (435 записей). Перед любой публичной публикацией или выпуском нативного приложения эти записи будут сокращены до коротких цитат с указанием источника или удалены.

**EN.** This is a personal test project. All retellings are written in my own words and are not copies of translations. Some records rely on restricted or copyrighted editions (CELT Muirchú — RESTRICTED; Lambert 1960; Christenson's 2007 Popol Vuh translation; modern Soviet/post-Soviet collections). They are flagged in the "Права / Rights" column (435 records). Before any public or native-app release, these items will be reduced to short attributed quotes or removed.

## Сверка записей «только Википедия» / Wikipedia-only upgrades (2026-10-24)
Открыты и прочитаны первоисточники; к записям добавлены ссылки / primary texts opened and read, links added: Mabinogion tr. Guest (PG 5160) — 7; Irving, Sketch Book (PG 2048) — 2; Ovid tr. Riley (PG 21765, 26073) — 2; Herodotus I.23–24 (PG 2707) — 1; Prose/Poetic Edda (PG 18947, 73533) — 5; Popol Vuh tr. Christenson (Mesoweb) — 5.
Исправлено / Fixed: Taliesin (палец/finger; в 13 лет освобождает Элфина и пророчит гибель Маэлгуну, а не «смерть короля»); Sleepy Hollow («лет тридцать назад», не «1790»); Arion (богатство из Италии и Сицилии, «орфийский» напев, моряки уверяют, что он в Таренте); Hymir (Тор ловит змея и бьёт молотом, а не «чуть не выудил»); Baldr (сны снились Бальдру; Локи срывает омелу, а не «делает копьё»); Cabrakan (известь и земля лишают сил, не «яд»); Rat (кувшин продырявила муха); Xquic = «Госпожа Кровь».
Не найдено открытого текста, статус оставлен NOT VERIFIED / no open text, left NOT VERIFIED: Enuma Elish (King 1902/1921 lacks retold details), Akkadian Fox (Lambert, lending-only).

## Дубли / Duplicate review (2026-10-24)
Сверено с первоисточниками / checked against the source texts:
- «Глупые аухцы» = «Глупцы из Ауха»: один и тот же рассказ № 83 у Dirr (1925, «The Stupid People of Auch»). Удалена менее полная запись «Глупые аухцы»; оставленная исправлена по тексту (цепочку разрывает второй, отпуская руку первого; в реку падают все, кроме первого). / Same Dirr no. 83; less complete record removed, kept one corrected.
- «Как жители Керкенджа ходили за дровами» = «Как керкенджцы ходили по дрова»: Dirr № 81. Оставлена полная запись (татарин, священник, деревце, овраг — всё есть у Dirr); удалена сокращённая. / Same Dirr no. 81; kept the complete record.
- «Птичка благодати, звезда ветров и змея» = «Птичка, несущая благодать, звезда ветров и змея»: № 161 сборника (запись А. У. Мальсагова 1965 г. от М. Цицкиева). Оставлена запись с указанием собирателя; удалена дублирующая (в ней была непроверенная деталь «задули ветры»). / Same item no. 161; kept the record with collector data.
- «Птичка, несущая благодать» (№ 173, запись Д. Д. Мальсагова 1920 г. от Г. Ахриева) — **отдельный** текст, оставлен. / No. 173 is a distinct text, kept.
- «Бедняк и змея» (ингуши) и «Бедняк и змея с сундуком» (азербайджанцы) — разные сюжеты; EN-название второго уточнено. / Distinct tales; EN title of the second disambiguated.

## Записи / Records

| # | Коллекция | Название / Title | Ссылки / Links | Сверка / Retelling verified | Права / Rights |
|---|---|---|---|---|---|
| 1 | ancient | Нисхождение Инанны в подземный мир / Inanna's Descent to the Netherworld | OK | no | — |
| 2 | ancient | Энлиль и Нинлиль / Enlil and Ninlil | OK | no | — |
| 3 | ancient | Гильгамеш и Агга / Gilgamesh and Aga | OK | no | — |
| 4 | ancient | Женитьба Марту / The Marriage of Martu | OK | no | — |
| 5 | ancient | Инанна и Билулу / Inanna and Bilulu | OK | no | — |
| 6 | ancient | Энки и Нинмах / Enki and Ninmah | OK | no | — |
| 7 | ancient | Спор Овцы и Зерна / The Debate between Sheep and Grain | OK | no | — |
| 8 | ancient | Спор Мотыги и Плуга / The Debate between the Hoe and the Plough | OK | no | — |
| 9 | ancient | Сон Думузи / Dumuzi's Dream | OK | no | — |
| 10 | ancient | Гильгамеш, Энкиду и подземный мир / Gilgamesh, Enkidu and the Netherworld | OK | no | — |
| 11 | ancient | Энмеркар и владыка Аратты / Enmerkar and the Lord of Aratta | OK | no | — |
| 12 | ancient | Энмеркар и Энсухкешданна / Enmerkar and Ensuhkeshdanna | OK | no | — |
| 13 | ancient | Лугальбанда в горной пещере / Lugalbanda in the Mountain Cave | OK | no | — |
| 14 | ancient | Лугальбанда и птица Анзуд / Lugalbanda and the Anzud Bird | OK | no | — |
| 15 | ancient | Потоп и Зиусудра (Эриду-генезис) / The Flood and Ziusudra (Eridu Genesis) | OK | yes — re-checked 2026-10-24 vs ETCSL c.1.7.4 translation (source-limited; fragmentary) | — |
| 16 | ancient | Спор Лета и Зимы / The Debate between Winter and Summer | OK | no | — |
| 17 | ancient | Подвиги Нинурты (Лугаль-э) / The Exploits of Ninurta (Lugal-e) | OK | no | — |
| 18 | ancient | Энки и Нинхурсаг / Enki and Ninhursag | OK | no | — |
| 19 | ancient | Гильгамеш и Небесный Бык (шумерская песнь) / Gilgamesh and the Bull of Heaven (Sumerian poem) | OK | yes — re-checked 2026-10-24 vs ETCSL c.1.8.1.2 translation (source-limited; fragmentary) | — |
| 20 | ancient | Инанна и Энки: дар божественных сил «ме» / Inanna and Enki: the Gift of the Me | OK | no | — |
| 21 | ancient | Гильгамеш и Хувава (шумерская песнь) / Gilgamesh and Huwawa (Sumerian poem) | OK | no | — |
| 22 | ancient | Поучения Шуруппака / The Instructions of Shuruppak | OK | no | — |
| 23 | ancient | Смерть Гильгамеша / The Death of Gilgamesh | OK | no | — |
| 24 | ancient | Инанна и Шукалетуда / Inanna and Shukaletuda | OK | no | — |
| 25 | ancient | Энки и устройство мира / Enki and the World Order | OK | no | — |
| 26 | ancient | Инанна и гора Эбих / Inanna and Mount Ebih | OK | no | — |
| 27 | ancient | Энлиль и Суд / Enlil and Sud | OK | no | — |
| 28 | ancient | Путешествие Нанны-Суэна в Ниппур / Nanna-Suen's Journey to Nippur | OK | no | — |
| 29 | ancient | Дом для рыбы / The Home of the Fish | OK | no | — |
| 30 | ancient | Энума элиш: смерть Апсу / Enuma Elish: The Death of Apsu | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 31 | ancient | Энума элиш: Мардук и Тиамат / Enuma Elish: Marduk and Tiamat | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 32 | ancient | Атрахасис: бунт богов и сотворение людей / Atrahasis: The Gods' Revolt and the Making of Mankind | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 33 | ancient | Атрахасис и потоп / Atrahasis and the Flood | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 34 | ancient | Адапа и Южный ветер / Adapa and the South Wind | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 35 | ancient | Этана и орёл / Etana and the Eagle | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 36 | ancient | Анзу и Таблицы судеб / Anzu and the Tablet of Destinies | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 37 | ancient | Эрра и Ишум / Erra and Ishum | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 38 | ancient | Повесть об Ахикаре / The Story of Ahiqar | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 39 | ancient | Вавилонская теодицея / The Babylonian Theodicy | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 40 | ancient | Поэма о невинном страдальце (Лудлул бел немеки) / Ludlul bel nemeqi (The Poem of the Righteous Sufferer) | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 41 | ancient | Кутейская легенда о Нарам-Суэне / The Cuthean Legend of Naram-Sin | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 42 | ancient | Гильгамеш: Энкиду и рождение дружбы / Gilgamesh: Enkidu and the Birth of Friendship | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 43 | ancient | Гильгамеш: поход против Хумбабы / Gilgamesh: The Expedition against Humbaba | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 44 | ancient | Гильгамеш, Иштар и Небесный Бык / Gilgamesh, Ishtar and the Bull of Heaven | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 45 | ancient | Гильгамеш: смерть Энкиду / Gilgamesh: The Death of Enkidu | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 46 | ancient | Гильгамеш в поисках бессмертия / Gilgamesh's Quest for Immortality | OK | yes — re-checked 2026-10-24 vs Thompson 1928 translation (archive.org) | RESTRICTED / copyright may apply: Thompson 1928 translation: copyright status unclear; retold in own words |
| 47 | ancient | Гильгамеш: рассказ Утнапишти и трава молодости / Gilgamesh: Utnapishtim's Tale and the Plant of Youth | OK | yes — re-checked 2026-10-24 vs Thompson 1928 translation (archive.org) | RESTRICTED / copyright may apply: Thompson 1928 translation: copyright status unclear; retold in own words |
| 48 | ancient | Нергал и Эрешкигаль / Nergal and Ereshkigal | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 49 | ancient | Нисхождение Иштар в подземный мир / The Descent of Ishtar to the Underworld | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 50 | ancient | Легенда о рождении Саргона / The Birth Legend of Sargon | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 51 | ancient | Бедняк из Ниппура / The Poor Man of Nippur | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 52 | ancient | Диалог господина и раба (Диалог пессимизма) / The Dialogue of Pessimism (Master and Slave) | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 53 | ancient | Диалог человека со своим богом / The Dialogue between a Man and His God | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 54 | ancient | Басня о лисе (фрагменты) / The Fable of the Fox (fragments) | OK | no | RESTRICTED / copyright may apply: Lambert, Babylonian Wisdom Literature (1960) is in copyright; archive.org copy is lending-only |
| 55 | ancient | Тамариск и Пальма / The Tamarisk and the Palm | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 56 | ancient | Дети Лира / The Children of Lir | OK | yes — re-checked 2026-10-24 vs Joyce, Old Celtic Romances (Gutenberg 38041) | — |
| 57 | ancient | Лосось мудрости / The Salmon of Knowledge | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 58 | ancient | Ойсин в Тир-на-Ног / Oisín in Tír na nÓg | OK | yes — re-checked 2026-10-24 vs Joyce, Old Celtic Romances (Gutenberg 38041; Oisín's own account to St Patrick) | — |
| 59 | ancient | Дейрдре и сыновья Уснеха / Deirdre and the Sons of Uisnech | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 60 | ancient | Сватовство к Этайн / The Wooing of Étaín | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 61 | ancient | Гибель сыновей Туиренна / The Fate of the Sons of Tuireann | OK | yes — re-checked 2026-10-24 vs Joyce, Old Celtic Romances (Gutenberg 38041) | — |
| 62 | ancient | Пуйлл, князь Диведа / Pwyll, Prince of Dyfed | OK | yes — re-checked 2026-10-24 vs Mabinogion, tr. Guest (Gutenberg 5160) | — |
| 63 | ancient | Бранвен, дочь Ллира / Branwen, Daughter of Llŷr | OK | yes — re-checked 2026-10-24 vs Mabinogion, tr. Guest (Gutenberg 5160) | — |
| 64 | ancient | Манавидан, сын Ллира / Manawydan, Son of Llŷr | OK | yes — re-checked 2026-10-24 vs Mabinogion, tr. Guest (Gutenberg 5160) | — |
| 65 | ancient | Блодейведд, девушка из цветов / Blodeuwedd, the Maiden of Flowers | OK | yes — re-checked 2026-10-24 vs Mabinogion (Math), tr. Guest (Gutenberg 5160) | — |
| 66 | ancient | Килух и Олвен / Culhwch and Olwen | OK | yes — re-checked 2026-10-24 vs Mabinogion (Kilhwch and Olwen), tr. Guest (Gutenberg 5160) | — |
| 67 | ancient | Гвион Бах и рождение Талиесина / Gwion Bach and the Birth of Taliesin | OK | yes — re-checked 2026-10-24 vs Mabinogion (Taliesin), tr. Guest (Gutenberg 5160) | — |
| 68 | ancient | Ллудд и Ллевелис / Lludd and Llefelys | OK | yes — re-checked 2026-10-24 vs Mabinogion, tr. Guest (Gutenberg 5160) | — |
| 69 | ancient | Кантре-р-Гваэлод — затонувшая земля / Cantre'r Gwaelod, the Sunken Hundred | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 70 | ancient | Город Ис / The City of Ys | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 71 | ancient | Тэм Лин / Tam Lin | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 72 | ancient | Как Сетанта стал Кухулином / How Sétanta Became Cú Chulainn | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 73 | ancient | Проклятие Махи / The Curse of Macha | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 74 | ancient | Похищение быка из Куальнге / The Cattle Raid of Cooley | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 75 | ancient | Гибель единственного сына Айфе / The Death of Aífe's Only Son | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 76 | ancient | Пир Брикриу / Bricriu's Feast | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 77 | ancient | Смерть Кухулина / The Death of Cú Chulainn | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 78 | ancient | Первая битва при Маг Туиред / The First Battle of Mag Tuired | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 79 | ancient | Буггане и церковь святого Триниана / The Buggane and St Trinian's Church | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 80 | ancient | Феноддери, проворный косарь / The Fenodyree, the Nimble Mower | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 81 | ancient | Мостовая великанов / The Giant's Causeway | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 82 | ancient | Великан Корморан и гора Святого Михаила / Cormoran and St Michael's Mount | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 83 | ancient | Русалка из Зеннора / The Mermaid of Zennor | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 84 | ancient | Ян Трегигл / Jan Tregeagle | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 85 | ancient | Анку — слуга смерти / The Ankou, Servant of Death | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 86 | ancient | Туан мак Кайрилл / Tuan mac Cairill | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 87 | ancient | Плавание Брана / The Voyage of Bran | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 88 | ancient | Плавание Майль-Дуйна / The Voyage of Máel Dúin | OK | yes — re-checked 2026-10-24 vs Joyce, Old Celtic Romances (Gutenberg 38041; "The Voyage of Maildun") | — |
| 89 | ancient | Кесайр и Финтан (Книга захватов Ирландии) / Cessair and Fintán (Book of Invasions) | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 90 | ancient | Немедийцы и башня Конанда / The Nemedians and Conand's Tower | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 91 | ancient | Сыновья Миля и три королевы Ирландии / The Sons of Míl and the Three Queens of Ireland | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 92 | ancient | Погоня за Диармайдом и Грайне / The Pursuit of Diarmuid and Gráinne | OK | yes — re-checked 2026-10-24 vs Joyce, Old Celtic Romances (Gutenberg 38041) | — |
| 93 | ancient | Остров женщин-самнитов / The Island of the Samnite Women | OK | no | — |
| 94 | ancient | Гавань «Двух воронов» / The Harbour of the 'Two Crows' | OK | no | — |
| 95 | ancient | Друиды по Цезарю: судьи и учителя Галлии / The Druids according to Caesar: Judges and Teachers of Gaul | OK | no | — |
| 96 | ancient | Учение друидов о бессмертии души / The Druids' Teaching on the Immortality of the Soul | OK | no | — |
| 97 | ancient | Плетёные идолы галлов / The Wicker Images of the Gauls | OK | no | — |
| 98 | ancient | Обряд омелы / The Mistletoe Rite | OK | no | — |
| 99 | ancient | Римляне на острове Мона / The Romans on Mona | OK | no | — |
| 100 | ancient | Пророчество друидов о пожаре Капитолия / The Druids' Prophecy on the Burning of the Capitol | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 101 | ancient | Дивициак — единственный друид, известный по имени / Diviciacus, the Only Druid Known by Name | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 102 | ancient | Сон у могил вождей / Sleeping by the Tombs of Chieftains | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 103 | ancient | Пророчество Катбада о дне оружия / Cathbad's Prophecy of the Day of Arms | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 104 | ancient | Катбад и рождение Конхобара / Cathbad and the Birth of Conchobar | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 105 | ancient | Мог Руит, слепой друид Мунстера / Mug Ruith, the Blind Druid of Munster | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 106 | ancient | Песнь Амергина / The Song of Amergin | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 107 | ancient | Тёмный друид и Садб / The Dark Druid and Sadhbh | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 108 | ancient | Тлахтга, дочь друида / Tlachtga, Daughter of the Druid | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 109 | ancient | Барды, ваты и друиды по Страбону / Bards, Vates and Druids according to Strabo | OK | no | — |
| 110 | ancient | Друиды, останавливающие битвы / The Druids Who Halted Battles | OK | no | — |
| 111 | ancient | Барды, эвхаги и друиды по Аммиану / Bards, Euhages and Druids according to Ammianus | OK | no | — |
| 112 | ancient | Змеиное яйцо друидов / The Druids' Serpent's Egg | OK | no | — |
| 113 | ancient | Пророчество друидов о «Бритоголовом» / The Druids' Prophecy of the 'Shaven-Head' | OK | yes — re-checked 2026-10-24 vs Pané (Bourne 1906) / Muirchú (Bieler, CELT) | RESTRICTED / copyright may apply: CELT T201045 (Muirchú, tr. Bieler) is marked RESTRICTED: available with CELT consent for academic research/teaching only |
| 114 | ancient | Пасхальный огонь и гибель друида Лохру / The Paschal Fire and the Death of the Druid Lochru | OK | yes — re-checked 2026-10-24 vs Pané (Bourne 1906) / Muirchú (Bieler, CELT) | RESTRICTED / copyright may apply: CELT T201045 (Muirchú, tr. Bieler) is marked RESTRICTED: available with CELT consent for academic research/teaching only |
| 115 | ancient | Состязание Патрика с друидом Лукет Маэлом / Patrick's Contest with the Druid Lucet Máel | OK | yes — re-checked 2026-10-24 vs Pané (Bourne 1906) / Muirchú (Bieler, CELT) | RESTRICTED / copyright may apply: CELT T201045 (Muirchú, tr. Bieler) is marked RESTRICTED: available with CELT consent for academic research/teaching only |
| 116 | ancient | Пророчество друидов о смерти Лоэгайре / The Druids' Prophecy of Lóegaire's Death | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 117 | ancient | Пророчество Федельм / Fedelm's Prophecy | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 118 | ancient | Друиды по Помпонию Меле: учителя в пещерах и лесах / Pomponius Mela on the Druids: Teachers in Caves and Forests | OK | no | — |
| 119 | ancient | Лукан о друидах: смерть — середина долгой жизни / Lucan on the Druids: Death the Midpoint of a Long Life | OK | no | — |
| 120 | ancient | Баал и Ям / Baal and Yam | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 121 | ancient | Дворец Баала / The Palace of Baal | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 122 | ancient | Баал и Мот / Baal and Mot | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 123 | ancient | Акхат и лук / Aqhat and the Bow | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 124 | ancient | Царь Кирта / King Kirta | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 125 | ancient | Рождение Шахара и Шалима / The Birth of Shahar and Shalim | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 126 | ancient | Свадьба Никкаль и Яриха / The Marriage of Nikkal and Yarikh | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 127 | ancient | Призывание Рефаимов / Invoking the Rephaim | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 128 | ancient | Послание Шапш против змеиного яда / Shapsh's Message against Serpent Venom | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 129 | ancient | Бойня Анат и послание Баала / Anat's Slaughter and Baal's Message | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 130 | ancient | Осирис, Исида и Сет / Osiris, Isis and Set | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 131 | ancient | Тяжба Гора и Сета / The Contendings of Horus and Seth | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 132 | ancient | Сказка о двух братьях / The Tale of Two Brothers | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales II (Gutenberg 7413; "Anpu and Bata") | — |
| 133 | ancient | Потерпевший кораблекрушение / The Shipwrecked Sailor | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales I (Gutenberg 7386); differences from modern translations noted in the text | — |
| 134 | ancient | Красноречивый крестьянин / The Eloquent Peasant | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales I (Gutenberg 7386; "The Peasant and the Workman", older names Meruitensa/Hemti) | — |
| 135 | ancient | Повесть о Синухе / The Story of Sinuhe | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales I (Gutenberg 7386; "Sanehat") | — |
| 136 | ancient | Истребление людей / The Destruction of Mankind | OK | yes — re-checked 2026-10-24 vs Budge, Legends of the Gods (Gutenberg 9411) | — |
| 137 | ancient | Рампсинит и ловкий вор / Rhampsinitus and the Master Thief | OK | no | — |
| 138 | ancient | Бог грозы и змей Иллуянка / The Storm God and the Serpent Illuyanka | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 139 | ancient | Исчезновение Телепину / The Vanishing of Telipinu | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 140 | ancient | Песнь об Улликумми / The Song of Ullikummi | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 141 | ancient | Йима и вар / Yima and the Vara | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 142 | ancient | Ману и рыба / Manu and the Fish | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 143 | ancient | Пуруравас и Урваши / Pururavas and Urvashi | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 144 | ancient | Таргитай и золотые дары / Targitaus and the Golden Gifts | OK | no | — |
| 145 | ancient | Гигес и жена Кандавла / Gyges and the Wife of Candaules | OK | no | — |
| 146 | ancient | Арион и дельфин / Arion and the Dolphin | OK | yes — re-checked 2026-10-24 vs Herodotus I.23-24, tr. Macaulay (Gutenberg 2707) | — |
| 147 | ancient | Филемон и Бавкида / Baucis and Philemon | OK | yes — re-checked 2026-10-24 vs Ovid, Met. VIII, tr. Riley (Gutenberg 26073) | — |
| 148 | ancient | Тагет из борозды / Tages from the Furrow | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 149 | ancient | Мёд поэзии / The Mead of Poetry | OK | yes — re-checked 2026-10-24 vs Younger (Prose) Edda, tr. Anderson (Gutenberg 18947) | — |
| 150 | ancient | Тор у великана Хюмира / Thor at the Giant Hymir's | OK | yes — re-checked 2026-10-24 vs Poetic Edda (Hymiskvitha), tr. Bellows (Gutenberg 73533) | — |
| 151 | ancient | Паньгу отделяет небо от земли / Pangu Separates Heaven and Earth | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 152 | ancient | Хоу И и десять солнц / Hou Yi and the Ten Suns | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 153 | ancient | Куафу гонится за солнцем / Kuafu Chases the Sun | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 154 | ancient | Цзинвэй засыпает море / Jingwei Fills the Sea | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 155 | ancient | Заххак и змеи на плечах / Zahhak and the Serpents on His Shoulders | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 156 | ancient | Кузнец Кава и его знамя / Kaveh the Blacksmith and His Banner | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 157 | ancient | Рустам и Сохраб / Rostam and Sohrab | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 158 | ancient | Начикетас у бога смерти / Nachiketa and the God of Death | OK | yes — re-checked 2026-10-24 vs Katha Upanishad, tr. Paramananda (Gutenberg 3283) | — |
| 159 | ancient | Шунахшепа у жертвенного столба / Shunahshepa at the Sacrificial Post | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 160 | ancient | Савитри и Сатьяван / Savitri and Satyavan | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 161 | ancient | Геракл и змееногая дева / Heracles and the Snake-Maiden | OK | no | — |
| 162 | ancient | Гибель Анахарсиса / The Death of Anacharsis | OK | no | — |
| 163 | ancient | Клеобис и Битон / Cleobis and Biton | OK | no | — |
| 164 | ancient | Пирам и Фисба / Pyramus and Thisbe | OK | yes — re-checked 2026-10-24 vs Ovid, Met. IV, tr. Riley (Gutenberg 21765) | — |
| 165 | ancient | Андрокл и лев / Androcles and the Lion | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 166 | ancient | Смерть Бальдра / The Death of Baldr | OK | yes — re-checked 2026-10-24 vs Younger (Prose) Edda, tr. Anderson (Gutenberg 18947) | — |
| 167 | ancient | Как Тор вернул свой молот / How Thor Got His Hammer Back | OK | yes — re-checked 2026-10-24 vs Poetic Edda (Thrymskvitha), tr. Bellows (Gutenberg 73533) | — |
| 168 | ancient | Как связали волка Фенрира / The Binding of Fenrir | OK | yes — re-checked 2026-10-24 vs Younger (Prose) Edda, tr. Anderson (Gutenberg 18947) | — |
| 169 | ancient | Обречённый царевич / The Doomed Prince | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales II (Gutenberg 7413) | — |
| 170 | ancient | Снофру и потерянный амулет / Sneferu and the Lost Amulet | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales I (Gutenberg 7386) | — |
| 171 | ancient | Чудодей Джеди / Djedi the Wonder-Worker | OK | yes — re-checked 2026-10-24 vs Petrie, Egyptian Tales I (Gutenberg 7386; "Dedi") | — |
| 172 | ancient | Нюйва чинит небо / Nüwa Mends the Sky | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 173 | ancient | Нюйва лепит людей / Nüwa Shapes Humankind | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 174 | ancient | Гунгун и гора Бучжоу / Gonggong and Mount Buzhou | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 175 | ancient | Гунь и самовозрастающая земля / Gun and the Self-Growing Soil | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 176 | ancient | Великий Юй укрощает воды / Yu the Great Tames the Waters | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 177 | ancient | Чанъэ улетает на Луну / Chang'e Flies to the Moon | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 178 | ancient | Пастух и Ткачиха / The Cowherd and the Weaver Girl | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 179 | ancient | Сон о бабочке / The Butterfly Dream | OK | yes — re-checked 2026-10-24 vs Zhuangzi ch. 2, tr. Giles (Gutenberg 59709) | — |
| 180 | ancient | Смерть Хуньтуня / The Death of Hundun | OK | yes — re-checked 2026-10-24 vs Zhuangzi ch. 7, tr. Giles (Gutenberg 59709) | — |
| 181 | ancient | Радость рыб / The Joy of Fish | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 182 | ancient | Чжуан-цзы бьёт в таз над умершей женой / Zhuangzi Drums on a Tub for His Dead Wife | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 183 | ancient | Похороны Чжуан-цзы / The Funeral of Zhuangzi | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 184 | ancient | Глупый старик передвигает горы / The Foolish Old Man Removes the Mountains | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 185 | ancient | Нефрит господина Хэ / The Jade of Mr He | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 186 | ancient | Механический человек Янь Ши / Yan Shi's Mechanical Man | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 187 | ancient | Царь Му у Царицы-матери Запада / King Mu Visits the Queen Mother of the West | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 188 | ancient | Мастарна и братья Вибенны / Mastarna and the Vibenna Brothers | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 189 | ancient | Вегойя, пророчица границ / Vegoia, Prophetess of Boundaries | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 190 | ancient | Повар Дин разделывает быка / Cook Ding Carves an Ox | OK | no | — |
| 191 | ancient | Человек из Ци, боявшийся, что небо упадёт / The Man of Qi Who Feared the Sky Would Fall | OK | no | — |
| 192 | ancient | Пропавший топор / The Lost Axe | OK | no | — |
| 193 | ancient | Пророчество Вегойи к Арунту Вельтимну / The Prophecy of Vegoia to Arruns Veltymnus | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 1 | americas | Как был создан мир / How the World Was Made | OK | no | — |
| 2 | americas | Первый огонь / The First Fire | OK | no | — |
| 3 | americas | Канати и Селу / Kanati and Selu | OK | no | — |
| 4 | americas | Происхождение болезней и лекарств / The Origin of Disease and Medicine | OK | no | — |
| 5 | americas | Дочь Солнца / The Daughter of the Sun | OK | no | — |
| 6 | americas | Плеяды и сосна / The Pleiades and the Pine | OK | no | — |
| 7 | americas | Млечный Путь — «Где бежал пёс» / The Milky Way: 'Where the Dog Ran' | OK | no | — |
| 8 | americas | Происхождение земляники / The Origin of Strawberries | OK | no | — |
| 9 | americas | Как Черепаха обогнала Кролика / How the Terrapin Beat the Rabbit | OK | no | — |
| 10 | americas | Кролик и смоляной волк / The Rabbit and the Tar Wolf | OK | no | — |
| 11 | americas | Игра в мяч птиц и зверей / The Ball Game of the Birds and Animals | OK | no | — |
| 12 | americas | Копьепалая (Утлунта) / Spear-finger (U'tlun'ta) | OK | no | — |
| 13 | americas | Великая пиявка Тланусийи / The Great Leech of Tlanusi'yi | OK | no | — |
| 14 | americas | Небесная Женщина и Черепаший остров / Sky Woman and Turtle Island | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 15 | americas | Женщина Белого Бизона / White Buffalo Calf Woman | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 16 | americas | Седна, хозяйка моря / Sedna, Mistress of the Sea | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 17 | americas | Глускабе, бабушка Сурок и Ветряная птица / Glooscap, Grandmother Woodchuck and the Wind Bird | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 18 | americas | Вендиго / The Wendigo | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 19 | americas | Странствия Кивиука / The Wanderings of Kiviuq | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 20 | americas | Калупалик / The Qalupalik | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 21 | americas | Миротворец и Гайавата / The Peacemaker and Hiawatha | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 22 | americas | Ворон крадёт свет / Raven Steals the Light | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 23 | americas | Ворон и люди в раковине / Raven and the People in the Clam Shell | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 24 | americas | Ворон, Чайка и ящик со светом / Raven, Seagull and the Box of Light | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 25 | americas | Медвежья Хижина (Девилс-Тауэр) / Bear Lodge (Devils Tower) | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 26 | americas | Дзунуква — Людоедка с корзиной / Dzunukwa, the Basket Ogress | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 27 | americas | Мишипешу — подводная рысь / Mishipeshu, the Underwater Panther | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 28 | americas | Бабушка-Паучиха и четыре мира / Spider Grandmother and the Four Worlds | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 29 | americas | Старик Напи творит мир и людей / Old Man Napi Makes the World and People | OK | no | — |
| 30 | americas | Старик и Камень / Old Man and the Rock | OK | no | — |
| 31 | americas | Как Старик украл поножи Солнца / Old Man Steals the Sun's Leggings | OK | no | — |
| 32 | americas | Шрамолицый: происхождение Знахарской хижины / Scarface: Origin of the Medicine Lodge | OK | no | — |
| 33 | americas | Творец Земли и Койот / Earth Maker and Coyote | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 34 | americas | Громовая птица / The Thunderbird | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 35 | americas | Дине Баханэ: путь через миры / Diné Bahaneʼ: The Journey Through the Worlds | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 36 | americas | Близнецы Солнца выводят людей к свету / The Sun Twins Lead the People to the Light | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 37 | americas | Утренняя Звезда и Вечерняя Звезда / Morning Star and Evening Star | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 38 | americas | Кокопелли — горбатый флейтист / Kokopelli, the Humpbacked Flute Player | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 39 | americas | Лис и Кролик / The Fox and the Rabbit | OK | no | — |
| 40 | americas | Гонка Черепахи и Медведя / The Race Between the Turtle and the Bear | OK | no | — |
| 41 | americas | Двухголовый змей / The Snake with Two Heads | OK | no | — |
| 42 | americas | Раки и Енот / The Crawfish and the Raccoon | OK | no | — |
| 43 | americas | Иктоми — паук-обманщик / Iktomi, the Spider Trickster | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 44 | americas | Черепаший остров / Turtle Island | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 45 | americas | Нуннехи и Яхула / The Nunnehi and Yahula | OK | yes — re-checked 2026-10-24 vs Mooney, Myths of the Cherokee (Gutenberg 45634; nos. 78, 86) | — |
| 46 | americas | Уктена — рогатый змей / The Uktena, the Horned Serpent | OK | no — partial: Cherokee part checked vs Mooney 1900 (Gutenberg 45634); Muscogee details not verified | — |
| 47 | americas | Люди из глины, люди из дерева / People of Mud, People of Wood | OK | no | — |
| 48 | americas | Люди из маиса / The People of Maize | OK | no | — |
| 49 | americas | Близнецы и Семь Ара / The Twins and Seven Macaw | OK | no | — |
| 50 | americas | Сипакна и Кабракан / Zipacna and Cabrakan | OK | yes — re-checked 2026-10-24 vs Popol Vuh, tr. Christenson | RESTRICTED / copyright may apply: Christenson 2007 translation (Mesoweb, open access): copyright applies; retold in own words |
| 51 | americas | Хун-Хунахпу и дочь владыки Шибальбы / Hun Hunahpu and the Daughter of Xibalba | OK | yes — re-checked 2026-10-24 vs Popol Vuh, tr. Christenson | RESTRICTED / copyright may apply: Christenson 2007 translation (Mesoweb, open access): copyright applies; retold in own words |
| 52 | americas | Близнецы и их старшие братья / The Twins and Their Elder Brothers | OK | yes — re-checked 2026-10-24 vs Popol Vuh, tr. Christenson | RESTRICTED / copyright may apply: Christenson 2007 translation (Mesoweb, open access): copyright applies; retold in own words |
| 53 | americas | Крыса и мяч отца / The Rat and the Father's Ballgame Gear | OK | yes — re-checked 2026-10-24 vs Popol Vuh, tr. Christenson | RESTRICTED / copyright may apply: Christenson 2007 translation (Mesoweb, open access): copyright applies; retold in own words |
| 54 | americas | Испытания в Шибальбе / The Trials of Xibalba | OK | yes — re-checked 2026-10-24 vs Popol Vuh, tr. Christenson | RESTRICTED / copyright may apply: Christenson 2007 translation (Mesoweb, open access): copyright applies; retold in own words |
| 55 | americas | Падение Шибальбы / The Downfall of Xibalba | OK | no | — |
| 56 | americas | Четыре прежних Солнца / The Four Former Suns | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 57 | americas | Пятое Солнце и кости из Миктлана / The Fifth Sun and the Bones from Mictlan | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 58 | americas | Рождение Уицилопочтли на Змеиной горе / The Birth of Huitzilopochtli at Serpent Mountain | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 59 | americas | Орёл на кактусе: основание Теночтитлана / The Eagle on the Cactus: Founding of Tenochtitlan | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 60 | americas | Попокатепетль и Истаксиуатль / Popocatépetl and Iztaccíhuatl | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 61 | americas | Штабай / The Xtabay | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 62 | americas | Алушы — хранители полей / The Aluxes, Guardians of the Fields | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 63 | americas | Кинаметцин — великаны прежней эпохи / The Quinametzin, Giants of a Former Age | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 64 | americas | Виракоча творит мир / Viracocha Makes the World | OK | yes — re-checked 2026-10-24 vs Sarmiento de Gamboa, History of the Incas, chs. 6-7 (Gutenberg 20218); retelling re-based on Sarmiento, Betanzos not open | — |
| 65 | americas | Манко Капак, Мама Окльо и золотой жезл / Manco Cápac, Mama Ocllo and the Golden Staff | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 66 | americas | Братья Айяр / The Ayar Brothers | OK | yes — re-checked 2026-10-24 vs Sarmiento de Gamboa, History of the Incas, tr. Markham (Gutenberg 20218) | — |
| 67 | americas | Инкарри — возвращение Инки / Inkarri, the Return of the Inca | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 68 | americas | Мама Килья — Мать-Луна / Mama Killa, Mother Moon | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 69 | americas | Амару — двуглавый змей / Amaru, the Two-Headed Serpent | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 70 | americas | Чибчакум и водопад Бочики / Chibchacum and Bochica's Waterfall | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 71 | americas | Бачуэ — мать человечества / Bachué, Mother of Humanity | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 72 | americas | Эль-Дорадо — Золотой человек / El Dorado, the Golden Man | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 73 | americas | Тупа и первые люди / Tupã and the First People | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 74 | americas | Япеуса и краб / Japeusá and the Crab | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 75 | americas | Керана, Тау и семь чудовищ / Kerana, Tau and the Seven Monsters | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 76 | americas | Небесные близнецы и ягуары / The Celestial Twins and the Jaguars | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 77 | americas | Журупари / Jurupari | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 78 | americas | Пинкойя / La Pincoya | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 79 | americas | Калеуче — корабль-призрак / The Caleuche, the Ghost Ship | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 80 | americas | Хайн: тайна духов / The Hain: The Secret of the Spirits | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 81 | americas | Тыква Яйяэля и рождение моря / Yayael's Gourd | 401 https://pueblosoriginarios.com/textos/pane/2.html | yes — re-checked 2026-10-24 vs Pané (Bourne 1906) / Muirchú (Bieler, CELT) | — |
| 82 | americas | Деминан Каракаракол и братья: происхождение океана / Deminán Caracaracol and His Brothers: Origin of the Ocean | 401 https://pueblosoriginarios.com/textos/pane/2.html; 401 https://pueblosoriginarios.com/textos/pane/3.html | yes — re-checked 2026-10-24 vs Pané (Bourne 1906) / Muirchú (Bieler, CELT) | — |
| 83 | americas | Деминан Каракаракол и Баяманако: кохоба и черепаха / Deminán Caracaracol and Bayamanaco: Cohoba and the Turtle | 401 https://pueblosoriginarios.com/textos/pane/3.html | yes — re-checked 2026-10-24 vs Pané (Bourne 1906) / Muirchú (Bieler, CELT) | — |
| 84 | americas | Пещера Игуанабоина: Солнце, Луна и камни дождя / The Cave of Iguanaboina: Sun, Moon and the Rain Stones | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 85 | americas | Гуабансекс и ураган / Guabancex and the Hurricane | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 86 | americas | Атабей и Юкаху / Atabey and Yúcahu | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 87 | americas | Хупиа — духи умерших / The Hupia, Spirits of the Dead | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 88 | americas | Ла Йорона — Плачущая женщина / La Llorona, the Weeping Woman | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 89 | americas | Рип ван Винкль / Rip Van Winkle | OK | yes — re-checked 2026-10-24 vs Irving, Sketch Book (Gutenberg 2048) | — |
| 90 | americas | Легенда о Сонной Лощине / The Legend of Sleepy Hollow | OK | yes — re-checked 2026-10-24 vs Irving, Sketch Book (Gutenberg 2048) | — |
| 91 | americas | Джон Генри / John Henry | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 92 | americas | Братец Кролик и Смоляное чучелко / Br'er Rabbit and the Tar-Baby | OK | no | — |
| 93 | americas | Саси-Перере / Saci-Pererê | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 94 | americas | Курупира — хранитель леса / Curupira, Guardian of the Forest | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 95 | americas | Безголовая мула / The Headless Mule | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 96 | americas | Помберо — Хозяин ночи / Pombero, Lord of the Night | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 1 | caucasus | Листья тополя / Poplar Leaves | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 2 | caucasus | Долг гостеприимства / The Duty of Hospitality | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 3 | caucasus | Четыре мудреца / The Four Sages | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 4 | caucasus | Честь / Honour | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 5 | caucasus | Голод, Холод и Сон / Hunger, Cold and Sleep | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 6 | caucasus | Счастье и Разум / Fortune and Reason | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 7 | caucasus | Голова и язык / The Head and the Tongue | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 8 | caucasus | Дележ мира / Dividing the World | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 9 | caucasus | Разговор косули с кизилом / The Roe Deer and the Cornel Tree | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 10 | caucasus | Как возникли солнце, месяц и звезды / How the Sun, Moon and Stars Came to Be | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 11 | caucasus | Спор о солнце и луне / The Quarrel over the Sun and the Moon | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 12 | caucasus | О возникновении благодати земной / How Earthly Abundance Began | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 13 | caucasus | О вершине Казбека / On the Summit of Kazbek | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 14 | caucasus | У-Нана / U-Nana, Mother of Plague | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 15 | caucasus | Мялхистинцы и У-Нана / The Melkhi and U-Nana | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 16 | caucasus | Хи-Нана / Khi-Nana, Mother of Water | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 17 | caucasus | Разговор вачбиев / The Talk of the Vachbii | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 18 | caucasus | Камень-крест / The Cross Stone | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 19 | caucasus | Как образовалась река Асса / How the Assa River Was Formed | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 20 | caucasus | Место падения Байтмара / Baytmar's Fall | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 21 | caucasus | Строители башен / The Tower Builders | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 22 | caucasus | Ханой и Хинг / Khanoy and Khing | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 23 | caucasus | Гий и Пховец / Giy and the Pshav | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 24 | caucasus | Князь Солса и бедняк / Prince Solsa and the Poor Man | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 25 | caucasus | Обанхойцы / The Obankhoy | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 26 | caucasus | Лиса и куропатка / The Fox and the Partridge | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 41 | — |
| 27 | caucasus | Храбрый Насни / Brave Näsni | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 21 | — |
| 28 | caucasus | Отцовское наследство / The Father's Bequest | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 22 | — |
| 29 | caucasus | Хитрые супруги / The Cunning Couple | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 74 | — |
| 30 | caucasus | Сын Месяца / The Son of the Moon | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 31 | caucasus | Птичка благодати, звезда ветров и змея / The Bird of Plenty, the Star of the Winds and the Snake | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 32 | caucasus | Птичка, несущая благодать / The Bird That Brings Plenty | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 33 | caucasus | Пиръон / Pir'on | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 34 | caucasus | Ханой Хинг и Бог / Khanoy Khing and God | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 35 | caucasus | Две башни Ханой Хинга / Khanoy Khing's Two Towers | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 36 | caucasus | Арсамак и Гий / Arsamak and Giy | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 37 | caucasus | Хромой Тимур / Lame Timur | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 38 | caucasus | Гази, сын Алдама / Gazi, Son of Aldam | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 39 | caucasus | Богач и Счастье / The Rich Man and Fortune | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 40 | caucasus | Мужчина-лицемер / The Hypocrite | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 41 | caucasus | И Чолдарг станцевал / Even Choldarg Danced | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 42 | caucasus | Возвращение благодати / The Return of Grace | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 43 | caucasus | Склон Мажки / Mazhka's Slope | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 44 | caucasus | Проклятие Пиръону / The Curse on Pir'on | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 45 | caucasus | Два князя / The Two Princes | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 46 | caucasus | Оки-Аки / Oki-Aki | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 47 | caucasus | Чудовище / The Monster | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 48 | caucasus | Как Елта стал одноглазым / How Elta Became One-Eyed | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 49 | caucasus | Итар Этиев и лесные люди / Itar Etiev and the Forest People | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 50 | caucasus | Начхо и белый олень / Nachkho and the White Deer | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 51 | caucasus | Быки, держащие землю / The Oxen Who Hold the Earth | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 52 | caucasus | Волк и человек / The Wolf and the Man | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 53 | caucasus | Первые люди и филин / The First People and the Owl | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 54 | caucasus | Сеска-Солса и великанская кость / Seska-Solsa and the Giant's Bone | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 55 | caucasus | Озеро Кезеной-Ам / Lake Kezenoy-Am | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 56 | caucasus | Глупцы из Ауха / The Stupid People of Aukh | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 83 | — |
| 57 | caucasus | Ветер и Солнце / The Wind and the Sun | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 58 | caucasus | Горец и Асса / The Highlander and the Assa | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 59 | caucasus | Дедушка зайца / The Hare's Grandfather | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 60 | caucasus | Чинхо и чёрт / Chinkho and the Devil | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 61 | caucasus | Орстхоец и чёрт / The Orstkhoi Man and the Devil | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 62 | caucasus | Старик и чёрт / The Old Man and the Devil | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 63 | caucasus | Как старик переспорил чёрта / How the Old Man Outtalked the Devil | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 64 | caucasus | Хитрый старик / The Cunning Old Man | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 65 | caucasus | Проклятие чёрта / The Devil's Curse | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 66 | caucasus | Чёрт и зурна / The Devil and the Zurna | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 67 | caucasus | Сам себя / Myself | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 68 | caucasus | Выбор девушки (камни-кресты у Галашек) / The Maiden's Choice (the Stone Crosses near Galashki) | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 69 | caucasus | Внук Козаша и Германч / Kozash's Grandson and Germanch | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 70 | caucasus | Лом-Эдалби / Lom-Edalbi | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 71 | caucasus | Ча и Чербаж / Cha and Cherbazh | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 72 | caucasus | Воин Шамиля / Shamil's Warrior | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 73 | caucasus | Шамиль и падчах Николай / Shamil and Padishah Nicholas | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 74 | caucasus | Как чеченцы присоединились к России / How the Chechens Joined Russia | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 75 | caucasus | Абрек Сулумбек / Abrek Sulumbek | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 76 | caucasus | Князь и Жера-Баба / The Prince and Zhera-Baba | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 77 | caucasus | Парчо / Parcho | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 78 | caucasus | Джантельг / Dzhantelg | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 79 | caucasus | Волшебный сноп, котёл и шапка-невидимка / The Magic Sheaf, Cauldron and Cap of Invisibility | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 80 | caucasus | Как братья лишились волшебных зеркала и ковра / How the Brothers Lost the Magic Mirror and Carpet | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 81 | caucasus | Отец, мачеха, брат и сестра / Father, Stepmother, Brother and Sister | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 82 | caucasus | Бедняк и змея / The Poor Man and the Snake | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 83 | caucasus | Помощник падчаха / The Padishah's Assistant | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 84 | caucasus | Поступок жены / The Wife's Deed | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 85 | caucasus | Моллакар и Панчи / Mollakar and Panchi | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 86 | caucasus | Находчивый кант / The Resourceful Kant | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 87 | caucasus | Знаток языков / The Knower of Tongues | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 88 | caucasus | Сын отважной женщины / The Son of a Brave Woman | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 89 | caucasus | Выбор девушки (гордый бедняк) / The Maiden's Choice (the Proud Poor Man) | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 90 | caucasus | Умное решение девушки / The Girl's Wise Decision | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 91 | caucasus | Три похитителя / Three Kidnappers | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 92 | caucasus | Бедняк / The Poor Man | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 93 | caucasus | Гусь-падчах / The Goose Padishah | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 94 | caucasus | Бедняк и мудрец / The Poor Man and the Sage | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 95 | caucasus | Судья / The Judge | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 96 | caucasus | Три брата и сармак / Three Brothers and the Sarmak | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 97 | caucasus | Спор о небылице / The Tall-Tale Contest | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 98 | caucasus | Кто больше? / Who Is Biggest? | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 99 | caucasus | Байнал-Бусани / Bainal-Busani | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 100 | caucasus | Тинин Висаг и Чёрный хожа / Tinin Visag and the Black Khozha | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 101 | caucasus | Сказка об охотнике и нарте / The Hunter and the Nart | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 102 | caucasus | Наказание тому, кто не расскажет сказку / The Punishment for Not Telling a Tale | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 103 | caucasus | Золотое перо и плётка / The Golden Feather and the Whip | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 104 | caucasus | Гезама Али и Толам-Аго / Gezama Ali and Tolam-Ago | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 105 | caucasus | Девочка и гам / The Girl and the Gam | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 106 | caucasus | Альтамар и ешап / Altamar and the Yeshap | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 107 | caucasus | Чончилг и ешап / Chonchilg and the Yeshap | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 108 | caucasus | Храбрее сармака / Braver than a Sarmak | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 109 | caucasus | Чудный мальчик, бросавший железный столб / The Wondrous Boy Who Threw the Iron Pillar | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 110 | caucasus | Тамаш-Таштамир / Tamash-Tashtamir | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 111 | caucasus | Мальчик с солнцем во лбу и месяцем между лопаток / The Boy with the Sun on His Brow and the Moon Between His Shoulders | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 112 | caucasus | Двадцать муталимов и двадцать первый мулла / Twenty Mutalims and the Twenty-First Mullah | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 113 | caucasus | Охотник / The Hunter | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 114 | caucasus | Как сын старика переспорил дочь падчаха / How the Old Man's Son Outwitted the Padishah's Daughter | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 115 | caucasus | Как победили чёрного ногайца / How the Black Nogai Was Defeated | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 116 | caucasus | Ахкепиг / Akhkepig | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 117 | caucasus | Гомбот и его жена / Gombot and His Wife | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 118 | caucasus | Гам / The Gam | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 119 | caucasus | Нет ничего лучше хорошей жены / Nothing Is Better than a Good Wife | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 120 | caucasus | Нет ничего лучше хорошей жены, нет ничего хуже плохой / Nothing Better than a Good Wife, Nothing Worse than a Bad One | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 121 | caucasus | Умная девушка / The Clever Girl | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 122 | caucasus | Умная невестка / The Clever Daughter-in-Law | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 123 | caucasus | Сын бедняка / The Poor Man's Son | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 124 | caucasus | Вдовий сын / The Widow's Son | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 125 | caucasus | Курдюк / The Fat Tail | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 126 | caucasus | Вор Малсаг и храбрец Малсаг / Malsag the Thief and Malsag the Brave | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 127 | caucasus | Как обманули сармака / How the Sarmak Was Tricked | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 128 | caucasus | Небылица / A Tall Tale | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 129 | caucasus | Три брата / The Three Brothers | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 130 | caucasus | Чёрный хожа / The Black Khozha | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 131 | caucasus | Семеро товарищей / The Seven Companions | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 132 | caucasus | Сын нарта / The Nart's Son | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 133 | caucasus | Князь Тепсырко и вдовий сын Жосарко / Prince Tepsyrko and the Widow's Son Zhosarko | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 134 | caucasus | Тимар / Timar | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 135 | caucasus | Как у Силаймы нос оторвали / How Silaima Lost His Nose | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 136 | caucasus | Прославленный лекарь / The Famous Healer | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 137 | caucasus | Мовсур и Магомед / Movsur and Magomed | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 138 | caucasus | Князь Бигалди / Prince Bigaldi | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 139 | caucasus | Золотые листья / The Golden Leaves | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 140 | caucasus | Чайтонг — сын медведя / Chaitong, the Bear's Son | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 141 | caucasus | Храбрый Пахтат / Brave Pakhtat | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 142 | caucasus | Сын вдовы Жатик / Zhatik, the Widow's Son | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 143 | caucasus | Мерий-Тотал / Meriy-Total | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 144 | caucasus | Тимар с обгоревшим боком / Timar with the Burnt Side | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 145 | caucasus | Храбрый кант / The Brave Kant | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 146 | caucasus | Алхаст и Малх-Азни / Alkhast and Malkh-Azni | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 147 | caucasus | Два друга / The Two Friends | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 148 | caucasus | Дочь князя Айзан и Муса / Princess Aizan and Musa | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 149 | caucasus | Младший зять падчаха / The Padishah's Youngest Son-in-Law | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 150 | caucasus | Как Уми стал «шейхом» / How Umi Became a 'Sheikh' | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 151 | caucasus | Овдилг / Ovdilg | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 152 | caucasus | О возникновении озера в Галан-Чоже / How the Lake at Galan-Chozh Came to Be | OK | no | modern edition — copyright may apply (librebook, mifoteka) |
| 153 | caucasus | Батыга-Шертко и поминки / Batyga-Shertko and the Memorial Feast | OK | no | modern edition — copyright may apply (azbyka) |
| 154 | caucasus | Клятва убийцы и пещера на том свете / The Killer's Oath and the Cave in the Other World | OK | no | modern edition — copyright may apply (azbyka) |
| 155 | caucasus | Мать вьюг и её семь сыновей / The Mother of Blizzards and Her Seven Sons | OK | no | modern edition — copyright may apply (azbyka, verigi) |
| 156 | caucasus | Сели-Сата и Млечный Путь / Seli-Sata and the Milky Way | OK | no | modern edition — copyright may apply (azbyka, verigi) |
| 157 | caucasus | Озеро Амка и бык / Lake Amka and the Bull | OK | no | modern edition — copyright may apply (azbyka) |
| 158 | caucasus | Сеска Солса, Селий Пиръа и мельница / Seska Solsa, Seliy Pira and the Mill | OK | no | modern edition — copyright may apply (chechenlaw) |
| 159 | caucasus | Как родился Сеска Солса / How Seska Solsa Was Born | OK | no | modern edition — copyright may apply (chechenlaw) |
| 160 | caucasus | Гибель нарт-орстхойцев и голубь Солсы / The Fall of the Nart-Orstkhoi and Solsa's Dove | OK | no | modern edition — copyright may apply (chechenlaw) |
| 161 | caucasus | Жербаба и уход Сеска Солсы / Zherbaba and the Departure of Seska Solsa | OK | no | modern edition — copyright may apply (chechenlaw) |
| 162 | caucasus | Ингушские имена звёзд и их мифы / Ingush Star Names and Their Myths | OK | no | modern edition — copyright may apply (azbyka, verigi) |
| 163 | caucasus | Почему Сеска Солса стал одноглазым / Why Seska Solsa Became One-Eyed | OK | no | modern edition — copyright may apply (books.yandex) |
| 164 | caucasus | Скала Сеска-Солсы на Цей-Ломе / Seska-Solsa's Rock on Tsey-Loam | OK | no | modern edition — copyright may apply (rulit) |
| 165 | caucasus | Калой-Кант и кабардинский князь / Kaloy-Kant and the Kabardian Prince | OK | no | modern edition — copyright may apply (ghalghay, rulit) |
| 166 | caucasus | Суд Тантала и башня Ольгетты / Tantal's Judgement and the Tower of Olgetta | OK | no | modern edition — copyright may apply (rulit) |
| 167 | caucasus | Нахчо — младший сын шамского князя / Nakhcho, Youngest Son of the Prince of Sham | OK | no | modern edition — copyright may apply (oldcancer) |
| 168 | caucasus | Как калмыки ушли с чеченской плоскости / How the Kalmyks Left the Chechen Plain | OK | no | modern edition — copyright may apply (oldcancer) |
| 169 | caucasus | Гнездо на копье и молоко через край / The Nest on the Spear and Milk over the Brim | OK | no | modern edition — copyright may apply (oldcancer) |
| 170 | caucasus | Нарты Наур и Гожак / The Narts Naur and Gozhak | OK | no | modern edition — copyright may apply (oldcancer) |
| 171 | caucasus | Термаол, первый проповедник ислама / Termaol, the First Preacher of Islam | OK | no | modern edition — copyright may apply (oldcancer) |
| 172 | caucasus | Шейх Берса и тридцать кабаньих грудинок / Sheikh Bersa and the Thirty Boar Briskets | OK | no | modern edition — copyright may apply (oldcancer) |
| 173 | caucasus | Забытая икона / The Forgotten Icon | OK | no | modern edition — copyright may apply (oldcancer) |
| 174 | caucasus | Три ауховца и три кумыкских фразы / Three Aukhovites and Three Kumyk Phrases | OK | no | modern edition — copyright may apply (oldcancer) |
| 175 | caucasus | Песня о Хамзате / The Song of Hamzat | OK | no | modern edition — copyright may apply (chechenlaw) |
| 176 | caucasus | Песня об Эль-Мурзе / The Song of El-Murza | OK | no | modern edition — copyright may apply (chechenlaw) |
| 177 | caucasus | Пророк Сулейман, птица Анкаа и филин / The Prophet Suleiman, the Bird Anka and the Owl | OK | no | modern edition — copyright may apply (chechenlaw) |
| 178 | caucasus | Медведица и медвежата / The She-Bear and Her Cubs | OK | no | modern edition — copyright may apply (chechenlaw) |
| 179 | caucasus | Церковь фиренгов у Галанчожского озера / The Church of the Firengs by Lake Galanchozh | OK | no | modern edition — copyright may apply (chechenlaw) |
| 180 | caucasus | Как Сосруко добыл красавицу Бадах / How Sosruko Won the Beauty Badakh | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 181 | caucasus | Сосруко и Адиюх / Sosruko and Adiyukh | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 182 | caucasus | Как Бадыноко и Сосруко охотились / How Badynoko and Sosruko Went Hunting | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 183 | caucasus | Как Бадыноко победил одноглазого великана / How Badynoko Defeated the One-Eyed Giant | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 184 | caucasus | Бадыноко и Шужей / Badynoko and Shuzhey | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 185 | caucasus | Как Бадыноко ввёл новый обычай / How Badynoko Brought In a New Custom | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 186 | caucasus | Как Батараз убил дракона / How Bataraz Slew the Dragon | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 187 | caucasus | Как Батараз заставил великана плясать / How Bataraz Made the Giant Dance | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 188 | caucasus | Как Тлепш смастерил клещи / How Tlepsh Made the Tongs | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 189 | caucasus | Железные ноги Тлепша / Tlepsh's Iron Legs | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 190 | caucasus | Золотое дерево / The Golden Tree | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 191 | caucasus | Как Уазырмес спас нартов от голода / How Wazyrmes Saved the Narts from Famine | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 192 | caucasus | Как нарты освободили Сатаней / How the Narts Freed Satanei | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 193 | caucasus | Как Малечипх и Пануко плясали удж / How Malechipkh and Panuko Danced the Udzh | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 194 | caucasus | Как Куйцук работал у иныжа / How Kuytsuk Worked for the Inyzh | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 195 | caucasus | Как Куйцук помог нартам перекочевать / How Kuytsuk Helped the Narts Move | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 196 | caucasus | Шауей и неизвестный гость / Shauey and the Unknown Guest | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 197 | caucasus | Сказание о Даханаго / The Tale of Dakhanago | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 198 | caucasus | Клятва ежихи / The Hedgehog's Vow | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 199 | caucasus | Как аукнется, так и откликнется / As You Call, So Comes the Echo | OK | no | modern edition — copyright may apply (adyghe.ru) |
| 200 | caucasus | Нормэрышхо — большой Нормэр / Normeryshkho, the Great Normer | OK | no | modern edition — copyright may apply (mifoteka) |
| 201 | caucasus | Что такое «добрый час» и «недобрый час» / What Is a 'Good Hour' and a 'Bad Hour' | OK | no | modern edition — copyright may apply (mifoteka) |
| 202 | caucasus | Куйжий и эфенди / Kuyzhiy and the Efendi | OK | no | modern edition — copyright may apply (mifoteka) |
| 203 | caucasus | Кошелёк ногайки / The Nogai Woman's Purse | OK | no | modern edition — copyright may apply (mifoteka) |
| 204 | caucasus | Человек, который купил ум / The Man Who Bought Wisdom | OK | no | modern edition — copyright may apply (mifoteka) |
| 205 | caucasus | Смелая дочь / The Courageous Daughter | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 23 | — |
| 206 | caucasus | Падчерица / The Stepdaughter | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 24 | — |
| 207 | caucasus | Волшебные животные и волшебная дубинка / The Magic Animals and the Magic Cudgel | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 25 | — |
| 208 | caucasus | Прекрасная Елена / The Beautiful Helena | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 26 | — |
| 209 | caucasus | Одноглазый великан на Эльбрусе / The One-Eyed Giant on Elbrus | OK | no | — |
| 210 | caucasus | Гадальщица Бабочка / Fortune-teller Butterfly | OK | no | modern edition — copyright may apply (mifoteka) |
| 211 | caucasus | Муж и жена / Husband and Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 212 | caucasus | Кто сильнее? / Who Is Strongest? | OK | no | modern edition — copyright may apply (mifoteka) |
| 213 | caucasus | Как женщина проучила трёх мужчин / How a Woman Taught Three Men a Lesson | OK | no | modern edition — copyright may apply (mifoteka) |
| 214 | caucasus | Умная жена / The Clever Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 215 | caucasus | Как бедняк выиграл имущество богача / How a Poor Man Won a Rich Man's Fortune | OK | no | modern edition — copyright may apply (mifoteka) |
| 216 | caucasus | Как обманули хаджи / How the Hajji Was Tricked | OK | no | modern edition — copyright may apply (mifoteka) |
| 217 | caucasus | Дележ по-божески / Dividing God's Way | OK | no | modern edition — copyright may apply (mifoteka) |
| 218 | caucasus | Бедняк и бог / The Poor Man and God | OK | no | modern edition — copyright may apply (mifoteka) |
| 219 | caucasus | Трудовые деньги / Hard-Earned Money | OK | no | modern edition — copyright may apply (mifoteka) |
| 220 | caucasus | Лягушка / The Frog | OK | no | modern edition — copyright may apply (mifoteka) |
| 221 | caucasus | Три совета / Three Pieces of Advice | OK | no | modern edition — copyright may apply (mifoteka) |
| 222 | caucasus | Запасливый муравей / The Provident Ant | OK | no | modern edition — copyright may apply (mifoteka) |
| 223 | caucasus | Старый кот и мыши / The Old Cat and the Mice | OK | no | modern edition — copyright may apply (mifoteka) |
| 224 | caucasus | Петух-хвастун / The Boastful Rooster | OK | no | modern edition — copyright may apply (mifoteka) |
| 225 | caucasus | Комар-зазнайка / The Conceited Mosquito | OK | no | modern edition — copyright may apply (mifoteka) |
| 226 | caucasus | Волк и перепёлка / The Wolf and the Quail | OK | no | modern edition — copyright may apply (mifoteka) |
| 227 | caucasus | Старый козёл и волк / The Old Billy Goat and the Wolf | OK | no | modern edition — copyright may apply (mifoteka) |
| 228 | caucasus | Тотрадз / Totradz | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 229 | caucasus | Дзерасса / Dzerassa | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 230 | caucasus | Зуб Хамыца / Khamyts's Tooth | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 231 | caucasus | Сослан и Аза-дерево / Soslan and the Aza Tree | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 232 | caucasus | Сафа и цепь очага / Safa and the Hearth Chain | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 233 | caucasus | Как Бог создал человека / How God Created Man | OK | no | modern edition — copyright may apply (mifoteka) |
| 234 | caucasus | Уасгерги и Татартуп / Uasgergi and Tatartup | OK | no | modern edition — copyright may apply (mifoteka) |
| 235 | caucasus | Барс ищет супротивника / The Leopard Seeks a Rival | OK | no | modern edition — copyright may apply (mifoteka) |
| 236 | caucasus | Неразумный сын / The Foolish Son | OK | no | modern edition — copyright may apply (mifoteka) |
| 237 | caucasus | Волшебный баран / The Helpful Ram | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 29 | — |
| 238 | caucasus | Серый волк и барсук / The Grey Wolf and the Badger | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 43 ("The Grey Wolf") | — |
| 239 | caucasus | Соседи / Neighbouring Camps | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 44 | — |
| 240 | caucasus | Богач и бедняк / The Rich Man and the Poor Man | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 28 | — |
| 241 | caucasus | Смерть Хамыца / The Death of Khamyts | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 47 | — |
| 242 | caucasus | Батрадз мстит за отца / Batradz Avenges His Father | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 48 | — |
| 243 | caucasus | Батрадз и Бадзанаг / Batradz and Badzanag | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 50 | — |
| 244 | caucasus | Сослан, Елтаган и Муккара / Soslan, Eltaghan and Mukkara | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 51 | — |
| 245 | caucasus | Зуб Аркыза / The Tooth of Arqys | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 52 | — |
| 246 | caucasus | Урызмаг и Сослан / Urysmag and Soslan | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 53 | — |
| 247 | caucasus | Рождение Сатаны / The Birth of Satana | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 54 | — |
| 248 | caucasus | Беличья шкурка / The Squirrel Skin | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 55 | — |
| 249 | caucasus | Охотник у пещеры Амирана / The Hunter at Amiran's Cave | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 63 (Ossetian variant) | — |
| 250 | caucasus | Барс, медведь и волк / The Leopard, the Bear and the Wolf | OK | no | modern edition — copyright may apply (mifoteka) |
| 251 | caucasus | Лиса и лисёнок / The Fox and the Fox Cub | OK | no | modern edition — copyright may apply (mifoteka) |
| 252 | caucasus | Медведь, волк и лиса: четыре хлеба / The Bear, the Wolf and the Fox: Four Loaves | OK | no | modern edition — copyright may apply (mifoteka) |
| 253 | caucasus | Состарившийся кот / The Aged Cat | OK | no | modern edition — copyright may apply (mifoteka) |
| 254 | caucasus | Баран и заяц / The Ram and the Hare | OK | no | modern edition — copyright may apply (mifoteka) |
| 255 | caucasus | Мышь, муравей и блоха / The Mouse, the Ant and the Flea | OK | no | modern edition — copyright may apply (mifoteka) |
| 256 | caucasus | Волк и телёнок / The Wolf and the Calf | OK | no | modern edition — copyright may apply (mifoteka) |
| 257 | caucasus | Олень, медведь и два ежа / The Deer, the Bear and Two Hedgehogs | OK | no | modern edition — copyright may apply (mifoteka) |
| 258 | caucasus | Летучая мышь и кузнечик / The Bat and the Grasshopper | OK | no | modern edition — copyright may apply (mifoteka) |
| 259 | caucasus | Человек и ёж / The Man and the Hedgehog | OK | no | modern edition — copyright may apply (mifoteka) |
| 260 | caucasus | Больной волк и лиса / The Sick Wolf and the Fox | OK | no | modern edition — copyright may apply (mifoteka) |
| 261 | caucasus | Ворона и сова / The Crow and the Owl | OK | no | modern edition — copyright may apply (mifoteka) |
| 262 | caucasus | Солнце и лягушка / The Sun and the Frog | OK | no | modern edition — copyright may apply (mifoteka) |
| 263 | caucasus | Бездомная собака / The Homeless Dog | OK | no | modern edition — copyright may apply (mifoteka) |
| 264 | caucasus | Коза и заяц / The Goat and the Hare | OK | no | modern edition — copyright may apply (mifoteka) |
| 265 | caucasus | Как мышь женилась / How the Mouse Got Married | OK | no | modern edition — copyright may apply (mifoteka) |
| 266 | caucasus | Благодарный человек / The Grateful Man | OK | no | modern edition — copyright may apply (mifoteka) |
| 267 | caucasus | Бедняк и хан-богач / The Poor Man and the Rich Khan | OK | no | modern edition — copyright may apply (mifoteka) |
| 268 | caucasus | Алдар и две его жены / The Aldar and His Two Wives | OK | no | modern edition — copyright may apply (mifoteka) |
| 269 | caucasus | Батрак великана / The Giant's Hired Man | OK | no | modern edition — copyright may apply (mifoteka) |
| 270 | caucasus | Девушка-сиротка / The Orphan Girl | OK | no | modern edition — copyright may apply (mifoteka) |
| 271 | caucasus | Дочь вдовы-ведуньи / The Daughter of the Widow-Wise-Woman | OK | no | modern edition — copyright may apply (mifoteka) |
| 272 | caucasus | Находчивые гости / The Perceptive Guests | OK | no | modern edition — copyright may apply (mifoteka) |
| 273 | caucasus | Гость и хозяева / The Guest and His Hosts | OK | no | modern edition — copyright may apply (mifoteka) |
| 274 | caucasus | Из вопросов алдара / From the Aldar's Questions | OK | no | modern edition — copyright may apply (mifoteka) |
| 275 | caucasus | Поп и жена алдара / The Priest and the Aldar's Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 276 | caucasus | Дурень Сонтхела и его жена / Sontkhela the Fool and His Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 277 | caucasus | Немой и глухонемой / The Mute and the Deaf-Mute | OK | no | modern edition — copyright may apply (mifoteka) |
| 278 | caucasus | Уасгерги и горец-бедняк / Uasgergi and the Poor Highlander | OK | no | modern edition — copyright may apply (mifoteka) |
| 279 | caucasus | Бог, Уасгерги и Никкола / God, Uasgergi and Nikkola | OK | no | modern edition — copyright may apply (mifoteka) |
| 280 | caucasus | Ацаны / The Atsans | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 281 | caucasus | Сасрыква и Адау / Sasrykva and the Adau | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 282 | caucasus | Спор судьбы с умом / The Dispute between Fate and Mind | OK | no | modern edition — copyright may apply (mifoteka) |
| 283 | caucasus | Курган / The Barrow | OK | no | modern edition — copyright may apply (mifoteka) |
| 284 | caucasus | Смелость зависит от случая / Courage Depends on Chance | OK | no | modern edition — copyright may apply (mifoteka) |
| 285 | caucasus | Дочь Солнца и Луны / The Daughter of the Sun and Moon | OK | no | modern edition — copyright may apply (larec-skazok) |
| 286 | caucasus | Козлёнок, ягнёнок и телёнок / The Kid, the Lamb and the Calf | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 42 (summary rewritten to follow the text) | — |
| 287 | caucasus | Куамачама / Kuamachama | OK | no | modern edition — copyright may apply (mifoteka) |
| 288 | caucasus | Ажвейпшаа и сова / Azhveipshaa and the Owl | OK | no | modern edition — copyright may apply (mifoteka) |
| 289 | caucasus | Пеструшка и мышь / The Speckled Bird and the Mouse | OK | no | modern edition — copyright may apply (mifoteka) |
| 290 | caucasus | Лиса и дрозд / The Fox and the Thrush | OK | no | modern edition — copyright may apply (mifoteka) |
| 291 | caucasus | Свинья / The Pig | OK | no | modern edition — copyright may apply (mifoteka) |
| 292 | caucasus | Два брата, жернов и ковёр / Two Brothers, the Millstone and the Carpet | OK | no | modern edition — copyright may apply (mifoteka) |
| 293 | caucasus | Мельник Кьяса / Kyasa the Miller | OK | no | modern edition — copyright may apply (mifoteka) |
| 294 | caucasus | Трое глухих / Three Deaf Men | OK | no | modern edition — copyright may apply (mifoteka) |
| 295 | caucasus | Сборщик податей и глупец / The Tax Collector and the Fool | OK | no | modern edition — copyright may apply (mifoteka) |
| 296 | caucasus | «Избави нас, боже, от чёрта-мужчины!» / 'Deliver Us, Lord, from the He-Devil!' | OK | no | modern edition — copyright may apply (mifoteka) |
| 297 | caucasus | Мачеха и падчерица / The Stepmother and the Stepdaughter | OK | no | modern edition — copyright may apply (mifoteka) |
| 298 | caucasus | Глупость — несчастье / Folly Is a Misfortune | OK | no | modern edition — copyright may apply (mifoteka) |
| 299 | caucasus | Враг не убил его / His Enemy Didn't Kill Him | OK | no | modern edition — copyright may apply (mifoteka) |
| 300 | caucasus | Абхаз и чёрт / The Abkhaz and the Devil | OK | no | modern edition — copyright may apply (mifoteka) |
| 301 | caucasus | Ложь (абхазская небылица) / Lies (an Abkhaz tall tale) | OK | no | modern edition — copyright may apply (mifoteka) |
| 302 | caucasus | Карча / Karcha | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 303 | caucasus | Два хана / Two Khans | OK | no | modern edition — copyright may apply (deti-online) |
| 304 | caucasus | Старик Женали и два хана / Old Zhenali and the Two Khans | OK | no | modern edition — copyright may apply (kavkaz-uzel) |
| 305 | caucasus | Верный сын / The Faithful Son | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 31 | — |
| 306 | caucasus | Эцемей, сын Эцея / Etsemej, Son of Etsej | OK | no | — |
| 307 | caucasus | Спор орлов и саранчи / The Quarrel of the Eagles and the Locusts | OK | no | modern edition — copyright may apply (litlife) |
| 308 | caucasus | Змея, ласточка и комар / The Snake, the Swallow and the Mosquito | OK | no | modern edition — copyright may apply (litlife) |
| 309 | caucasus | Как ёж выдумал серп / How the Hedgehog Invented the Sickle | OK | no | modern edition — copyright may apply (litlife) |
| 310 | caucasus | Наглый петух / The Impudent Rooster | OK | no | modern edition — copyright may apply (litlife) |
| 311 | caucasus | Коза-лгунья и заяц / The Lying Goat and the Hare | OK | no | modern edition — copyright may apply (litlife) |
| 312 | caucasus | Змея и путник / The Snake and the Traveller | OK | no | modern edition — copyright may apply (litlife) |
| 313 | caucasus | Сирота и лиса / The Orphan and the Fox | OK | no | modern edition — copyright may apply (litlife) |
| 314 | caucasus | Хозяин дома, крытого синей жестью / The Master of the House with the Blue Tin Roof | OK | no | modern edition — copyright may apply (litlife) |
| 315 | caucasus | Бык с озера / The Bull from the Lake | OK | no | modern edition — copyright may apply (litlife) |
| 316 | caucasus | Красная корова / The Red Cow | OK | no | modern edition — copyright may apply (litlife) |
| 317 | caucasus | Кара-Батыр и Синий конь / Kara-Batyr and the Blue Horse | OK | no | modern edition — copyright may apply (litlife) |
| 318 | caucasus | Бозакбай и Кызанбай / Bozakbai and Kyzanbai | OK | no | modern edition — copyright may apply (litlife) |
| 319 | caucasus | Шестиногий конь / The Six-Legged Horse | OK | no | modern edition — copyright may apply (litlife) |
| 320 | caucasus | Прекрасный юноша в змеиной шкуре / The Handsome Youth in a Snake Skin | OK | no | modern edition — copyright may apply (litlife) |
| 321 | caucasus | Союн-Али и Алсувдыр / Soyun-Ali and Alsuvdyr | OK | no | modern edition — copyright may apply (litlife) |
| 322 | caucasus | Сон / The Dream | OK | no | modern edition — copyright may apply (litlife) |
| 323 | caucasus | Безрукая девушка / The Armless Girl | OK | no | modern edition — copyright may apply (litlife) |
| 324 | caucasus | Три девушки и четыре елмавыза / Three Girls and Four Yelmavyz | OK | no | modern edition — copyright may apply (litlife) |
| 325 | caucasus | Падишах Алтынтай / Padishah Altyntai | OK | no | modern edition — copyright may apply (litlife) |
| 326 | caucasus | Три брата-близнеца / Three Brothers | OK | no | modern edition — copyright may apply (litlife) |
| 327 | caucasus | Омирузак / Omiruzak | OK | no | modern edition — copyright may apply (litlife) |
| 328 | caucasus | Луноликая девушка / The Moon-Faced Girl | OK | no | modern edition — copyright may apply (litlife) |
| 329 | caucasus | Старик и Мать воды / The Old Man and the Water Mother | OK | no | modern edition — copyright may apply (litlife) |
| 330 | caucasus | Белое Ухо / White Ear | OK | no | modern edition — copyright may apply (litlife) |
| 331 | caucasus | Семеро братьев / Seven Brothers | OK | no | modern edition — copyright may apply (litlife) |
| 332 | caucasus | Сказка об одном джигите / The Tale of a Certain Jigit | OK | no | modern edition — copyright may apply (litlife) |
| 333 | caucasus | Солнце — брат луны / The Sun Is the Moon's Brother | OK | no | modern edition — copyright may apply (litlife) |
| 334 | caucasus | Находчивый бедняк / The Resourceful Poor Man | OK | no | modern edition — copyright may apply (litlife) |
| 335 | caucasus | Старик туркмен и старик ногаец / The Old Turkmen and the Old Nogai | OK | no | modern edition — copyright may apply (litlife) |
| 336 | caucasus | Шахаржан / Shakharzhan | OK | no | modern edition — copyright may apply (litlife) |
| 337 | caucasus | О женщине, которой не вынес даже аздаа / The Woman Not Even an Azdaa Could Stand | OK | no | modern edition — copyright may apply (litlife) |
| 338 | caucasus | Албаслы и девочка / The Albasly and the Little Girl | OK | no | modern edition — copyright may apply (litlife) |
| 339 | caucasus | Хитрый мельник и старик ногаец / The Crafty Miller and the Old Nogai | OK | no | modern edition — copyright may apply (litlife) |
| 340 | caucasus | Сорок небылиц / Forty Tall Tales | OK | no | modern edition — copyright may apply (litlife) |
| 341 | caucasus | Молла и овца / The Molla and the Sheep | OK | no | modern edition — copyright may apply (litlife) |
| 342 | caucasus | Ум старика / An Old Man's Wisdom | OK | no | modern edition — copyright may apply (litlife) |
| 343 | caucasus | Брат-судья / The Brother Who Was a Judge | OK | no | modern edition — copyright may apply (litlife) |
| 344 | caucasus | Злой язык / The Evil Tongue | OK | no | modern edition — copyright may apply (litlife) |
| 345 | caucasus | Фатима / Fatima | OK | no | modern edition — copyright may apply (scylax) |
| 346 | caucasus | Как бедняк делил курицу / How the Poor Man Divided the Hen | error:SSLError https://scylax.one/narodnye/balkarskie-i-karachaevskie-skazki/kak-bednyak-delil-kuricu/ | no | modern edition — copyright may apply (scylax) |
| 347 | caucasus | Хитрый гость / The Cunning Guest | OK | no | modern edition — copyright may apply (scylax) |
| 348 | caucasus | Лиса, перепёлка и пироги / The Fox, the Quail and the Pies | OK | no | modern edition — copyright may apply (scylax) |
| 349 | caucasus | Медведь и собака / The Bear and the Dog | OK | no | modern edition — copyright may apply (scylax) |
| 350 | caucasus | Мудрый старик / The Wise Old Man | error:SSLError https://scylax.one/narodnye/balkarskie-i-karachaevskie-skazki/mudryy-starik/ | no | modern edition — copyright may apply (scylax) |
| 351 | caucasus | Намыс / Namys | OK | no | modern edition — copyright may apply (scylax) |
| 352 | caucasus | Ненадёжный друг / An Unreliable Friend | error:SSLError https://scylax.one/narodnye/balkarskie-i-karachaevskie-skazki/nenadyozhnyy-drug/ | no | modern edition — copyright may apply (scylax) |
| 353 | caucasus | Счастье, ум и богатство / Happiness, Wisdom and Wealth | OK | no | modern edition — copyright may apply (scylax) |
| 354 | caucasus | Смышлёный мальчик / The Clever Boy | error:SSLError https://scylax.one/narodnye/balkarskie-i-karachaevskie-skazki/smyshlyonyy-malchik/ | no | modern edition — copyright may apply (scylax) |
| 355 | caucasus | Суд зверей / The Animals' Court | OK | no | modern edition — copyright may apply (scylax) |
| 356 | caucasus | Умар сын Умара / Umar Son of Umar | OK | no | modern edition — copyright may apply (scylax) |
| 357 | caucasus | Алакез / Alakez | error:SSLError https://scylax.one/narodnye/balkarskie-i-karachaevskie-skazki/alakez/ | no | modern edition — copyright may apply (scylax) |
| 358 | caucasus | Темир-Болат / Temir-Bolat | OK | no | modern edition — copyright may apply (scylax) |
| 359 | caucasus | Как бедняк отказался от богатства / How the Poor Man Refused Riches | OK | no | modern edition — copyright may apply (mifoteka) |
| 360 | caucasus | Как бедняк аллаха искал / How the Poor Man Went Looking for God | OK | no | modern edition — copyright may apply (mifoteka) |
| 361 | caucasus | Секрет молодости / The Secret of Youth | OK | no | modern edition — copyright may apply (mifoteka) |
| 362 | caucasus | Краше то, что тебе нравится / The Fairest Is What You Love | OK | no | modern edition — copyright may apply (mifoteka) |
| 363 | caucasus | Щедрый и Жадный / The Generous Man and the Greedy Man | OK | no | modern edition — copyright may apply (mifoteka) |
| 364 | caucasus | Неблагодарный богач и великодушные звери / The Ungrateful Rich Man and the Generous Beasts | OK | no | modern edition — copyright may apply (mifoteka) |
| 365 | caucasus | Синяя птица счастья / The Blue Bird of Happiness | OK | no | modern edition — copyright may apply (kavkaz-uzel) |
| 366 | caucasus | Птица Гуглахай и её птенцы / The Guglakhay Bird and Her Chicks | OK | no | modern edition — copyright may apply (kavkaz-uzel) |
| 367 | caucasus | Волшебный колодец / The Magic Well | OK | no | modern edition — copyright may apply (kazka.ru) |
| 368 | caucasus | Мусил-Мухад и воры / Musil-Mukhad and the Thieves | OK | no | modern edition — copyright may apply (kavkaz-uzel) |
| 369 | caucasus | Как проверяется дружба / How Friendship Is Tested | OK | no | modern edition — copyright may apply (deti-online) |
| 370 | caucasus | Зайцы Музаира / Muzair's Hares | OK | no | modern edition — copyright may apply (kavkaz-uzel) |
| 371 | caucasus | Три желания / The Three Wishes | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 15 | — |
| 372 | caucasus | Кому принадлежит невеста? / To Whom Does the Bride Belong? | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 20 | — |
| 373 | caucasus | Обманутый лис / The Cheated Fox | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 33 | — |
| 374 | caucasus | Птица, умная для других / The Bird Who Was Clever for Others | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 34 | — |
| 375 | caucasus | Осёл и верблюд / The Donkey and the Camel | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 35 | — |
| 376 | caucasus | Лиса и журавль / The Fox and the Crane | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 36 | — |
| 377 | caucasus | Медведь, волк и лиса / The Bear, the Wolf and the Fox | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 37 | — |
| 378 | caucasus | Заяц и лев / The Hare and the Lion | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 38 | — |
| 379 | caucasus | Лиса, волк и мул / The Fox, the Wolf and the Mule | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 39 | — |
| 380 | caucasus | Волк, медведь, лиса и осёл / The Wolf, the Bear, the Fox and the Donkey | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 40 | — |
| 381 | caucasus | Красная рыба / The Red Fish | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 18 | — |
| 382 | caucasus | Кто глупее? / Who Is the Most Stupid? | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 76 | — |
| 383 | caucasus | Глупая жена / The Stupid Wife | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 77 | — |
| 384 | caucasus | Букучихан / Bukuchikhan | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 12 | — |
| 385 | caucasus | Царица-дева / The Virgin Queen | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 14 | — |
| 386 | caucasus | Балай и Боти / Balai and Boti | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 13 | — |
| 387 | caucasus | Сартанки / Sartanki | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 19 | — |
| 388 | caucasus | Кичув / Kichuv | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 27 | — |
| 389 | caucasus | Лиса и змея / The Fox and the Snake | OK | no | modern edition — copyright may apply (mifoteka) |
| 390 | caucasus | Как волк решил покаяться / How the Wolf Decided to Repent | OK | no | modern edition — copyright may apply (mifoteka) |
| 391 | caucasus | Шудукай / Shudukai | OK | no | modern edition — copyright may apply (mifoteka) |
| 392 | caucasus | Лиса и верблюд / The Fox and the Camel | OK | no | modern edition — copyright may apply (mifoteka) |
| 393 | caucasus | Ворона и воронёнок / The Crow and Her Chick | OK | no | modern edition — copyright may apply (mifoteka) |
| 394 | caucasus | Человек и птица / The Man and the Bird | OK | no | modern edition — copyright may apply (mifoteka) |
| 395 | caucasus | Волк и дятел / The Wolf and the Woodpecker | OK | no | modern edition — copyright may apply (mifoteka) |
| 396 | caucasus | Находчивый осёл / The Resourceful Donkey | OK | no | modern edition — copyright may apply (mifoteka) |
| 397 | caucasus | Лиса и гусь / The Fox and the Goose | OK | no | modern edition — copyright may apply (mifoteka) |
| 398 | caucasus | Гордая мышь / The Proud Mouse | OK | no | modern edition — copyright may apply (mifoteka) |
| 399 | caucasus | Лиса и барсук / The Fox and the Badger | OK | no | modern edition — copyright may apply (mifoteka) |
| 400 | caucasus | Осёл и волк / The Donkey and the Wolf | OK | no | modern edition — copyright may apply (mifoteka) |
| 401 | caucasus | Лиса и перепёлка / The Fox and the Quail | OK | no | modern edition — copyright may apply (mifoteka) |
| 402 | caucasus | Как лиса увидела луну / How the Fox Saw the Moon | OK | no | modern edition — copyright may apply (mifoteka) |
| 403 | caucasus | Кинь птенца, а то дерево срублю / Throw Down a Chick or I'll Chop the Tree Down | OK | no | modern edition — copyright may apply (mifoteka) |
| 404 | caucasus | Кот и мыши / The Cat and the Mice | OK | no | modern edition — copyright may apply (mifoteka) |
| 405 | caucasus | Кукушка и птицы / The Cuckoo and the Birds | OK | no | modern edition — copyright may apply (mifoteka) |
| 406 | caucasus | Лев, волк и лиса / The Lion, the Wolf and the Fox | OK | no | modern edition — copyright may apply (mifoteka) |
| 407 | caucasus | Волк, лиса и собака / The Wolf, the Fox and the Dog | OK | no | modern edition — copyright may apply (mifoteka) |
| 408 | caucasus | Жадный волк и лиса / The Greedy Wolf and the Fox | OK | no | modern edition — copyright may apply (mifoteka) |
| 409 | caucasus | Лесник Гелега / Gelega the Forester | OK | no | modern edition — copyright may apply (mifoteka) |
| 410 | caucasus | Два упрямца и разбойники / Two Stubborn Men and the Robbers | OK | no | modern edition — copyright may apply (mifoteka) |
| 411 | caucasus | Шейх из Ботлиха / The Sheikh of Botlikh | OK | no | modern edition — copyright may apply (mifoteka) |
| 412 | caucasus | Два путника / Two Travellers | OK | no | modern edition — copyright may apply (mifoteka) |
| 413 | caucasus | Как царь Гусь из крепости Казан в город Хурджин переходил / How King Goose Moved from Fort Kazan to the City of Khurjin | OK | no | modern edition — copyright may apply (mifoteka) |
| 414 | caucasus | Ханская дочь-затворница / The Khan's Secluded Daughter | OK | no | modern edition — copyright may apply (mifoteka) |
| 415 | caucasus | Хан и мудрая девушка / The Khan and the Wise Girl | OK | no | modern edition — copyright may apply (mifoteka) |
| 416 | caucasus | Как сын богача родил телёнка / How the Rich Man's Son Gave Birth to a Calf | OK | no | modern edition — copyright may apply (mifoteka) |
| 417 | caucasus | Кто ловчее? / Who Is the Cleverer? | OK | no | modern edition — copyright may apply (mifoteka) |
| 418 | caucasus | Три вора / Three Thieves | OK | no | modern edition — copyright may apply (mifoteka) |
| 419 | caucasus | Испытание друзей / A Test of Friends | OK | no | modern edition — copyright may apply (mifoteka) |
| 420 | caucasus | Как бедняк женился на ханской дочери / How a Poor Man Married the Khan's Daughter | OK | no | modern edition — copyright may apply (mifoteka) |
| 421 | caucasus | Кто самый ленивый? / Who Is the Laziest? | OK | no | modern edition — copyright may apply (mifoteka) |
| 422 | caucasus | Испытание молодого вора / The Young Thief's Test | OK | no | modern edition — copyright may apply (mifoteka) |
| 423 | caucasus | Приговор кадия / The Qadi's Verdict | OK | no | modern edition — copyright may apply (mifoteka) |
| 424 | caucasus | Богачу не подобает быть мелочным / A Rich Man Shouldn't Be Petty | OK | no | modern edition — copyright may apply (mifoteka) |
| 425 | caucasus | Мулла и его жена / The Mulla and His Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 426 | caucasus | Гергебилец и цудахарец / The Man from Gergebil and the Man from Tsudakhar | OK | no | modern edition — copyright may apply (mifoteka) |
| 427 | caucasus | Как отгадывали сон хана / How the Khan's Dream Was Interpreted | OK | no | modern edition — copyright may apply (mifoteka) |
| 428 | caucasus | Крестьянин и медник / The Peasant and the Coppersmith | OK | no | modern edition — copyright may apply (mifoteka) |
| 429 | caucasus | Старик, сажающий дерево / The Old Man Planting a Tree | OK | no | modern edition — copyright may apply (mifoteka) |
| 430 | caucasus | Лёд и солнце / The Ice and the Sun | OK | no | modern edition — copyright may apply (mifoteka) |
| 431 | caucasus | Богач и работник / The Rich Man and the Labourer | OK | no | modern edition — copyright may apply (mifoteka) |
| 432 | caucasus | Как воспитываются неблагодарные сыновья / How Ungrateful Sons Are Raised | OK | no | modern edition — copyright may apply (mifoteka) |
| 433 | caucasus | Купец и носильщик / The Merchant and the Porter | OK | no | modern edition — copyright may apply (mifoteka) |
| 434 | caucasus | Как молла Насреддин учился в школе / How Molla Nasreddin Went to School | OK | no | modern edition — copyright may apply (mifoteka) |
| 435 | caucasus | Молла Насреддин и вор / Molla Nasreddin and the Thief | OK | no | modern edition — copyright may apply (mifoteka) |
| 436 | caucasus | Как Насреддин делил баранов / How Nasreddin Divided the Sheep | OK | no | modern edition — copyright may apply (mifoteka) |
| 437 | caucasus | Насреддин и жена / Nasreddin and His Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 438 | caucasus | Насреддин и муталимы / Nasreddin and the Students | OK | no | modern edition — copyright may apply (mifoteka) |
| 439 | caucasus | Насреддин и кадий / Nasreddin and the Qadi | OK | no | modern edition — copyright may apply (mifoteka) |
| 440 | caucasus | Как Насреддина хотели убить / How They Tried to Kill Nasreddin | OK | no | modern edition — copyright may apply (mifoteka) |
| 441 | caucasus | Как Насреддин помог бедняку / How Nasreddin Helped a Poor Man | OK | no | modern edition — copyright may apply (mifoteka) |
| 442 | caucasus | Как Насреддин был дибиром / How Nasreddin Was Dibir | OK | no | modern edition — copyright may apply (mifoteka) |
| 443 | caucasus | Насреддин приглашает гостя / Nasreddin Invites a Guest | OK | no | modern edition — copyright may apply (mifoteka) |
| 444 | caucasus | Как Насреддин покупал ковёр / How Nasreddin Bought a Carpet | OK | no | modern edition — copyright may apply (mifoteka) |
| 445 | caucasus | Почему Насреддин плакал / Why Nasreddin Wept | OK | no | modern edition — copyright may apply (mifoteka) |
| 446 | caucasus | Как алим хотел обмануть Насреддина / How an Alim Tried to Trick Nasreddin | OK | no | modern edition — copyright may apply (mifoteka) |
| 447 | caucasus | Как Насреддин встречал конец света / How Nasreddin Met the End of the World | OK | no | modern edition — copyright may apply (mifoteka) |
| 448 | caucasus | Андиец и гость / The Andi Man and His Guest | OK | no | modern edition — copyright may apply (mifoteka) |
| 449 | caucasus | Андиец и больная жена / The Andi Man and His Sick Wife | OK | no | modern edition — copyright may apply (mifoteka) |
| 450 | caucasus | Картлос — прародитель картвелов / Kartlos, Forefather of the Georgians | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 451 | caucasus | Очокочи и Ткаши-мапа / Ochokochi and Tkashi-Mapa | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 452 | caucasus | Ерванд и Ерваз / Yervand and Yervaz | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 453 | caucasus | Арташес и Сатеник / Artashes and Satenik | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 454 | caucasus | Басат и Тепегёз / Basat and Tepegöz | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 455 | caucasus | Хызр и гора Бешбармаг / Khizr and Mount Beshbarmag | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 456 | caucasus | Рустам (удинская сказка, записанная в Ниже) / Rustam (an Udi Tale Recorded in Nij) | OK | no | modern edition — copyright may apply (udilang) |
| 457 | caucasus | Три брата и див (удинская сказка из Нижа) / Three Brothers and the Div (an Udi Tale from Nij) | OK | no | modern edition — copyright may apply (udilang) |
| 458 | caucasus | Ум и Счастье / Mind and Happiness | OK | no | modern edition — copyright may apply (fantlab, mifoteka) |
| 459 | caucasus | Всё, что дадите, Бог вернёт / Whatever You Give, God Returns | OK | no | modern edition — copyright may apply (fantlab, mifoteka) |
| 460 | caucasus | Старик и Азраил / The Old Man and Azrael | OK | no | modern edition — copyright may apply (mifoteka) |
| 461 | caucasus | Ложь и Правда / Lie and Truth | OK | no | modern edition — copyright may apply (mifoteka) |
| 462 | caucasus | Отец и сын / Father and Son | OK | no | modern edition — copyright may apply (mifoteka) |
| 463 | caucasus | Арсуман / Arsuman | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 16 | — |
| 464 | caucasus | Жеребёнок, коза и свинья / The Foal, the Goat and the Pig | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 32 | — |
| 465 | caucasus | Волк, лиса и верблюд / The Wolf, the Fox and the Camel | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 45 | — |
| 466 | caucasus | Задача / A Problem | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 78 | — |
| 467 | caucasus | Соляное поле / The Field of Salt | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 79 | — |
| 468 | caucasus | Мы — должен — три копейки / We — Owe — Three Kreutzers | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 80 | — |
| 469 | caucasus | Ослиное яйцо / The Donkey's Egg | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 82 | — |
| 470 | caucasus | Огненный конь / The Fire-Horse | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 30 | — |
| 471 | caucasus | Сказка о свинье / The Story of the Pig | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 10 | — |
| 472 | caucasus | Змея и крестьянин / The Serpent and the Peasant | OK | no | — |
| 473 | caucasus | Три наставления / The Three Precepts | OK | no | — |
| 474 | caucasus | Хитрый старик и деви / The Cunning Old Man and the Devi | OK | no | — |
| 475 | caucasus | Пастух-судья / The Shepherd Judge | OK | no | — |
| 476 | caucasus | Царь и мудрец / The King and the Sage | OK | no | — |
| 477 | caucasus | Царский сын / The King's Son | OK | no | — |
| 478 | caucasus | Зубы и беззубый / Teeth and No-Teeth | OK | no | — |
| 479 | caucasus | Каприз царицы / The Queen's Whim | OK | no | — |
| 480 | caucasus | Отцовское пророчество / The Father's Prophecy | OK | no | — |
| 481 | caucasus | Отшельник-философ / The Hermit Philosopher | OK | no | — |
| 482 | caucasus | Остроумный ответ / A Witty Answer | OK | no | — |
| 483 | caucasus | Одноглазый великан (мегрельский вариант) / The One-Eyed Giant (Mingrelian Variant) | OK | no | — |
| 484 | caucasus | Искусный вор / The Skilful Thief | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 73 | — |
| 485 | caucasus | Нахлебник / The Parasite | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 3 | — |
| 486 | caucasus | Земля своё возьмёт / The Earth Will Have Its Own | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 6 | — |
| 487 | caucasus | Золотоволосые дети / The Children with the Golden Locks | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 9 | — |
| 488 | caucasus | Два брата / The Two Brothers | OK | no | — |
| 489 | caucasus | Пастух и дитя удачи / The Shepherd and the Child of Fortune | OK | no | — |
| 490 | caucasus | Две потери / Two Losses | OK | no | — |
| 491 | caucasus | Царский советник / The King's Counsellor | OK | no | — |
| 492 | caucasus | Удача дурака / The Fool's Good Fortune | OK | no | — |
| 493 | caucasus | Верный слуга / The Faithful Servant | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 17 | — |
| 494 | caucasus | Золотая девушка / The Golden Maiden | OK | no | — |
| 495 | caucasus | Суженые судьбы / The Betrothed of Destiny | OK | no | — |
| 496 | caucasus | Невеста родника / The Bride of the Fountain | OK | no | — |
| 497 | caucasus | Трус-богатырь / The Coward-Hero | OK | no | — |
| 498 | caucasus | Волшебное кольцо / The Magic Ring | OK | no | — |
| 499 | caucasus | Глупец / The Idiot | OK | no | — |
| 500 | caucasus | Морская дева / The Maiden of the Sea | OK | no | — |
| 501 | caucasus | Женские хитрости / The Tricks of a Woman | OK | no | — |
| 502 | caucasus | Сальман и Ростом / Salman and Rostom | OK | no | — |
| 503 | caucasus | Воробей и двое детей / The Sparrow and the Two Children | OK | no | — |
| 504 | caucasus | Старуха и кошка / The Old Woman and the Cat | OK | no | — |
| 505 | caucasus | Советы Соломона / Solomon's Counsels | OK | no | — |
| 506 | caucasus | Соломон-псарь / Solomon the Kennelman | OK | no | — |
| 507 | caucasus | Отшельник и Соломон / Solomon and the Hermit | OK | no | — |
| 508 | caucasus | Замок из птичьих перьев / The Castle of Feathers | OK | no | — |
| 509 | caucasus | Младенец Александр / The Infant Alexander | OK | no | — |
| 510 | caucasus | Мать Александра и хлеб / Alexander's Mother and the Bread | OK | no | — |
| 511 | caucasus | Александр в стране праведных бедняков / Alexander and the Land of the Just Poor | OK | no | — |
| 512 | caucasus | Бугач-хан, сын Дирсе-хана / Boghach Khan, Son of Dirse Khan | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 513 | caucasus | Разграбление дома Салур-Казана / How Salur Kazan's House Was Pillaged | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 514 | caucasus | Бамсы Бейрек / Bamsi Beyrek of the Grey Horse | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 515 | caucasus | Пленение Уруза / How Prince Uruz Was Taken Prisoner | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 516 | caucasus | Дели Домрул / Wild Dumrul, Son of Dukha Koja | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 517 | caucasus | Кан Турали / Kan Turali, Son of Kanli Koja | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 518 | caucasus | Йигенек, сын Газылыг-Коджи / Yigenek, Son of Kazilik Koja | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 519 | caucasus | Эмрен, сын Бекиля / Emren, Son of Begil | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 520 | caucasus | Сегрек, сын Ушун-Коджи / Segrek, Son of Ushun Koja | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 521 | caucasus | Пленение Салур-Казана / How Salur Kazan Was Taken Prisoner | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 522 | caucasus | Смерть Бейрека / How Beyrek Died | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 523 | caucasus | Сын рыбака / The Fisherman's Son | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 1 | — |
| 524 | caucasus | Учитель и ученик / The Master and His Pupils | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 4 | — |
| 525 | caucasus | Сновидец / The Dreamer | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 5 | — |
| 526 | caucasus | Райская роза / The Rose of Paradise | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 7 | — |
| 527 | caucasus | Соловей и соловьиха / The Cock and Hen Nightingale | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 8 | — |
| 528 | caucasus | Плешивый гусопас / The Bald-Headed Gooseherd | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 11 | — |
| 529 | caucasus | Три брата-вора / The Three Thieving Brothers | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 75 | — |
| 530 | caucasus | Удинская сказка о Рустуме / An Udian Story of Rustum | OK | no | — |
| 531 | caucasus | Волшебный соловей / The Fairy Nightingale | OK | no | — |
| 532 | caucasus | Мальчик, не рассказавший сна / The Boy Who Would Not Tell His Dream | OK | no | — |
| 533 | caucasus | Сиаманто и Гюлизар / Sia-Manto and Guje-Zare | OK | no | — |
| 534 | caucasus | Как керкенджцы ходили по дрова / How the People of Kerkendj Went to Cut Wood | OK | yes — re-checked 2026-10-24 vs Dirr, Caucasian Folk-tales (tr. Menzies 1925, archive.org djvu text), No. 81 | — |
| 535 | caucasus | Молла Насреддин: Яйца в платке / Mullah Nasreddin: Eggs in a Cloth | OK | no | — |
| 536 | caucasus | Молла Насреддин: Скороход / Mullah Nasreddin: Quick-Runner | OK | no | — |
| 537 | caucasus | Молла Насреддин: Камень и старость / Mullah Nasreddin: The Stone and Old Age | OK | no | — |
| 538 | caucasus | Молла Насреддин: Ветер в огороде / Mullah Nasreddin: The Wind in the Garden | OK | no | — |
| 539 | caucasus | Молла Насреддин: Счёт Насреддина / Mullah Nasreddin: Nasreddin's Arithmetic | OK | no | — |
| 540 | caucasus | Молла Насреддин: Руки были заняты / Mullah Nasreddin: His Hands Were Full | OK | no | — |
| 541 | caucasus | Молла Насреддин: Орехи со скорлупой / Mullah Nasreddin: Nuts in Their Shells | OK | no | — |
| 542 | caucasus | Молла Насреддин: Баранья голова / Mullah Nasreddin: The Sheep's Head | OK | no | — |
| 543 | caucasus | Молла Насреддин: Сыр / Mullah Nasreddin: Cheese | OK | no | — |
| 544 | caucasus | Молла Насреддин: Подпруга / Mullah Nasreddin: The Girth | OK | no | — |
| 545 | caucasus | Молла Насреддин: Даровые яблоки / Mullah Nasreddin: Free Apples | OK | no | — |
| 546 | caucasus | Молла Насреддин: Прыжок через ручей / Mullah Nasreddin: The Leap over the Brook | OK | no | — |
| 547 | caucasus | Молла Насреддин: Три крика осла / Mullah Nasreddin: The Donkey's Three Brays | OK | no | — |
| 548 | caucasus | Молла Насреддин: Говорящий чинар / Mullah Nasreddin: The Speaking Plane Tree | OK | no | — |
| 549 | caucasus | Амиран на Эльбрусе (сванский вариант) / Amiran on Elbrus (Svan Variant) | OK | no | — |
| 550 | caucasus | Рустамзал, сын Гахрамана / Rustumsal, Son of Qahirman | OK | no | — |
| 551 | caucasus | Младший из трёх / The Youngest of the Three | OK | no | — |
| 552 | caucasus | Зульвисия / Zoolvisia | OK | no | — |
| 553 | caucasus | Сын-Дракон и Сын Солнца / Dragon-Child and Sun-Child | OK | no | — |
| 554 | caucasus | Мирза / Mirza | OK | no | — |
| 555 | caucasus | Близнецы / The Twins | OK | no | — |
| 556 | caucasus | Бедик и Неуязвимый великан / Bedik and the Invulnerable Giant | OK | no | — |
| 557 | caucasus | Симон, друг змей / Simon, the Friend of Snakes | OK | no | — |
| 558 | caucasus | Сын бедной вдовы / The Poor Widow's Son | OK | no | — |
| 559 | caucasus | Золотоголовая рыба / The Golden-Headed Fish | OK | no | — |
| 560 | caucasus | Муж или жена — кто? / Husband or Wife — Which? | OK | no | — |
| 561 | caucasus | Злая мачеха / The Wicked Stepmother | OK | no | — |
| 562 | caucasus | Мудрый ткач / A Wise Weaver | OK | no | — |
| 563 | caucasus | Ум или Счастье — кто? / Mind or Luck — Which? | OK | no | — |
| 564 | caucasus | Красота Мира / The World's Beauty | OK | no | — |
| 565 | caucasus | Мастер Абдулла / Master Abdulla | OK | no | modern edition — copyright may apply (libking) |
| 566 | caucasus | Ученик портного / The Tailor's Apprentice | OK | no | modern edition — copyright may apply (libking) |
| 567 | caucasus | Сказка о плешивом и кази / The Bald Lad and the Qadi | OK | no | modern edition — copyright may apply (libking) |
| 568 | caucasus | Пёс шахсевенского хаджи / The Shahseven Hajji's Dog | OK | no | modern edition — copyright may apply (libking) |
| 569 | caucasus | Бедняк и змея с сундуком / The Poor Man and the Snake in the Chest | OK | no | modern edition — copyright may apply (libking) |
| 570 | caucasus | Жёлтая дыня / The Yellow Melon | OK | no | modern edition — copyright may apply (libking) |
| 571 | caucasus | Учёная кошка / The Learned Cat | OK | no | modern edition — copyright may apply (libking) |
| 572 | caucasus | Пастух / The Shepherd | OK | no | modern edition — copyright may apply (libking) |
| 573 | caucasus | Суд кази / The Qadi's Judgement | OK | no | modern edition — copyright may apply (libking) |
| 574 | caucasus | Ильяс и Гулам / Ilyas and Gulam | OK | no | modern edition — copyright may apply (libking) |
| 575 | caucasus | Жена мельника / The Miller's Wife | OK | no | modern edition — copyright may apply (libking) |
| 576 | caucasus | Сапожник Мамед / Mamed the Cobbler | OK | no | modern edition — copyright may apply (libking) |
| 577 | caucasus | Сказка про Азиза / The Tale of Aziz | OK | no | modern edition — copyright may apply (libking) |
| 578 | caucasus | Носильщик Ахмед / Ahmed the Porter | OK | no | modern edition — copyright may apply (libking) |
| 579 | caucasus | Ильяс / Ilyas | OK | no | modern edition — copyright may apply (libking) |
| 580 | caucasus | Сказка про Салеха и Валеха / The Tale of Saleh and Valeh | OK | no | modern edition — copyright may apply (libking) |
| 581 | caucasus | Мелик-Мамед и Мелик-Ахмед (о названых братьях) / Melik-Mamed and Melik-Ahmed (the Sworn Brothers) | OK | no | modern edition — copyright may apply (libking) |
| 582 | caucasus | Сказка об Искендере, знающем птичий язык / The Tale of Iskender Who Knew the Language of Birds | OK | no | modern edition — copyright may apply (libking) |
| 583 | caucasus | Сказка о трёх сёстрах / The Tale of the Three Sisters | OK | no | modern edition — copyright may apply (libking) |
| 584 | caucasus | Имам-сводня / The Imam Go-Between | OK | no | modern edition — copyright may apply (libking) |
| 585 | caucasus | Сказка о Нушапери-ханум / The Tale of Nushaperi-Khanum | OK | no | modern edition — copyright may apply (libking) |
| 586 | caucasus | Сирота Ибрагим и жадный лавочник / Ibrahim the Orphan and the Greedy Shopkeeper | OK | no | modern edition — copyright may apply (libking) |
| 587 | caucasus | Местан / Mestan | OK | no | modern edition — copyright may apply (libking) |
| 588 | caucasus | Гарагаш / Garagash | OK | no | modern edition — copyright may apply (libking) |
| 589 | caucasus | Сказка о Кел-Гасане / The Tale of Kel-Hasan | OK | no | modern edition — copyright may apply (libking) |
| 590 | caucasus | Бахтияр / Bakhtiyar | OK | no | modern edition — copyright may apply (libking) |
| 591 | caucasus | Сказка о Хатэме / The Tale of Hatem | OK | no | modern edition — copyright may apply (libking) |
| 592 | caucasus | Мамед / Mamed | OK | no | modern edition — copyright may apply (libking) |
| 593 | caucasus | Дали и охотник Бетгил / Dali and the Hunter Betgil | OK | no | — |
| 594 | caucasus | Охотник Чорла / The Hunter Chorla | OK | no | — |
| 595 | caucasus | Хайк и Бел / Hayk and Bel | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 596 | caucasus | Парнаваз и сокровище в пещере / Pharnavaz and the Treasure in the Cave | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 1 | ussr | Утка, два яйца и сотворение земли / The duck, two eggs and the making of the earth | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 2 | ussr | Кугу Юмо, Керемет и собака / Kugu Yumo, Keremet and the dog | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 3 | ussr | Тӱн Юмо, Шочын Ава и первые пары / Tün Yumo, Shochyn Ava and the first couples | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 4 | ussr | Дорога диких гусей (Млечный Путь) / The Road of the Wild Geese (the Milky Way) | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 5 | ussr | Дочь бога и земной жених / God's daughter and the earthly groom | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 6 | ussr | Кугурак и его жена — учители мари / Kugurak and his wife, teachers of the Mari | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 7 | ussr | Онар и пень в глазу / Onar and the stump in his eye | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 8 | ussr | Онар-рыбак и кобыла Онара / Onar the fisher and Onar's mare | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 9 | ussr | Чоткар-патыр / Chotkar the hero | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 10 | ussr | Шурале и защемлённый палец / Shurale and the trapped finger | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 11 | ussr | Камыр-батыр / Kamyr-batyr (the Dough Hero) | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 12 | ussr | Урал-батыр и родник жизни / Ural-batyr and the spring of life | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 13 | ussr | Происхождение земледелия / The origin of agriculture | OK | authored from read PD text; not re-checked | — |
| 14 | ussr | Колдун и колдунья / Enchanter and enchantress | OK | authored from read PD text; not re-checked | — |
| 15 | ussr | Дурак и телёнок / The fool and the calf | OK | authored from read PD text; not re-checked | — |
| 16 | ussr | Неудачливый покойник / The unlucky corpse | OK | authored from read PD text; not re-checked | — |
| 17 | ussr | Коза и козлята / The goat and the kids | OK | authored from read PD text; not re-checked | — |
| 18 | ussr | Как ханский сын отправился за Сиддхи-Кюром / How the Khan's son went to fetch the Siddhi-kür | OK | authored from read PD text; not re-checked | — |
| 19 | ussr | Жена, искавшая мужа во дворце Эрлик-хана / The Woman who sought her Husband in the Palace of Erlik-Khan | OK | authored from read PD text; not re-checked | — |
| 20 | ussr | Непокорный подданный / The Turbulent Subject | OK | authored from read PD text; not re-checked | — |
| 21 | ussr | Белая птица и её жена / The White Bird and his Wife | OK | authored from read PD text; not re-checked | — |
| 22 | ussr | Пятеро против одного / Five to One | OK | authored from read PD text; not re-checked | — |
| 23 | ussr | Кусающийся мертвец / The Biting Corpse | OK | authored from read PD text; not re-checked | — |
| 24 | ussr | «Детский ум» и «Светлый ум» / 'Child-intellect' and 'Bright-intellect' | OK | authored from read PD text; not re-checked | — |
| 25 | ussr | Джангар: предки и рождение героя / Jangar: ancestors and birth | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 26 | ussr | Джангар в дикой степи и первые победы / Jangar in the wild and his first victories | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 27 | ussr | Джангар, Менген Шигширге и всеведущий Алтан Гээдж / Jangar, Mengen Shigshirge and all-seeing Altan Gheej | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 28 | ussr | Коркут и могилы на четырёх концах света / Korkut and the graves at the four ends of the world | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 29 | ussr | Манас: рождение и возвышение / Manas: birth and rise | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 30 | ussr | Солнечный и Лунный царевичи и змеиные боги / Sunshine, Moonshine and the Serpent-gods | OK | authored from read PD text; not re-checked | — |
| 31 | ussr | Ананда-резчик и Ананда-живописец / Ânanda the Woodcarver and Ânanda the Painter | OK | authored from read PD text; not re-checked | — |
| 32 | ussr | Молитва, что делает внезапно богатым / The Prayer making suddenly Rich | OK | authored from read PD text; not re-checked | — |
| 33 | ussr | Как был убит Шимну-хан (Массанг) / How the Schimnu-Khan was slain (Massang) | OK | authored from read PD text; not re-checked | — |
| 34 | ussr | Гадатель со свиной головой / The pig's-head soothsayer | OK | authored from read PD text; not re-checked | — |
| 35 | ussr | Как Добро и Зло были попутчиками / How Good and Evil were companions | OK | authored from read PD text; not re-checked | — |
| 36 | ussr | Сорок рассказов / The forty stories | OK | authored from read PD text; not re-checked | — |
| 37 | ussr | Дураки / The fools | OK | authored from read PD text; not re-checked | — |
| 38 | ussr | Хитрость лисы / The trick of the fox | OK | authored from read PD text; not re-checked | — |
| 39 | ussr | Слепой / The blind man | OK | authored from read PD text; not re-checked | — |
| 40 | ussr | Эр Соготох — Одинокий муж / Er Sogotokh, the Lone Man | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 41 | ussr | Начало творения / The beginning of creation | OK | authored from read PD text; not re-checked | — |
| 42 | ussr | Жена Солнца / The Sun's wife | OK | authored from read PD text; not re-checked | — |
| 43 | ussr | Сказочный старик / A tale of a fabulous old man | OK | authored from read PD text; not re-checked | — |
| 44 | ussr | Каменная дева / Story of a stone maiden | OK | authored from read PD text; not re-checked | — |
| 45 | ussr | Гиляк, взявший в жёны тигрицу / The Gilyak who mated with a tigress | OK | authored from read PD text; not re-checked | — |
| 46 | ussr | Как Тритон-человек похитил жену Эмемкута / How Triton-Man abducted Ememqut's wife | OK | authored from read PD text; not re-checked | — |
| 47 | ussr | Девушка, унесённая Луной / A girl carried off by the Moon | OK | authored from read PD text; not re-checked | — |
| 48 | ussr | Ламутская история (I) / A Lamut story (I) | OK | authored from read PD text; not re-checked | — |
| 49 | ussr | Человек и волк / The man and the wolf | OK | authored from read PD text; not re-checked | — |
| 50 | ussr | Пятна на луне / The spots on the Moon | OK | authored from read PD text; not re-checked | — |
| 51 | ussr | Шаман Халта / A shaman tradition | OK | authored from read PD text; not re-checked | — |
| 52 | ussr | Хан Беджитты и сто его жён / Khan Bejitty and his hundred wives | OK | authored from read PD text; not re-checked | — |
| 53 | ussr | Люди, ставшие зверями и птицами / Human beings transformed into beasts and birds | OK | authored from read PD text; not re-checked | — |
| 54 | ussr | Самоедская сказка № 5 / Samoyed tale no. 5 | OK | authored from read PD text; not re-checked | — |
| 55 | ussr | Три брата и их сестра / Three brothers and their sister | OK | authored from read PD text; not re-checked | — |
| 56 | ussr | Перелётные птицы / Flying birds | OK | authored from read PD text; not re-checked | — |
| 57 | ussr | Отчего на луне пятна / Why there are spots on the Moon | OK | authored from read PD text; not re-checked | — |
| 58 | ussr | Лиса и собака / The fox and the dog | OK | authored from read PD text; not re-checked | — |
| 59 | ussr | Храбрый гиляк и благодарный тигр / The brave Gilyak and the grateful tiger | OK | authored from read PD text; not re-checked | — |
| 60 | ussr | Гиляк, оскорбивший хозяина огня / The Gilyak who offended the Fire-lord | OK | authored from read PD text; not re-checked | — |
| 61 | ussr | Начало / The beginning | OK | authored from read PD text; not re-checked | — |
| 62 | ussr | Шаман / The shaman | OK | authored from read PD text; not re-checked | — |
| 63 | ussr | Лиса и мужик / The fox and the peasant | OK | authored from read PD text; not re-checked | — |
| 64 | ussr | Отчего у медведя короткий хвост / Why the bear's tail is short | OK | authored from read PD text; not re-checked | — |
| 65 | ussr | Происхождение верблюда / Origin of the camel | OK | authored from read PD text; not re-checked | — |
| 66 | ussr | Калев, Линда и рождение Калевипоэга / Kalev, Linda and the birth of Kalevipoeg | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 67 | ussr | Проклятый меч / The cursed sword | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 68 | ussr | Пахарь-король и состязание с Водяным / The ploughman-king and the stone-throw with the Water Sprite | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 69 | ussr | Сарвик, край земли и смерть Калевипоэга / Sarvik, the world's end and the death of Kalevipoeg | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 70 | ussr | Эгле — королева ужей / Eglė the Queen of Serpents | OK | no — SECONDARY_ONLY (Wikipedia) | — |
| 71 | ussr | Воробей и куст / The Sparrow and the Bush | OK | authored from read PD text; not re-checked | — |
| 72 | ussr | Старый пёс / The Old Dog | OK | authored from read PD text; not re-checked | — |
| 73 | ussr | Лиса и кот / The Fox and the Cat | OK | authored from read PD text; not re-checked | — |
| 74 | ussr | Откуда взялся крот / The Origin of the Mole | OK | authored from read PD text; not re-checked | — |
| 75 | ussr | Железный волк / The Iron Wolf | OK | authored from read PD text; not re-checked | — |
| 76 | ussr | Соломенный бычок / The Straw Ox | OK | authored from read PD text; not re-checked | — |
| 77 | ussr | Три брата / The Three Brothers | OK | authored from read PD text; not re-checked | — |
| 78 | ussr | Злыдни (Несчастные дни) / The Unlucky Days | OK | authored from read PD text; not re-checked | — |
| 79 | ussr | Сорок первый брат / The Forty-First Brother | OK | authored from read PD text; not re-checked | — |
| 80 | ussr | Сотворение мира из яйца (руны 1–2) / Creation from the egg (runes 1–2) | OK | authored from read PD text; not re-checked | — |
| 81 | ussr | Песенный поединок и судьба Айно (руны 3–5) / The song-duel and the fate of Aino (runes 3–5) | OK | authored from read PD text; not re-checked | — |
| 82 | ussr | Как выковали Сампо (руны 6–10) / How the Sampo was forged (runes 6–10) | OK | authored from read PD text; not re-checked | — |
| 83 | ussr | Смерть и воскрешение Лемминкяйнена (руны 11–15) / The death and restoration of Lemminkainen (runes 11–15) | OK | authored from read PD text; not re-checked | — |
| 84 | ussr | Випунен и свадьба в Похьоле (руны 16–25) / Vipunen and the wedding at Pohyola (runes 16–25) | OK | authored from read PD text; not re-checked | — |
| 85 | ussr | Куллерво (руны 31–36) / Kullervo (runes 31–36) | OK | authored from read PD text; not re-checked | — |
| 86 | ussr | Золотая невеста Ильмаринена (руны 37–38) / Ilmarinen's bride of gold (runes 37–38) | OK | authored from read PD text; not re-checked | — |
| 87 | ussr | Кантеле и похищение Сампо (руны 39–43) / The kantele and the theft of the Sampo (runes 39–43) | OK | authored from read PD text; not re-checked | — |
| 88 | ussr | Месть Лоухи: болезни, медведь, похищенные огонь, солнце и луна (руны 45–49) / Louhi's revenge: plagues, the bear, stolen fire, sun and moon (runes 45–49) | OK | authored from read PD text; not re-checked | — |
| 89 | ussr | Марьятта и уход Вяйнямёйнена (руна 50) / Mariatta and Wainamoinen's departure (rune 50) | OK | authored from read PD text; not re-checked | — |
| 90 | ussr | Млечный Путь (Линду) / The Milky Way (Lindu) | OK | authored from read PD text; not re-checked | — |
| 91 | ussr | Видевик, Койт и Эмарик / Videvik, Koit and Ämarik | OK | authored from read PD text; not re-checked | — |
| 92 | ussr | Дева у моста Васкъяла / The maiden at the Vaskjala bridge | OK | authored from read PD text; not re-checked | — |
| 93 | ussr | Женщина на луне / The woman in the moon | OK | authored from read PD text; not re-checked | — |
| 94 | ussr | Крестины у карлика / The dwarf's christening | OK | authored from read PD text; not re-checked | — |
| 95 | ussr | Невеста-ведьма (дочь Рыугутая) / The witch-bride (Rõugutaja's daughter) | OK | authored from read PD text; not re-checked | — |
| 96 | ussr | Мачеха / The stepmother | OK | authored from read PD text; not re-checked | — |
| 97 | ussr | Чёрт и кузнец по имени «Сам» / The Devil and the smith called 'Myself' | OK | authored from read PD text; not re-checked | — |
| 98 | ussr | Визит чёрта и три петуха / The Devil's visit and the three cocks | OK | authored from read PD text; not re-checked | — |
| 99 | ussr | Два брата и Мороз / The two brothers and the Frost | OK | authored from read PD text; not re-checked | — |
| 100 | ussr | Уход бога песни Ванемуйне / The song-god's departure | OK | authored from read PD text; not re-checked | — |
| 101 | ussr | Мёртвая мать / The dead mother | OK | authored from read PD text; not re-checked | — |
| 102 | ussr | Клад (поп в козлиной шкуре) / The treasure (the priest in the goat-skin) | OK | authored from read PD text; not re-checked | — |
| 103 | ussr | Три копейки / The three copecks | OK | authored from read PD text; not re-checked | — |
| 104 | ussr | Скупой Марко Богатый / Marko the Rich, the miser | OK | authored from read PD text; not re-checked | — |
| 105 | ussr | Дурак и берёза / The fool and the birch-tree | OK | authored from read PD text; not re-checked | — |
| 106 | ussr | Лихо одноглазое / One-eyed Likho | OK | authored from read PD text; not re-checked | — |
| 107 | ussr | Матушка Пятница / Mother Friday | OK | authored from read PD text; not re-checked | — |
| 108 | ussr | Вазуза и Волга / Vazuza and Volga | OK | authored from read PD text; not re-checked | — |
| 109 | ussr | Морозко / Frost (Morozko) | OK | authored from read PD text; not re-checked | — |
| 110 | ussr | Чёрный ручей и Ильмень / The Black Brook and Lake Ilmen | OK | authored from read PD text; not re-checked | — |
| 111 | ussr | Сож и Днепр / Sozh and Dnieper | OK | authored from read PD text; not re-checked | — |
| 112 | ussr | Неблагодарные дети и старик, пошедший в школу / The ungrateful children and the old father who went to school again | OK | authored from read PD text; not re-checked | — |
| 113 | ussr | Сказка о Ветре / The story of the Wind | OK | authored from read PD text; not re-checked | — |
| 114 | ussr | Голоса под окном / The voices at the window | OK | authored from read PD text; not re-checked | — |
| 115 | ussr | Как утопили глупого брата / How the foolish brother was drowned | OK | authored from read PD text; not re-checked | — |
| 116 | ussr | Царевич, ставший лягушкой / The tsar's son who became a frog | OK | authored from read PD text; not re-checked | — |
| 117 | ussr | Солнце, Мороз и Ветер / Sun, Frost and Wind | OK | authored from read PD text; not re-checked | — |
| 118 | ussr | Сватовство Солнца / The Sun's courtship | OK | authored from read PD text; not re-checked | — |
| 119 | ussr | Работник у Отца-Солнца / The workman at Father Sun's | OK | authored from read PD text; not re-checked | — |
| 120 | ussr | Старик и леший / The old man and the wood-sprite | OK | authored from read PD text; not re-checked | — |
| 121 | ussr | Ведьма-свекровь и Биби-Гайша / The witch, or sorceress (Bibi-Gaysha) | OK | authored from read PD text; not re-checked | — |
| 122 | ussr | Золотой альчик (Золотая бабка) / Golden Knucklebone | OK | authored from read PD text; not re-checked | — |
| 123 | ussr | Начало мира и сотворение человека / The beginning of the world and the creation of man | OK | authored from read PD text; not re-checked | — |
| 124 | ussr | Алдар-обманщик / Aldar the trickster | OK | authored from read PD text; not re-checked | — |
| 125 | ussr | Волшебная птица / The magic bird | OK | authored from read PD text; not re-checked | — |
| 126 | ussr | Благодарные звери / The grateful animals | OK | authored from read PD text; not re-checked | — |
| 127 | ussr | Охотник и семиглавый сатир / A hunter and a seven-headed satyr | OK | authored from read PD text; not re-checked | — |
| 128 | ussr | Шингилтаки и Пингилтак / Schingiltak and Pingiltak | OK | authored from read PD text; not re-checked | — |
| 129 | ussr | Человек, понимавший язык зверей / The man who understood animals' conversation | OK | authored from read PD text; not re-checked | — |
| 130 | ussr | Волшебные вещи / The magic objects | OK | authored from read PD text; not re-checked | — |

## Дополнительная проверка ETCSL / ETCSL source comparison (2026-10-24)

- **«Потоп и Зиусудра»**: [Oxford ETCSL c.1.7.4, The Flood story](https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.7.4). Исправлены RU/EN пересказы: убраны мотив «шум людей не давал Энлилю спать», прямое предупреждение Энки и неподтверждённые детали о семье и подготовке лодки. Отмечены лакуны, семь дней потопа, Уту, жертва и Дильмун. EN: removed details not preserved in this fragmentary text.
- **«Гильгамеш и Небесный Бык»**: [Oxford ETCSL c.1.8.1.2, Gilgameš and the bull of heaven](https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.8.1.2), including the Me-Turan recension. RU/EN revised to specify the fragmentary versions, the devastating bull, the axe blow and the meat distribution.
- ETCSL is a scholarly composite text and translation, not a direct modern oral record. Its copyright notice means the source is linked, not reproduced in full.
- **This limited check raises SOURCE-REVIEWED from 28 to 30**; 96 earlier author-reviewed entries remain not rechecked, and 878 are NOT VERIFIED. **241 entries** now have only Wikipedia references (including multiple-Wikipedia-only entries).
- The previously documented automated HTTP run checked **526 distinct URLs**. These **two added ETCSL URLs** were manually opened, but the entire 528-URL set has NOT been re-run under the prior HTTP workflow.

## Проход 2, партия 1 / Pass 2, batch 1 (2026-10-24): Египет, Ирландия, чероки, инки, Гильгамеш, Чжуан-цзы
Первоисточники открыты и прочитаны / primary texts opened and read: Petrie, *Egyptian Tales* I–II (PG 7386, 7413); Budge, *Legends of the Gods* (PG 9411); Joyce, *Old Celtic Romances* (PG 38041); Mooney, *Myths of the Cherokee* (PG 45634); *Katha Upanishad*, tr. Paramananda (PG 3283); Zhuangzi, tr. Giles (PG 59709); Sarmiento de Gamboa, tr. Markham (PG 20218); Thompson 1928 *Epic of Gilgamish* (archive.org).
- **RU.** Исправлено: «Потерпевший кораблекрушение» переписан по Петри с пометками о расхождениях с современными переводами; «Обречённый царевич» (дом в пустыне, «сын военачальника», лезет к окну; крокодил хватает его в реке, пёс не говорит); «Два брата» (акация/кедр, поиски больше трёх лет, семечко); «Снофру» (малахитовое украшение); «Джеди» (110 лет; утка, гусь, бык); «Истребление людей» (красное пиво, у Баджа — кровь и «мандрагоры»); «Ойсин» (Ниам — дочь короля Страны юности, Ойсин не король, плита); «Майль-Дуйн» (слова отшельника); «Нуннехи» (полночи, брод, Яхула — торговец); «Братья Айяр» (Капак-токо, судьба братьев по Сармьенто); «Виракоча» переписан по Сармьенто (Бетансос не открыт); «Гильгамеш» (Ницир/Нимуш, хлеб и отметки на стене, Сабиту).
- **EN.** Fixed: *Shipwrecked Sailor* rewritten per Petrie with explicit notes where modern translations differ; *Doomed Prince* (desert house, "officer's son", climbing; crocodile seizes him in the river; the dog does not speak); *Two Brothers* (acacia/cedar, 3+ years, seed); *Sneferu* (malachite jewel); *Djedi* (110 years; duck, goose, ox); *Destruction of Mankind* (red beer, Budge's "blood and mandrakes"); *Oisín* (Niamh is daughter of the king of the Land of Youth, Oisín not king, flagstone); *Máel Dúin* (hermit's words); *Nunnehi* (half the night, ford, Yahula a trader); *Ayar Brothers* (Capac-tocco, Sarmiento's fate of the brothers); *Viracocha* re-based on Sarmiento (Betanzos not openly available); *Gilgamesh* (Nisir/Nimush, bread and wall marks, Sabitu).
- Частично / partial: *Uktena* — Cherokee part matches Mooney; Muscogee part unverified, status stays NOT VERIFIED.
- Не удалось / not done: *Deirdre*, *Étaín*, Zhuangzi "Joy of Fish", "Drums on a Tub", "Funeral" (no open text reachable from here: ctext.org blocks automated access; the Giles PG edition is a selection); Haida/Tlingit Raven retellings (popular modern versions; no matching text in Swanton) — left NOT VERIFIED.


## Пакет 3 (PR #38): расширение СССР / Batch 3 (PR #38): USSR expansion

**RU.** Добавлено 11 записей, пересказанных своими словами по тексту Coxwell, *Siberian and Other Folk-Tales* (1925), открытому и прочитанному на archive.org (djvu-текст): башкиры — «Старик и леший», «Ведьма-свекровь и Биби-Гайша», «Золотой альчик», «Начало мира и сотворение человека»; удмурты — «Алдар-обманщик», «Волшебная птица», «Благодарные звери»; ханты — «Охотник и семиглавый сатир»; уйгуры-таранчи — «Шингилтаки и Пингилтак», «Человек, понимавший язык зверей»; дарвазцы (таджики Дарваза) — «Волшебные вещи». Не взяты: «Алейка» (в djvu-тексте пропущена страница), «Мудрая девица» (ханты) и «Хитрость старухи» (таранчи) — не дочитаны полностью. Статус новых записей: «authored from read PD text; not re-checked». Права: Coxwell 1925 — статус авторских прав перевода не установлен; пересказ своими словами.

**EN.** Added 11 records retold in my own words from Coxwell, *Siberian and Other Folk-Tales* (1925), opened and read on archive.org (djvu text): Bashkir — The old man and the wood-sprite, The witch (Bibi-Gaysha), Golden Knucklebone, The beginning of the world and the creation of man; Votyak/Udmurt — Aldar the trickster, The magic bird, The grateful animals; Ostyak/Khanty — A hunter and a seven-headed satyr; Tarantchi Uyghur — Schingiltak and Pingiltak, The man who understood animals' conversation; Darvaz (Tajik) — The magic objects. Not taken: Aleyka (a page is missing from the djvu text), The wise maiden (Khanty) and The old woman's trick (Tarantchi) — not read to the end. Status of new records: "authored from read PD text; not re-checked". Rights: Coxwell 1925 translation copyright status not established; retold in own words.

Не найдено в этом проходе / Not done in this pass: Nasyri/Koblov (Tatar), Komi, Mansi, Nanai — open full texts not yet located and read.


## Пакет 4 (PR #38): Кавказ по Dirr 1925 / Batch 4 (PR #38): Caucasus against Dirr 1925

**RU.** 25 записей Кавказа сверены с английским текстом Dirr, *Caucasian Folk-tales* (пер. Menzies, 1925; djvu-текст archive.org), прочитанным целиком для каждой сказки: басни № 32–45 и № 73–83. Исправлено: «Козлёнок, ягнёнок и телёнок» (переписано — в тексте козлёнок пугает зверей рассказом о съеденном звере, а распределяет «кому кого ловить» уже на дереве); «Соседние станы» (хищники сами прячутся под скалой); «Кто глупее?» (учителя не «хоронят», а обмывают и заворачивают в саван); «Глупая жена» (не суд, а допрос у хозяина верблюда); «Глупые аухцы» (в пещеру лезет сам один из троих); «Птица, умная для других» (уточнено местоимение). Остальные записи Dirr (волшебные сказки № 1–31, нартовские и прочие саги № 46–72, Насреддин) в этом пакете не сверялись и остаются NOT VERIFIED.

**EN.** 25 Caucasus records checked against the English Dirr, *Caucasian Folk-tales* (tr. Menzies 1925; archive.org djvu text), each tale read in full: fables Nos. 32–45 and Nos. 73–83. Fixed: The Kid, the Lamb and the Calf (rewritten: the kid scares each beast with a tale of an eaten beast; the "who catches whom" shout comes later, on the tree); Neighbouring Camps (the beasts themselves hide under the rock); Who Is the Most Stupid? (the teacher is washed and shrouded, not buried); The Stupid Wife (questioned by the camel's owner, not a court); The Stupid People of Aukh (one of the three crawls in himself); The Bird Who Was Clever for Others (pronoun). Other Dirr records (fairy tales Nos. 1–31, Nart and other sagas Nos. 46–72, Nasreddin) were not checked in this batch and stay NOT VERIFIED.

**Пакет 5 / Batch 5.** Ещё 11 записей Dirr сверены по тому же тексту / 11 more Dirr records checked against the same text: № 6, 9, 10, 15, 16, 20, 24, 25, 28, 29, 30. Исправлено / fixed: «Кому достанется невеста?» / To Whom Does the Bride Belong? (девушка исчезает ночью; похищение джиннами в тексте не описано, она найдена в их крепости / she vanishes in the night and is found in the djinns' stronghold); «Земля возьмёт своё» / The Earth Will Have Its Own (в тексте — один век, а не «века» / one century, not centuries).

**Пакет 6 / Batch 6.** Сверены Dirr № 3, 4, 14, 17, 18, 19, 21, 22, 23 (9 записей / records). Исправлено / fixed: «Верный слуга» / The Faithful Servant: слуга убивает собаку ради крови и, ложась в могилу, передаёт кровь и уши дэвов царевичу; что он и есть покойник — лишь подразумевается / he kills the hound for its blood and hands over the remedies as he lies down in the grave; that he is the dead man is only implied.

**Пакет 7 / Batch 7.** Сверены Dirr № 1, 5, 7, 8, 12, 13, 27, 31 (8 записей / records). Исправлено / fixed: «Верный сын» / The Faithful Son: загадки рассказывает не мачеха-джинн, а джинния, уносившая плов; юноша влюбляется в портрет ханской дочери / the riddles are told by the Djinn woman who fetched the pilaf, not the stepmother; he falls for the princess's portrait.

**Пакет 8 / Batch 8.** Сверены без исправлений / checked, no fixes needed: Dirr № 11, 26, 47, 48, 50–55, 63 (11 записей / records).
