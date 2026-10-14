# 🔭 TZ_CORE_09_FRONTIER — Граница знания
**Схема:** v3.2 · **Tier:** frontier  
**Единиц:** 400–500 · **Батчей:** 16–20  
**Читать сначала:** TZ_CORE_00_MASTER.md

> **Принцип:** явно сформулированная нерешённая задача.
> confidence ВСЕГДА < 0.60. has_disputes = true по умолчанию.

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `frontier.math.millennium` | 6 нерешённых задач тысячелетия Clay | 30 | P0 |
| `frontier.math.open_problems` | Топ-50 открытых проблем Open Problems Garden | 50 | P0 |
| `frontier.physics.quantum_gravity` | Квантовая гравитация: струны vs LQG vs E8 | 25 | P0 |
| `frontier.physics.dark_sector` | Тёмная материя и тёмная энергия — природа | 20 | P0 |
| `frontier.physics.foundations` | Проблема измерения КМ, интерпретации, стрела времени | 20 | P0 |
| `frontier.physics.unsolved` | ~50 прочих открытых проблем физики | 50 | P1 |
| `frontier.biology.consciousness` | Hard problem, IIT, GWT, HOT, PP — теории сознания | 30 | P0 |
| `frontier.biology.origin_of_life` | RNA-world, metabolism-first, panspermia — статус | 20 | P0 |
| `frontier.biology.aging` | Теории старения: программа vs повреждение | 15 | P1 |
| `frontier.biology.unsolved` | ~40 прочих открытых проблем биологии/нейронауки | 40 | P1 |
| `frontier.cs.complexity` | P vs NP, PSPACE, конкретные открытые проблемы | 25 | P0 |
| `frontier.cs.ai_alignment` | Подходы и нерешённые проблемы AGI alignment | 20 | P1 |
| `frontier.technology.fusion` | Статус ITER, NIF, private fusion — где стоим | 15 | P1 |
| `frontier.technology.superconductivity` | Комнатная температура — статус 2025–2026 | 15 | P1 |
| `frontier.technology.quantum_computing` | Квантовая коррекция ошибок — где порог | 15 | P1 |
| `frontier.paradigms.contested` | Конкурирующие научные парадигмы с аргументами сторон | 30 | P2 |

---

## 🔑 Примеры записей

### Пример 1 — открытая проблема (open_problem)
```json
{
  "id": "open_problem.frontier.math.riemann_hypothesis",
  "schema_version": "3.2",
  "domain": "frontier.math",
  "subtopic": "frontier.math.millennium",
  "tier": "frontier",
  "type": "open_problem",
  "statement": "Все нетривиальные нули дзета-функции Римана лежат на критической прямой Re(s)=1/2. Не доказано и не опровергнуто.",
  "formal_notation": "ζ(s) = Σ n^{-s}; все нули с 0<Re(s)<1 предположительно на Re(s)=1/2",
  "conditions": "Проверено численно для первых >10¹³ нулей",
  "limits": [],
  "prereq": [
    "definition.math.complex_analysis.riemann_zeta",
    "theorem.math.number_theory.prime_number_theorem"
  ],
  "derives_from": [],
  "confidence": 0.45,
  "tags": ["Riemann", "zeta_function", "Millennium_Prize", "number_theory"],
  "tier_extensions": {
    "status": "open",
    "partial_results": "Доказано что нули симметричны; >10¹³ нулей подтверждено численно",
    "competing_approaches": ["функциональный анализ", "случайные матрицы", "квантовый хаос"],
    "prize": "Clay Millennium Prize $1M",
    "has_disputes": false
  }
}
```

### Пример 2 — конкурирующая парадигма (hypothesis)
```json
{
  "id": "hypothesis.frontier.physics.dark_matter.wimp",
  "schema_version": "3.2",
  "domain": "frontier.physics",
  "subtopic": "frontier.physics.dark_sector",
  "tier": "frontier",
  "type": "hypothesis",
  "statement": "WIMP-гипотеза: тёмная материя состоит из слабо взаимодействующих массивных частиц массой 10–1000 ГэВ/c², не обнаружены прямыми детекторами до 2026.",
  "formal_notation": "m_WIMP ~ 10–10³ ГэВ/c²; σ_SI < 10⁻⁴⁷ см² (LUX-ZEPLIN 2023)",
  "conditions": null,
  "limits": [],
  "prereq": ["concept.physics.standard_model.beyond", "concept.cosmology.dark_matter"],
  "derives_from": [],
  "confidence": 0.35,
  "tags": ["dark_matter", "WIMP", "BSM", "direct_detection"],
  "tier_extensions": {
    "status": "open",
    "partial_results": "LUX-ZEPLIN 2023 установил нижний предел σ < 6×10⁻⁴⁸ см² — не обнаружено",
    "competing_approaches": ["аксионы", "стерильные нейтрино", "примордиальные ЧД", "MOND"],
    "has_disputes": true
  }
}
```

---

## ✅ Правила для frontier фактов

```
✅ confidence ВСЕГДА 0.10–0.60 (не выше!)
✅ tier_extensions.status: "open" / "partially_solved" / "contested"
✅ tier_extensions.partial_results — что УЖЕ известно
✅ tier_extensions.competing_approaches — список альтернатив
✅ tier_extensions.has_disputes: true для конкурирующих парадигм
✅ Для Millennium Problems: tier_extensions.prize с суммой
✅ statement описывает ПРОБЛЕМУ, не решение
✅ formal_notation содержит формулировку проблемы, не ответ
```

