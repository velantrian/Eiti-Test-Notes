# 📋 TZ_CORE_00_MASTER — Схема v3.2 и Pipeline
**Проект:** Velantrim · Core Knowledge Base  
**Версия:** 3.2  
**Дата:** 27 мая 2026  
**Статус:** ✅ Source of Truth — все остальные TZ читают этот файл

---

## 🎯 Главная цель

Собрать **Core KB** — платоническое ядро знания всех наук.  
Не каталог всего существующего, а **структура и законы** того, почему всё так устроено.

```
❌ НЕ это:  перечень всех 2 068 366 видов
✅ ЭТО:    механизм клеточного деления, применимый ко всем видам

❌ НЕ это:  все 6 145 минералов
✅ ЭТО:    топ-500 минералов + кристаллохимические принципы классификации
```

**Инвариант** = факт не изменится через 50 лет.  
**Вариант** = факт с датой, источником, возможными спорами.  
**Практика** = процесс/технология с условиями применимости.  
**Логика** = правило мышления или рассуждения.  
**Фронтир** = открытая нерешённая проблема науки.

---

## 📁 Файловая структура проекта

```
velantrim_core/
│
├── tz/
│   ├── TZ_CORE_00_MASTER.md        ← этот файл
│   ├── TZ_CORE_01_PHYSICS.md
│   ├── TZ_CORE_02_MATH.md
│   ├── TZ_CORE_03_CHEMISTRY.md
│   ├── TZ_CORE_04_MINERALS.md
│   ├── TZ_CORE_05_BIOLOGY.md
│   ├── TZ_CORE_06_LOGIC.md
│   ├── TZ_CORE_07_VARIANT.md
│   ├── TZ_CORE_08_PRACTICAL.md
│   ├── TZ_CORE_09_FRONTIER.md
│   └── TZ_CORE_10_ABSTRACT.md
│
├── data/
│   └── raw/                        ← JSON-батчи (25 фактов каждый)
│       ├── physics_laws_001.json
│       ├── math_axioms_001.json
│       └── ...
│
├── registry/
│   └── collected.json              ← реестр всех собранных id
│
├── scripts/
│   ├── collect.py                  ← генерирует промпт для батча
│   ├── validate.py                 ← проверяет батч (v3.2)
│   ├── check_links.py              ← ищет оборванные prereq/derives_from
│   └── build_graph.py              ← собирает всё в graph.json
│
├── output/
│   └── graph.json                  ← итоговый граф (nodes + edges)
│
└── schema.json                     ← JSON Schema Draft 2020-12
```

---

## 📦 Схема факта v3.2

### Минимальный пример

```json
{
  "id": "law.physics.mechanics.newton_2",
  "schema_version": "3.2",
  "domain": "physics.mechanics",
  "subtopic": "physics.mechanics.dynamics",
  "tier": "invariant",
  "type": "law",
  "statement": "Ускорение тела прямо пропорционально приложенной силе и обратно пропорционально его массе.",
  "formal_notation": "F = m·a",
  "conditions": "Инерциальная система отсчёта; v << c",
  "limits": [
    "Не применимо при v близких к c — нужна СТО",
    "Не применимо для квантовых объектов — нужна QM",
    "Не применимо в неинерциальных системах без псевдосил"
  ],
  "prereq": ["concept.physics.force", "concept.physics.mass", "concept.physics.acceleration"],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["mechanics", "newton", "dynamics", "force"]
}
```

### Пример с tier_extensions (для законов с историческим контекстом)

```json
{
  "id": "law.physics.mechanics.newton_2",
  "schema_version": "3.2",
  "domain": "physics.mechanics",
  "subtopic": "physics.mechanics.dynamics",
  "tier": "invariant",
  "type": "law",
  "statement": "Ускорение тела прямо пропорционально приложенной силе и обратно пропорционально его массе.",
  "formal_notation": "F = m·a",
  "conditions": "Инерциальная система отсчёта; v << c",
  "limits": [
    "Не применимо при v близких к c — нужна СТО",
    "Не применимо для квантовых объектов — нужна QM"
  ],
  "prereq": ["concept.physics.force", "concept.physics.mass", "concept.physics.acceleration"],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["mechanics", "newton", "dynamics"],
  "tier_extensions": {
    "esm_target": "ImmutableCore",
    "discovered_by": "Isaac Newton",
    "year": 1687
  }
}
```

---

## 🔑 Описание полей

