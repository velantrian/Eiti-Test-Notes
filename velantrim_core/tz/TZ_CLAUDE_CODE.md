# 🤖 TZ_CLAUDE_CODE — Pipeline сбора Velantrim Core KB
**Для:** Claude Code  
**Версия:** 1.0  
**Дата:** 27 мая 2026  
**Зависит от:** TZ_CORE_00_MASTER.md (schema v3.2)

---

## 🎯 Задача одной строкой

Реализовать CLI-pipeline для автоматизированного сбора знаний:  
`collect.py` → `validate.py` → `check_links.py` → `build_graph.py`

Один вызов:
```bash
python collect.py --subtopic physics.mechanics.dynamics --tier invariant
```
Должен: сгенерировать промпт → вызвать Anthropic API → получить 25 фактов → валидировать → обновить реестр → сохранить батч.

---

## 📁 Структура проекта (создать всё)

```
velantrim_core/
│
├── collect.py              ← главный скрипт сбора
├── validate.py             ← валидатор батча
├── check_links.py          ← проверка ссылочной целостности
├── build_graph.py          ← сборка графа
├── schema.json             ← JSON Schema Draft 2020-12
├── requirements.txt        ← зависимости
├── .env.example            ← пример env переменных
│
├── tz/
│   └── TZ_CORE_00_MASTER.md
│
├── prompts/
│   └── collect_batch.txt   ← канонический промпт (из MASTER)
│
├── data/
│   └── raw/                ← JSON батчи (создаётся автоматически)
│
├── registry/
│   └── collected.json      ← реестр (создаётся автоматически)
│
└── output/
    └── graph.json          ← итоговый граф (создаётся build_graph.py)
```

---

## ⚙️ Требования к окружению

```
Python >= 3.10
Зависимости (requirements.txt):
  anthropic>=0.25.0
  jsonschema>=4.21.0
  python-dotenv>=1.0.0
  click>=8.1.0

Переменная окружения:
  ANTHROPIC_API_KEY=sk-ant-...

Модель:
  claude-opus-4-5  (или claude-sonnet-4-5 для быстрой разработки)
```

`.env.example`:
```
ANTHROPIC_API_KEY=your_key_here
MODEL=claude-opus-4-5
MAX_TOKENS=8192
```

---

## 📦 schema.json (создать файл)