---
---

# 🌌 TZ_CORE_10_ABSTRACT — Абстрактное мышление
**Схема:** v3.2 · **Tier:** abstract  
**Единиц:** 180–220 · **Батчей:** 8–10  
**Читать сначала:** TZ_CORE_00_MASTER.md

> **Принцип:** механизмы разума, воображения, понимания и
> межнаучные паттерны. Не педагогика — суть механизмов.

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `abstract.cognition.concepts` | Понятие, категоризация, прототип, теория концептов | 25 | P0 |
| `abstract.cognition.metaphor` | Концептуальная метафора как механизм (Лакофф) | 20 | P0 |
| `abstract.cognition.imagination` | Мысленный эксперимент, контрфактуальное мышление | 20 | P0 |
| `abstract.cognition.intuition` | Интуиция как механизм (Каннеман, tacit knowledge) | 15 | P1 |
| `abstract.systems.emergence` | Эмерджентность — определение и критерии | 15 | P0 |
| `abstract.systems.complexity` | Сложность, хаос, самоорганизация, аттракторы | 20 | P1 |
| `abstract.systems.feedback` | Отрицательная и положительная обратная связь | 15 | P0 |
| `abstract.patterns.cycles` | Исторические/биологические/экономические циклы | 20 | P1 |
| `abstract.patterns.power_law` | Степенные законы, длинный хвост, Парето | 15 | P1 |
| `abstract.patterns.network` | Малый мир, scale-free, хабы, каскадные отказы | 15 | P1 |
| `abstract.epistemology.knowledge_types` | Явное/неявное знание, приобретение, ограничения | 15 | P1 |
| `abstract.epistemology.models` | Все модели ложны, но некоторые полезны — Бокс | 10 | P1 |

---

## 🔑 Примеры записей

### Пример 1 — механизм (mechanism)
```json
{
  "id": "mechanism.abstract.systems.emergence",
  "schema_version": "3.2",
  "domain": "abstract.systems",
  "subtopic": "abstract.systems.emergence",
  "tier": "abstract",
  "type": "mechanism",
  "statement": "Эмерджентность: свойства системы возникают из взаимодействий компонентов и не сводятся к свойствам отдельных компонентов.",
  "formal_notation": null,
  "conditions": "Нелинейные взаимодействия между компонентами; критическое число компонентов",
  "limits": [
    "Не любая сложность эмерджентна — нужна невыводимость из компонентов",
    "Слабая эмерджентность (алгоритмически сводимая) vs сильная (нет)"
  ],
  "prereq": [
    "concept.abstract.systems.system",
    "concept.abstract.systems.nonlinearity"
  ],
  "derives_from": [],
  "confidence": 0.85,
  "tags": ["emergence", "systems", "complexity", "nonlinear"],
  "tier_extensions": {
    "abstract_type": "systems_principle",
    "human_only": false,
    "related_abstract": [
      "mechanism.abstract.systems.self_organization",
      "pattern.abstract.systems.phase_transition"
    ]
  }
}
```

### Пример 2 — паттерн (pattern)
```json
{
  "id": "pattern.abstract.statistics.power_law",
  "schema_version": "3.2",
  "domain": "abstract.patterns",
  "subtopic": "abstract.patterns.power_law",
  "tier": "abstract",
  "type": "pattern",
  "statement": "Степенной закон: малое число объектов обладает большей частью ресурса/влияния; P(x) ~ x^{-α}. Наблюдается в богатстве, городах, словах, землетрясениях.",
  "formal_notation": "P(x) ∝ x^{−α}; α > 1; log-log график — прямая линия",
  "conditions": "Проявляется в системах с предпочтительным присоединением или мультипликативными процессами",
  "limits": [
    "Часто ошибочно принимается за нормальное распределение",
    "Хвост обрезан физическими ограничениями"
  ],
  "prereq": [
    "formula.math.probability.distribution_power",
    "concept.abstract.systems.scale_invariance"
  ],
  "derives_from": [],
  "confidence": 0.88,
  "tags": ["power_law", "Pareto", "long_tail", "scale_free"],
  "tier_extensions": {
    "abstract_type": "statistical_pattern",
    "human_only": false,
    "related_abstract": ["pattern.abstract.network.scale_free"]
  }
}
```

---

## ✅ Правила для abstract фактов

```
✅ tier_extensions.abstract_type: cognition/systems/pattern/epistemology
✅ tier_extensions.human_only: true если только для людей
✅ tier_extensions.related_abstract: список родственных абстракций
✅ confidence 0.50–0.90 (абстракции проверяемы, но менее строго)
✅ formal_notation = null допустимо если нет формализации
✅ statement описывает МЕХАНИЗМ, не пример его проявления
```

## 🚫 Что НЕ включать

```
🚫 Конкретные исторические примеры (Рим пал → это illustration, не факт)
🚫 Философские позиции без механизма
🚫 Метафоры как объяснения (объяснять паттерн метафорой — педагогика)
🚫 Теории личности конкретных психологов → это история науки
```