### Обязательные (блокируют при отсутствии)

| Поле | Формат | Описание |
|------|--------|----------|
| `id` | `a.b.c[.d[.e]]` — минимум 3 сегмента | Уникальный идентификатор |
| `schema_version` | `"3.2"` | Версия схемы — всегда `"3.2"` |
| `domain` | строка с точками | Предметная область |
| `subtopic` | строка с точками | Подтема из карты TZ_CORE_* |
| `tier` | enum — см. ниже | Эпистемический тип |
| `type` | enum — см. ниже | Тип знания |
| `statement` | строка ≤ 250 символов | Само утверждение. ТОЛЬКО суть |
| `confidence` | float 0.0–1.0 | По единой шкале ниже |
| `tags` | массив 3–5 строк | Поисковые теги |

### Очень важные (warning при отсутствии)

| Поле | Для кого обязательно | Описание |
|------|---------------------|----------|
| `formal_notation` | `law`, `theorem`, `formula`, `axiom`, `inference_rule` | Формальная запись |
| `conditions` | все типы | Условия применимости |
| `limits` | `law`, `principle`, `postulate` | Где НЕ работает |
| `prereq` | все | Что нужно знать заранее (массив id) |
| `derives_from` | `theorem`, `corollary`, `formula` | Из каких законов следует |

### Tier-специфичные (через `tier_extensions`)

```json
"tier_extensions": {

  // для tier = "invariant" (если есть история открытия)
  "esm_target": "ImmutableCore",
  "discovered_by": "...",
  "year": 1905,

  // для tier = "variant"
  "source": "Nature, 2024",
  "valid_from": "2024-01-01",
  "valid_until": null,
  "has_disputes": true,
  "alternative_views": [{"claim": "...", "confidence": 0.6}],

  // для tier = "practical"
  "scale": "industrial",
  "success_rate": 0.97,
  "safety_critical": true,
  "safety_notes": "...",

  // для tier = "logic"
  "category": "fallacy",
  "is_axiomatic": false,
  "related_logic": ["rule.logic.modus_ponens"],

  // для tier = "variant" или "invariant" (биология, PERCEPTION)
  "object": "tree",
  "perceiver": "Passer domesticus",
  "perceiver_category": "bird",
  "affordances": ["perch", "shelter"],

  // для tier = "abstract"
  "abstract_type": "creativity",
  "human_only": false,
  "related_abstract": ["abstract.imagination.thought_experiment"],

  // для tier = "frontier"
  "status": "open",
  "partial_results": "...",
  "competing_approaches": ["string theory", "LQG"]
}
```

---

## 🏷️ РЕЕСТР ТИПОВ (type) — единственный допустимый список

### Математика и логика

| type | Описание |
|------|----------|
| `axiom` | Принимается без доказательства — математика/логика |
| `definition` | Точное описание понятия — договор о значении |
| `lemma` | Вспомогательное утверждение |
| `theorem` | Доказанное утверждение |
| `corollary` | Прямое следствие теоремы |
| `conjecture` | Правдоподобное, недоказанное |
| `formula` | Математическая/физическая запись |
| `inference_rule` | Правило вывода (modus ponens, резолюция…) |
| `law_of_thought` | Закон мышления (тождества, противоречия, исключённого третьего) |
| `fallacy` | Логическая ошибка (формальная или неформальная) |
| `bias` | Когнитивное искажение |
| `paradox` | Парадокс |

### Физика и естественные науки

| type | Описание |
|------|----------|
| `law` | Эмпирически подтверждённая закономерность |
| `principle` | Фундаментальный принцип |
| `postulate` | Основа теории без доказательства |
| `constant` | Неизменная физическая или математическая величина |
| `effect` | Наблюдаемое явление |
| `model` | Упрощённое описание реальности |

### Универсальные

| type | Описание |
|------|----------|
| `concept` | Базовое понятие |
| `fact` | Установленный факт вне других типов |
| `relation` | Отношение между объектами |
| `mechanism` | Описание механизма работы |
| `pattern` | Повторяющийся паттерн |

### Прикладные

| type | Описание |
|------|----------|
| `process` | Технологический/промышленный/биологический процесс |
| `technology` | Конкретная технология |
| `method` | Метод или методика |
| `material` | Вещество или материал с характеристиками |

### Эпистемические

| type | Описание |
|------|----------|
| `estimate` | Оценка с погрешностью или неопределённостью |
| `hypothesis` | Гипотеза — не подтверждена |
| `open_problem` | Явно сформулированная нерешённая задача |