JSON Schema Draft 2020-12, описывающий один факт v3.2.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://velantrim.ai/schema/fact/3.2",
  "title": "Velantrim Fact v3.2",
  "type": "object",
  "required": [
    "id", "schema_version", "domain", "subtopic",
    "tier", "type", "statement", "confidence", "tags"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]+(\\.[a-z][a-z0-9_]*)*(\\.[a-z0-9_]+)?$",
      "description": "Минимум 3 сегмента, строчные, точка-разделитель"
    },
    "schema_version": {
      "type": "string",
      "const": "3.2"
    },
    "domain": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)*$"
    },
    "subtopic": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)*$"
    },
    "tier": {
      "type": "string",
      "enum": ["invariant", "variant", "practical", "logic", "frontier", "abstract"]
    },
    "type": {
      "type": "string",
      "enum": [
        "axiom", "definition", "lemma", "theorem", "corollary",
        "conjecture", "formula", "inference_rule", "law_of_thought",
        "fallacy", "bias", "paradox",
        "law", "principle", "postulate", "constant", "effect", "model",
        "concept", "fact", "relation", "mechanism", "pattern",
        "process", "technology", "method", "material",
        "estimate", "hypothesis", "open_problem"
      ]
    },
    "statement": {
      "type": "string",
      "maxLength": 250
    },
    "formal_notation": {
      "type": ["string", "null"]
    },
    "conditions": {
      "type": ["string", "null"]
    },
    "limits": {
      "type": "array",
      "items": {"type": "string"}
    },
    "prereq": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]+(\\.[a-z][a-z0-9_]*)*$"
      }
    },
    "derives_from": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]+(\\.[a-z][a-z0-9_]*)*$"
      }
    },
    "confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"},
      "minItems": 3,
      "maxItems": 5
    },
    "tier_extensions": {
      "type": "object"
    }
  },
  "additionalProperties": false
}
```

---

## 🗂️ registry/collected.json (начальное состояние)

Создать файл если не существует:

```json
{
  "schema_version": "3.2",
  "last_updated": "",
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

## 📜 prompts/collect_batch.txt

Сохранить канонический промпт как файл (подстановки через Python `.format()`):

```
Ты собираешь машинную базу знаний для AI-системы Velantrim.

ЗАДАЧА: Собери РОВНО 25 фактов по теме: {subtopic}
Домен: {domain}
Тир: {tier}

СХЕМА (schema_version = "3.2") — каждый факт:
{{
  "id":               "type.domain.subdom.name",
  "schema_version":   "3.2",
  "domain":           "{domain}",
  "subtopic":         "{subtopic}",
  "tier":             "{tier}",
  "type":             "один из 26 допустимых",
  "statement":        "макс 250 символов, только суть",
  "formal_notation":  "формула если есть, иначе null",
  "conditions":       "при каких условиях работает",
  "limits":           ["где НЕ работает"],
  "prereq":           ["id зависимостей"],
  "derives_from":     ["id законов из которых следует"],
  "confidence":       0.99,
  "tags":             ["tag1", "tag2", "tag3"]
}}

ДОПУСТИМЫЕ type:
axiom, definition, lemma, theorem, corollary, conjecture, formula,
inference_rule, law_of_thought, fallacy, bias, paradox,
law, principle, postulate, constant, effect, model,
concept, fact, relation, mechanism, pattern,
process, technology, method, material,
estimate, hypothesis, open_problem

ШКАЛА confidence:
1.0       → axiom, law_of_thought, definition, inference_rule
0.95–0.99 → law, principle, postulate
0.90–0.95 → theorem, corollary, formula, constant
0.70–0.90 → fact, model, effect, process
0.50–0.70 → estimate, mechanism, pattern
0.10–0.50 → hypothesis, open_problem, conjecture

УЖЕ ЗАНЯТЫЕ id — НЕ ИСПОЛЬЗОВАТЬ:
{existing_ids}

УЖЕ ПОКРЫТЫЕ подтемы — НЕ ПОВТОРЯТЬ:
{covered_subtopics}

ПРАВИЛА:
- statement: 1–2 предложения, только факт, без объяснений
- formal_notation: ОБЯЗАТЕЛЬНО для law/theorem/formula/axiom/inference_rule
- limits: ОБЯЗАТЕЛЬНО для law/principle/postulate
- prereq: ссылайся на уже занятые id где возможно
- НЕ ДОБАВЛЯЙ: title, examples, why_it_matters, common_confusions, level
- НЕ ИСПОЛЬЗУЙ педагогику в statement

ОТВЕТ: только валидный JSON массив из ровно 25 объектов.
Никакого текста до или после массива.
```

---

## 🐍 collect.py — полная спецификация

### CLI интерфейс

```bash
# Интерактивный режим (задаёт вопросы)
python collect.py

# Прямой запуск
python collect.py --subtopic physics.mechanics.dynamics --tier invariant

# Только вывести промпт (без вызова API — для ручного использования)
python collect.py --subtopic physics.mechanics.dynamics --tier invariant --dry-run

# Указать домен явно (иначе выводится из subtopic)
python collect.py --subtopic physics.mechanics.dynamics --tier invariant --domain physics.mechanics

# Использовать конкретную модель
python collect.py --subtopic math.calculus.limits --tier invariant --model claude-sonnet-4-5
```

### Логика работы (порядок шагов)

```
1. Загрузить registry/collected.json
   └─ Если не существует → создать с начальным состоянием

2. Проверить что subtopic не в covered_subtopics
   └─ Если уже покрыта → предупредить, спросить подтверждение

3. Вывести домен из subtopic если --domain не указан
   (physics.mechanics.dynamics → domain = physics.mechanics)

4. Загрузить шаблон из prompts/collect_batch.txt

5. Заполнить шаблон:
   - subtopic, domain, tier
   - existing_ids: первые 200 id из registry (чтобы не превышать контекст)
     Если id > 200 → передавать только id из того же domain
   - covered_subtopics: все из registry

6. Вызвать Anthropic API:
   model = env MODEL или аргумент
   max_tokens = 8192
   system = "Ты точный научный редактор. Возвращаешь только валидный JSON."
   user = заполненный промпт

7. Извлечь JSON из ответа:
   - Попробовать json.loads(response)
   - Если не получилось → найти [...] или ```json...``` → попробовать снова
   - Если не получилось → сохранить сырой ответ в data/raw/errors/ и выйти с ошибкой

8. Вызвать validate_batch(facts, registry) из validate.py
   - Если критические ошибки → вывести их, спросить "сохранить всё равно? [y/N]"
   - Если только warnings → вывести, сохранить автоматически

9. Сформировать имя файла:
   domain_parts = subtopic.replace(".", "_")
   batch_number = len(registry["batches"]) + 1
   filename = f"data/raw/{domain_parts}_{batch_number:03d}.json"

10. Сохранить батч в filename

11. Обновить registry:
    - all_ids: добавить все новые id
    - covered_subtopics: добавить subtopic
    - batches: добавить запись
    - total_facts: увеличить
    - by_tier[tier]: увеличить
    - by_domain[domain]: увеличить
    - last_updated: текущий timestamp ISO

12. Вывести итог:
    ✅ Сохранено: {filename}
    📊 Фактов в батче: 25
    📊 Всего в базе: {total}
    ⚠️  Предупреждений: N
```

### Функции

```python
def load_registry() -> dict
def save_registry(registry: dict) -> None
def load_prompt_template() -> str
def fill_prompt(template: str, subtopic: str, domain: str, tier: str, registry: dict) -> str
def call_anthropic_api(prompt: str, model: str) -> str
def extract_json_from_response(response: str) -> list[dict]
def save_batch(facts: list[dict], filename: str) -> None
def update_registry(registry: dict, facts: list[dict], subtopic: str, filename: str) -> dict
def main() -> None  # click entry point
```

---

## ✅ validate.py — полная спецификация

### CLI интерфейс

```bash
# Валидировать один батч
python validate.py data/raw/physics_mechanics_dynamics_001.json

# Валидировать все батчи
python validate.py --all

# Только показать summary без деталей
python validate.py data/raw/physics_mechanics_dynamics_001.json --summary

# Вернуть exit code 1 если есть warnings (для CI)
python validate.py data/raw/physics_mechanics_dynamics_001.json --strict
```

### Правила валидации

#### 🔴 Критические (exit code 1, блокируют)

```python
CRITICAL_RULES = {
    "missing_required_field": "Отсутствует обязательное поле: {field}",
    "invalid_schema_version": "schema_version должен быть '3.2', получен: {value}",
    "invalid_id_format": "id '{id}' не соответствует формату (≥3 сегмента, строчные a-z0-9_)",
    "invalid_type": "type '{type}' не из реестра допустимых значений",
    "invalid_tier": "tier '{tier}' не из: invariant/variant/practical/logic/frontier/abstract",
    "confidence_out_of_range": "confidence {value} вне [0.0, 1.0]",
    "confidence_type_mismatch": "confidence={value} недопустим для type='{type}' (ожидается {expected})",
    "duplicate_id_in_batch": "Дублирующийся id внутри батча: {id}",
    "duplicate_id_in_registry": "id '{id}' уже существует в реестре",
    "forbidden_field": "Запрещённое поле '{field}' присутствует (title/examples/why_it_matters/...)",
    "statement_too_long": "statement длиннее 250 символов ({length})"
}
```

#### ⚠️ Предупреждения (exit code 0, не блокируют)

```python
WARNING_RULES = {
    "missing_formal_notation": "Нет formal_notation для type='{type}' — рекомендуется",
    "missing_limits": "Нет limits для type='{type}' — рекомендуется",
    "missing_conditions": "Нет conditions",
    "empty_prereq": "Пустой prereq — факт-сирота",
    "empty_derives_from": "Пустой derives_from для type='{type}' — ожидается ссылка на закон",
    "few_tags": "Менее 3 тегов ({count})",
    "missing_tier_ext_source": "Нет tier_extensions.source для tier='variant'",
    "missing_tier_ext_valid_from": "Нет tier_extensions.valid_from для tier='variant'",
    "missing_tier_ext_scale": "Нет tier_extensions.scale для tier='practical'",
    "missing_tier_ext_success_rate": "Нет tier_extensions.success_rate для tier='practical'",
    "pedagogical_signal": "Педагогический сигнал '{signal}' в statement"
}
```

#### Шкала confidence по типам

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

#### Педагогические сигналы

```python
PEDAGOGICAL_SIGNALS = [
    "для того чтобы", "позволяет нам", "используется для",
    "помогает нам", "мы можем", "можно использовать",
    "это важно", "стоит отметить", "следует помнить",
    "например", "допустим", "представьте",
    "нужно вычислить", "необходимо найти", "чтобы решить",
    "шаг", "подставим", "раскроем",
    "означает что", "иными словами",
    "другими словами", "таким образом", "отсюда следует что",
    "применяется в", "широко используется", "на практике",
    "в реальной жизни", "в быту", "инженеры используют"
]
```

### Вывод валидации

```
Валидация: data/raw/physics_mechanics_dynamics_001.json
════════════════════════════════════════════════════
✅ Фактов: 25
🔴 Критических ошибок: 0
⚠️  Предупреждений: 3

  ⚠️  [fact #7]  Нет limits для type='law' — рекомендуется
  ⚠️  [fact #12] Пустой prereq — факт-сирота
  ⚠️  [fact #19] Педагогический сигнал 'используется для' в statement

────────────────────────────────────────────────────
✅ Батч принят (0 критических ошибок)
```

### Функции

```python
def validate_batch(facts: list[dict], registry: dict) -> ValidationResult
def validate_fact(fact: dict, index: int, existing_ids: set) -> list[ValidationIssue]
def check_id_format(id_str: str) -> bool
def check_confidence_range(type_str: str, confidence: float) -> tuple[bool, str]
def check_pedagogical_signals(statement: str) -> list[str]
def print_validation_report(result: ValidationResult) -> None
def main() -> None  # click entry point

@dataclass
class ValidationIssue:
    level: str  # "critical" | "warning"
    fact_index: int
    rule: str
    message: str

@dataclass
class ValidationResult:
    facts_count: int
    critical: list[ValidationIssue]
    warnings: list[ValidationIssue]
    is_valid: bool  # True если critical == []
```

---

## 🔗 check_links.py — полная спецификация

### CLI интерфейс

```bash
# Проверить все батчи
python check_links.py

# Проверить один батч
python check_links.py data/raw/physics_mechanics_dynamics_001.json

# Показать только статистику
python check_links.py --summary
```

### Логика

```
1. Загрузить все батчи из data/raw/*.json
2. Собрать множество всех id
3. Для каждого факта:
   a. Проверить prereq: все id существуют в базе?
      └─ Если нет → BROKEN LINK (warning, не критично — база пополняется)
   b. Проверить derives_from: все id существуют?
      └─ Если нет → BROKEN LINK
   c. Проверить циклы для однотипных рёбер:
      derived_from: A→B→A (граф направленный — DFS)
      requires: A→B→A
4. Вывести отчёт
```

### Вывод

```
Проверка ссылок: все батчи (12 файлов, 300 фактов)
════════════════════════════════════════════════════
🔗 Всего prereq ссылок: 847
🔗 Всего derives_from ссылок: 312

⚠️  Оборванных prereq: 23 (2.7%) — норма < 5%
⚠️  Оборванных derives_from: 8 (2.6%)
✅ Циклов: 0

Оборванные ссылки (топ-10):
  concept.physics.inertial_frame ← упоминается 7 раз, не собран
  concept.math.limit             ← упоминается 5 раз, не собран
  ...

💡 Рекомендация: собрать батч по subtopic physics.mechanics.concepts
```

---

## 🏗️ build_graph.py — полная спецификация

### CLI интерфейс

```bash
# Собрать граф из всех батчей
python build_graph.py

# Собрать только из определённого тира
python build_graph.py --tier invariant

# Указать путь к output
python build_graph.py --output output/graph_v1.json

# Вывести статистику без сохранения
python build_graph.py --dry-run
```

### Логика построения графа

```
1. Прочитать все JSON файлы из data/raw/
2. Дедупликация по id (последний батч выигрывает при конфликте)
3. Построить nodes: список всех фактов

4. Построить edges из полей:
   prereq     → тип ребра "requires"   (from=A, to=B: A requires B)
   derives_from → тип "derived_from"   (from=A, to=B: A derived from B)

5. Опциональные рёбра:
   Если два факта имеют related_logic/related_abstract/related_perceptions
   в tier_extensions → тип "related"

6. Отфильтровать висячие рёбра (to не существует в nodes)
   Логировать количество отфильтрованных

7. Сформировать meta:
   built_at, total_nodes, total_edges, by_tier, by_domain

8. Сохранить output/graph.json
```

### Формат graph.json

```json
{
  "meta": {
    "schema_version": "3.2",
    "built_at": "2026-05-27T12:00:00",
    "total_nodes": 300,
    "total_edges": 1200,
    "by_tier": {
      "invariant": 150,
      "variant": 80,
      "practical": 30,
      "logic": 25,
      "frontier": 10,
      "abstract": 5
    },
    "by_domain": {
      "physics.mechanics": 25,
      "math.calculus": 25
    },
    "dangling_edges_filtered": 23
  },
  "nodes": [
    {
      "id": "law.physics.mechanics.newton_2",
      "tier": "invariant",
      "type": "law",
      "domain": "physics.mechanics",
      "statement": "...",
      "confidence": 0.99,
      "tags": ["mechanics", "newton", "dynamics"]
    }
  ],
  "edges": [
    {
      "from": "law.physics.mechanics.newton_2",
      "to": "concept.physics.force",
      "type": "requires"
    },
    {
      "from": "theorem.physics.mechanics.work_energy",
      "to": "law.physics.mechanics.newton_2",
      "type": "derived_from"
    }
  ]
}
```

---

## 🖥️ Интерактивный режим collect.py

Если запустить без аргументов — показать меню:

```
╔═══════════════════════════════════════════╗
║   Velantrim Core KB — Сбор знаний v3.2   ║
╚═══════════════════════════════════════════╝

📊 Текущее состояние базы:
   Фактов всего: 300
   Батчей: 12
   invariant: 150 | variant: 80 | practical: 30
   logic: 25 | frontier: 10 | abstract: 5

Введи subtopic (или 'list' для списка, 'q' для выхода):
> physics.mechanics.dynamics

Tier [invariant/variant/practical/logic/frontier/abstract] (invariant):
>

Модель [claude-opus-4-5/claude-sonnet-4-5] (claude-opus-4-5):
>

Только вывести промпт? [y/N]:
>

🚀 Запускаю сбор...
📡 Вызываю API...
✅ Получено 25 фактов
🔍 Валидация...
✅ 0 критических | ⚠️  2 предупреждения
💾 Сохранено: data/raw/physics_mechanics_dynamics_001.json
📊 Всего в базе: 325 фактов
```

---

## 🔁 retry и error handling

### collect.py

```python
# Если API вернул не-JSON:
# → попробовать ещё 2 раза с тем же промптом
# → если всё равно не JSON → сохранить в data/raw/errors/TIMESTAMP_subtopic.txt
# → вывести инструкцию для ручного копирования

# Если API вернул < 25 фактов:
# → вывести предупреждение "Получено N/25 фактов"
# → спросить "Сохранить частичный батч? [y/N]"

# Если API вернул > 25 фактов:
# → взять первые 25
# → вывести предупреждение

# Rate limit / network error:
# → подождать 30 секунд, повторить (максимум 3 раза)
```

---

## 🧪 Тесты

Написать `tests/test_validate.py` с pytest:

```python
# Тест 1: валидный факт проходит без ошибок
# Тест 2: отсутствующее обязательное поле → критическая ошибка
# Тест 3: неверный type → критическая ошибка
# Тест 4: confidence=1.0 для type=law → критическая ошибка
# Тест 5: id с 2 сегментами → критическая ошибка
# Тест 6: id с заглавными буквами → критическая ошибка
# Тест 7: педагогический сигнал в statement → warning
# Тест 8: нет limits для law → warning
# Тест 9: нет formal_notation для theorem → warning
# Тест 10: дублирующийся id в батче → критическая ошибка
# Тест 11: дублирующийся id в реестре → критическая ошибка
# Тест 12: forbidden field 'title' → критическая ошибка
```

Запуск:
```bash
pytest tests/ -v
```

---

## 📋 Порядок реализации для Claude Code

```
Шаг 1: Создать структуру папок
Шаг 2: Написать schema.json
Шаг 3: Написать validate.py + тесты
Шаг 4: Прогнать pytest — все тесты зелёные
Шаг 5: Написать collect.py (без API-вызова, только --dry-run)
Шаг 6: Написать collect.py API-вызов
Шаг 7: Протестировать на одном батче: python collect.py --subtopic physics.mechanics.dynamics --tier invariant
Шаг 8: Написать check_links.py
Шаг 9: Написать build_graph.py
Шаг 10: Полный прогон: collect → validate → check_links → build_graph
```

---

## ✅ Definition of Done

```
☑ pytest tests/ → 12/12 зелёных
☑ python collect.py --subtopic physics.mechanics.dynamics --tier invariant
  → файл создан, 25 фактов, 0 критических ошибок
☑ python validate.py data/raw/physics_mechanics_dynamics_001.json
  → вывод с отчётом
☑ python check_links.py
  → вывод со статистикой оборванных ссылок
☑ python build_graph.py
  → output/graph.json создан, total_nodes=25
☑ registry/collected.json обновлён корректно
☑ Повторный запуск --dry-run не изменяет реестр
```

---

*Velantrim · TZ_CLAUDE_CODE · v1.0 · 27 мая 2026*