**Итого: 26 типов.** `validate.py` блокирует любое значение вне этого списка.

### Дерево решений для выбора type

```
Принимается без доказательства?
  → математика/логика         → axiom
  → физика/наука              → postulate
  → закон мышления            → law_of_thought

Доказывается?
  → вспомогательное           → lemma
  → основное                  → theorem
  → следствие                 → corollary
  → правило вывода            → inference_rule
  → недоказанное              → conjecture

Подтверждено экспериментом?
  → закономерность            → law
  → принцип                   → principle
  → явление                   → effect
  → упрощение реальности      → model

Неизменная величина?          → constant
Точное описание понятия?      → definition
Базовое понятие?              → concept
Договор о значении?           → definition
Технологический процесс?      → process / technology / method
Вещество/материал?            → material
Изменяемый факт?              → fact / estimate
Гипотеза?                     → hypothesis
Нерешённая задача?            → open_problem
Логическая ошибка?            → fallacy
Когнитивное искажение?        → bias
Парадокс?                     → paradox
Механизм работы?              → mechanism
Повторяющийся паттерн?        → pattern
Отношение объект-субъект?     → relation
```

---

## 🏗️ РЕЕСТР ТИРОВ (tier) — две оси в одной схеме

`tier` — это эпистемический тип факта. Решает куда факт попадает в системе Velantrim.

| tier | ESM target | confidence | Описание |
|------|-----------|:----------:|----------|
| `invariant` | `ImmutableCore` / `Validated` | 0.90–1.0 | Не изменится через 50 лет |
| `variant` | `Supported` | 0.40–0.90 | Меняется — нужна дата и источник |
| `practical` | `Validated` / `Supported` | 0.70–0.95 | Процессы и технологии |
| `logic` | `ImmutableCore` / `Validated` | 0.80–1.0 | Правила мышления и рассуждения |
| `frontier` | `Hypothesized` | 0.10–0.60 | Открытые проблемы, конкурирующие гипотезы |
| `abstract` | `Supported` | 0.50–0.90 | Механизмы разума, паттерны истории |

**Связь с файлами TZ:**

| TZ файл | tier факта |
|---------|-----------|
| TZ_CORE_01 Физика | `invariant` |
| TZ_CORE_02 Математика | `invariant` |
| TZ_CORE_03 Химия | `invariant` |
| TZ_CORE_04 Минералы | `invariant` + `variant` (свойства) |
| TZ_CORE_05 Биология | `invariant` |
| TZ_CORE_06 Логика | `logic` |
| TZ_CORE_07 Вариант | `variant` |
| TZ_CORE_08 Практика | `practical` |
| TZ_CORE_09 Фронтир | `frontier` |
| TZ_CORE_10 Абстрактное | `abstract` |

---

## ⚖️ ЕДИНАЯ ШКАЛА confidence

Один стандарт для всех файлов и всех типов.

| Значение | Смысл | Типичные type |
|----------|-------|--------------|
| `1.0` | Математическая истина / аксиома / логический закон | `axiom`, `law_of_thought`, `definition`, `inference_rule` |
| `0.95–0.99` | Общепринятый эмпирический закон | `law`, `principle`, `postulate` |
| `0.90–0.95` | Хорошо подтверждённая теорема или факт | `theorem`, `corollary`, `formula`, `constant` |
| `0.70–0.90` | Стабильно подтверждённое, возможны уточнения | `fact`, `model`, `effect`, `process` |
| `0.50–0.70` | Есть споры или неопределённость | `estimate`, `hypothesis`, `pattern`, `mechanism` |
| `0.30–0.50` | Гипотеза или конкурирующая парадигма | `hypothesis`, `open_problem`, `conjecture` |
| `0.10–0.30` | Спекулятивное или слабо подтверждённое | `conjecture`, `open_problem` |

**Правила:**
- `confidence = 1.0` только для `axiom`, `law_of_thought`, `definition`, `inference_rule`
- `confidence = 1.0` при `type = law` → **ОШИБКА** → должно быть ≤ 0.99
- `confidence = 1.0` при `type = fact` → **ОШИБКА** → факты не бывают абсолютными

---

## 🆔 ФОРМАТ id

**Правило:** минимум 3 сегмента, максимум 5. Разделитель — точка. Только строчные буквы и подчёркивания.

```
{type}.{domain}.{name}[.{qualifier}[.{index}]]
```

**Правильно:**
```
law.physics.mechanics.newton_2
theorem.math.geometry.pythagoras
axiom.math.set_theory.zfc_extensionality
concept.biology.cell.membrane
fallacy.logic.informal.ad_hominem
bias.logic.cognitive.confirmation
process.metallurgy.steel.bof
fact.geography.country.france
open_problem.math.number_theory.riemann
material.chemistry.minerals.quartz
```

**Неправильно:**
```
theorem.pythagoras          ← 2 сегмента — БЛОКИРУЕТСЯ
Law.Newton.2                ← заглавные буквы — БЛОКИРУЕТСЯ
law newton 2                ← пробелы — БЛОКИРУЕТСЯ
```

---

## 🔗 ТИПЫ РЁБЕР ГРАФА

При сборке `build_graph.py` создаёт рёбра из полей `prereq` и `derives_from`.

| Тип ребра | Источник | Семантика |
|-----------|---------|----------|
| `requires` | поле `prereq` | A не понять без B |
| `derived_from` | поле `derives_from` | A логически следует из B |
| `contradicts` | генерируется validate | A и B несовместимы |
| `supports` | для `frontier` фактов | A является свидетельством для B |
| `specializes` | когда `domain` A ⊂ `domain` B | A — частный случай B |

**Направление рёбер:**
```
A ──requires──► B       (A зависит от B)
A ──derived_from──► B   (A следует из B)
A ──contradicts──► B    (A и B несовместимы — двунаправленное)
```

---

## 🗂️ Реестр collected.json

```json
{
  "schema_version": "3.2",
  "last_updated": "2026-05-27T12:00:00",
  "total_facts": 0,
  "by_tier": {
    "invariant": 0,
    "variant": 0,
    "practical": 0,
    "logic": 0,
    "frontier": 0,
    "abstract": 0
  },
  "by_domain": {},
  "batches": [],
  "all_ids": [],
  "covered_subtopics": []
}
```

---

## 🧪 validate.py v3.2 — Правила

### 🔴 Критические ошибки (блокируют батч)

```python
CRITICAL = [
    "schema_version != '3.2'",
    "отсутствует обязательное поле",
    "id не соответствует формату a.b.c (≥3 сегмента, строчные, без пробелов)",
    "type не из реестра 26 типов",
    "tier не из реестра 6 тиров",
    "confidence вне диапазона 0.0–1.0",
    "confidence = 1.0 при type ∈ {law, theorem, fact, model, effect, process}",
    "дубль id внутри батча",
    "дубль id в реестре collected.json",
    "запрещённые поля на корневом уровне: title, examples, why_it_matters, common_confusions, level"
]
```

### ⚠️ Предупреждения (не блокируют)

```python
WARNINGS = [
    "нет formal_notation при type ∈ {law, theorem, formula, axiom, inference_rule}",
    "нет limits при type ∈ {law, principle, postulate}",
    "нет conditions",
    "пустой prereq — факт-сирота",
    "пустой derives_from при type ∈ {theorem, corollary, formula}",
    "statement длиннее 250 символов",
    "менее 3 тегов",
    "для tier=variant нет tier_extensions.source",
    "для tier=variant нет tier_extensions.valid_from",
    "для tier=practical нет tier_extensions.scale",
    "для tier=practical нет tier_extensions.success_rate"
]
```

### 🟡 Педагогические сигналы в statement (предупреждения)

```python
PEDAGOGICAL_SIGNALS = [
    "для того чтобы", "позволяет нам", "используется для",
    "помогает нам", "мы можем", "можно использовать",
    "это важно", "стоит отметить", "следует помнить",
    "например", "допустим", "представьте",
    "нужно вычислить", "необходимо найти", "чтобы решить",
    "шаг", "алгоритм", "подставим", "раскроем",
    "означает что", "то есть", "иными словами",
    "другими словами", "таким образом", "отсюда следует что",
    "применяется в", "широко используется", "на практике",
    "в реальной жизни", "в быту", "инженеры используют"
]
```

### Связка type → допустимый confidence

```python
TYPE_CONFIDENCE_RULES = {
    "axiom":          (1.0,  1.0),
    "law_of_thought": (1.0,  1.0),
    "definition":     (1.0,  1.0),
    "inference_rule": (1.0,  1.0),
    "law":            (0.90, 0.99),
    "principle":      (0.90, 0.99),
    "postulate":      (0.90, 0.99),
    "theorem":        (0.90, 1.0),
    "corollary":      (0.90, 1.0),
    "formula":        (0.90, 1.0),
    "constant":       (0.95, 1.0),
    "lemma":          (0.90, 1.0),
    "conjecture":     (0.30, 0.75),
    "fact":           (0.40, 0.95),
    "estimate":       (0.40, 0.90),
    "hypothesis":     (0.10, 0.65),
    "open_problem":   (0.10, 0.60),
    "effect":         (0.70, 0.99),
    "model":          (0.60, 0.95),
    "process":        (0.70, 0.99),
    "technology":     (0.70, 0.99),
    "method":         (0.70, 0.99),
    "material":       (0.70, 0.99),
    "fallacy":        (0.90, 1.0),
    "bias":           (0.80, 0.99),
    "paradox":        (0.85, 1.0),
    "concept":        (0.70, 1.0),
    "relation":       (0.60, 0.95),
    "mechanism":      (0.50, 0.95),
    "pattern":        (0.40, 0.90),
}
```

---

## 🤖 Канонический промпт для collect.py

```
Ты собираешь машинную базу знаний для AI-системы Velantrim.

ЗАДАЧА: Собери РОВНО 25 фактов по теме: {SUBTOPIC}
Домен: {DOMAIN}
Тир: {TIER}

СХЕМА (schema_version = "3.2"):
{
  "id":               "type.domain.subdom.name" — минимум 3 сегмента, строчные
  "schema_version":   "3.2"
  "domain":           "{DOMAIN}"
  "subtopic":         "{SUBTOPIC}"
  "tier":             "{TIER}"
  "type":             один из 26 допустимых — см. ниже
  "statement":        "..." — максимум 250 символов, ТОЛЬКО суть
  "formal_notation":  "..." — обязательно где есть формула/логическая запись
  "conditions":       "..." — при каких условиях работает
  "limits":           ["..."] — где НЕ работает (обязательно для law/principle/postulate)
  "prereq":           ["id1", "id2"] — что нужно знать заранее
  "derives_from":     ["id1"] — из каких законов следует
  "confidence":       число — по шкале ниже
  "tags":             ["tag1", "tag2", "tag3"] — 3–5 тегов
}

ДОПУСТИМЫЕ type:
axiom, definition, lemma, theorem, corollary, conjecture, formula,
inference_rule, law_of_thought, fallacy, bias, paradox,
law, principle, postulate, constant, effect, model,
concept, fact, relation, mechanism, pattern,
process, technology, method, material,
estimate, hypothesis, open_problem

ШКАЛА confidence:
1.0       — аксиома, закон мышления, определение, правило вывода
0.95–0.99 — эмпирический закон, принцип, постулат
0.90–0.95 — теорема, следствие, формула, константа
0.70–0.90 — хорошо подтверждённый факт, модель, эффект
0.50–0.70 — есть споры, оценки с неопределённостью
0.10–0.50 — гипотезы, открытые проблемы

УЖЕ ЗАНЯТЫЕ id (НЕ ИСПОЛЬЗОВАТЬ):
{EXISTING_IDS}

УЖЕ ПОКРЫТЫЕ подтемы (НЕ ПОВТОРЯТЬ):
{COVERED_SUBTOPICS}

ПРАВИЛА:
- statement — максимум 1–2 предложения, только суть
- formal_notation — ОБЯЗАТЕЛЬНО где есть математическая запись
- limits — ОБЯЗАТЕЛЬНО для type = law, principle, postulate
- prereq — ссылайся на уже занятые id где возможно
- НЕ ДОБАВЛЯЙ поля: title, examples, why_it_matters, common_confusions, level
- НЕ ИСПОЛЬЗУЙ педагогику: "это важно", "например", "используется для"...

ОТВЕТ: только валидный JSON массив из 25 элементов. Никакого текста вокруг.
```

---

## 📊 Таблица файлов TZ и плановые объёмы

| Файл | Домен | Tier | Единиц | Батчей |
|------|-------|------|:------:|:------:|
| TZ_CORE_01_PHYSICS | physics.* | invariant | 600–700 | 24–28 |
| TZ_CORE_02_MATH | math.* | invariant | 650–750 | 26–30 |
| TZ_CORE_03_CHEMISTRY | chemistry.* | invariant | 2 000–2 500 | 80–100 |
| TZ_CORE_04_MINERALS | geology.mineralogy.* | invariant + variant | 450–550 | 18–22 |
| TZ_CORE_05_BIOLOGY | biology.* | invariant | 600–700 | 24–28 |
| TZ_CORE_06_LOGIC | logic.* | logic | 800–900 | 32–36 |
| TZ_CORE_07_VARIANT | geography.* climate.* medicine.* astronomy.* | variant | 4 500–5 000 | 180–200 |
| TZ_CORE_08_PRACTICAL | metallurgy.* energy.* electronics.* medicine.tech.* | practical | 750–850 | 30–34 |
| TZ_CORE_09_FRONTIER | frontier.* | frontier | 400–500 | 16–20 |
| TZ_CORE_10_ABSTRACT | abstract.* | abstract | 180–220 | 8–10 |
| **ИТОГО** | | | **~11 000–13 000** | **~440–520** |

---

## 🔧 build_graph.py — формат выхода

```json
{
  "meta": {
    "schema_version": "3.2",
    "built_at": "2026-05-27T12:00:00",
    "total_nodes": 12000,
    "total_edges": 35000,
    "by_tier": {
      "invariant": 5000,
      "variant": 4700,
      "practical": 800,
      "logic": 820,
      "frontier": 450,
      "abstract": 200
    }
  },
  "nodes": [
    { ...факт v3.2... }
  ],
  "edges": [
    {
      "from": "theorem.math.geometry.pythagoras",
      "to":   "axiom.math.euclidean.postulate_5",
      "type": "derived_from"
    },
    {
      "from": "law.physics.mechanics.newton_2",
      "to":   "concept.physics.force",
      "type": "requires"
    }
  ]
}
```

---

## ✅ Чек-лист батча (для каждого батча перед принятием)

```
☑ subtopic не покрыта в collected.json?
☑ Запустил collect.py --subtopic ... --tier ...?
☑ validate.py → 0 критических ошибок?
☑ 0 педагогических сигналов в statements?
☑ Все id в формате ≥3 сегментов, строчные?
☑ Все type из реестра 26 значений?
☑ confidence соответствует правилам type→confidence?
☑ Реестр collected.json обновился?
```

## ✅ Чек-лист перед build_graph

```
☑ check_links.py: оборванных prereq < 2%?
☑ Циклов нет?
☑ validate.py на всех батчах — 0 критических?
☑ build_graph.py запущен?
☑ graph.json создан и meta.total_nodes совпадает с реестром?
```

---

## 🚀 Порядок старта

```
1. Создать структуру папок
2. Написать schema.json (JSON Schema Draft 2020-12) по этому документу
3. Написать validate.py с правилами из раздела "validate.py v3.2"
4. Написать collect.py — чтение реестра + промпт + сохранение
5. Первый батч: physics.mechanics.laws — 25 фактов вручную
6. Прогнать validate.py на нём
7. Убедиться что pipeline работает на 25 фактах
8. Написать check_links.py
9. Написать build_graph.py
10. Проверить граф на 25 фактах
11. Масштабировать через TZ_CORE_01..10
```

---

## 🔗 Как науки связаны в графе

```
Логика ◄─────────────── Математика
                              │
                              ▼
                           Физика ──────────────────── Астрономия
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
                 Химия              Геология
                    │
                    ▼
                Биохимия
                    │
                    ▼
               Биология
          ┌──────┬──┴──────┐
          ▼      ▼         ▼
       Ботаника Зоол.  Микробиол.
                         │
                    Анатомия чел.
                         │
                    Нейронауки
                         │
                    Психология

Математика + Логика ──► CS / Информатика
Математика ──────────► Экономика
Физика + Химия ──────► Геология + Экология
```

---

## ⚠️ Что НЕ собираем в Core KB

```
🚫 Перечни всех видов живых существ → это Encyclopedia layer
🚫 Все 6 145 минералов → берём топ-500 по значимости
🚫 Все 25 703 ISO стандарта → берём принципы технологий
🚫 Все 13 323 теоремы MathWorld → берём ~700 ключевых
🚫 Конкретные версии ПО и протоколов → вариантное, устаревает
🚫 Исторический контекст и биографии учёных → педагогика
🚫 Объяснения и аналогии → генерируются LLM на лету
🚫 Упражнения и примеры → педагогика
```

---

*Velantrim · TZ_CORE_00_MASTER · Schema v3.2 · 27 мая 2026*  
*Следующий файл: TZ_CORE_01_PHYSICS.md*
