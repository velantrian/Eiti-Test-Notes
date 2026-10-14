# ⚖️ TZ_CORE_06_LOGIC — Логика и мышление
**Схема:** v3.2 · **Tier:** logic  
**Единиц:** 800–900 · **Батчей:** 32–36  
**Читать сначала:** TZ_CORE_00_MASTER.md

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `logic.formal.propositional` | Операторы, законы, таблицы истинности | 25 | P0 |
| `logic.formal.predicate` | Кванторы, предикаты, нормальные формы | 20 | P0 |
| `logic.formal.inference_rules` | Правила вывода (modus ponens, резолюция и др.) | 25 | P0 |
| `logic.formal.syllogisms` | 24 модуса Аристотеля, фигуры силлогизма | 25 | P0 |
| `logic.formal.laws_of_thought` | 3 закона мышления (тождества, противоречия, исключённого третьего) | 10 | P0 |
| `logic.formal.modal` | Системы K, T, S4, S5, оператор □ и ◇ | 20 | P1 |
| `logic.formal.proof_methods` | Прямое, от противного, индукция, контрапозиция | 15 | P0 |
| `logic.bayesian` | Теорема Байеса, prior/posterior, base rate | 20 | P0 |
| `logic.causal` | Лестница Pearl: ассоциация/интервенция/контрфактуал | 15 | P1 |
| `logic.fallacies.formal` | Формальные заблуждения (~50) | 50 | P0 |
| `logic.fallacies.informal` | Неформальные заблуждения (~130) | 130 | P0 |
| `logic.biases.memory` | Когнитивные искажения памяти (~30) | 30 | P0 |
| `logic.biases.social` | Социальные искажения (~40) | 40 | P0 |
| `logic.biases.probabilistic` | Вероятностные искажения (~35) | 35 | P0 |
| `logic.biases.decision` | Искажения принятия решений (~40) | 40 | P0 |
| `logic.biases.perception` | Перцептивные и когнитивные искажения (~40) | 40 | P0 |
| `logic.paradoxes.logical` | Логические парадоксы (~60) | 60 | P1 |
| `logic.paradoxes.epistemic` | Эпистемические парадоксы (~50) | 50 | P1 |
| `logic.paradoxes.probabilistic` | Вероятностные парадоксы (~50) | 50 | P1 |
| `logic.paradoxes.physical` | Физические парадоксы (~80) | 80 | P1 |
| `logic.paradoxes.economic` | Экономические и социальные парадоксы (~50) | 50 | P2 |
| `logic.argumentation` | Теория аргументации, структура довода, Тулмин | 15 | P1 |
| `logic.epistemology` | Теория познания — Геттье, виды знания, скептицизм | 20 | P2 |

---

## 🔑 Примеры записей

### Пример 1 — правило вывода (inference_rule)
```json
{
  "id": "inference_rule.logic.formal.modus_ponens",
  "schema_version": "3.2",
  "domain": "logic.formal",
  "subtopic": "logic.formal.inference_rules",
  "tier": "logic",
  "type": "inference_rule",
  "statement": "Если верно «если P то Q» и верно P, то верно Q.",
  "formal_notation": "P → Q, P ⊢ Q",
  "conditions": "P → Q истинна; P истинно",
  "limits": ["Не применимо при ложной посылке: если P ложно, Q может быть любым"],
  "prereq": [
    "definition.logic.propositional.implication",
    "definition.logic.propositional.truth_value"
  ],
  "derives_from": [],
  "confidence": 1.0,
  "tags": ["inference", "modus_ponens", "deduction", "propositional"],
  "tier_extensions": {
    "category": "valid_inference",
    "is_axiomatic": false
  }
}
```

### Пример 2 — когнитивное искажение (bias)
```json
{
  "id": "bias.logic.cognitive.confirmation",
  "schema_version": "3.2",
  "domain": "logic.biases",
  "subtopic": "logic.biases.decision",
  "tier": "logic",
  "type": "bias",
  "statement": "Склонность искать, интерпретировать и запоминать информацию, подтверждающую уже имеющиеся убеждения, игнорируя противоречащую.",
  "formal_notation": null,
  "conditions": "Срабатывает при наличии уже сформированного мнения и новой информации",
  "limits": [],
  "prereq": ["concept.logic.prior_belief", "concept.psychology.motivated_reasoning"],
  "derives_from": [],
  "confidence": 0.97,
  "tags": ["confirmation_bias", "reasoning", "epistemic", "Wason"],
  "tier_extensions": {
    "category": "epistemic_bias",
    "related_logic": [
      "bias.logic.cognitive.motivated_reasoning",
      "fallacy.logic.informal.cherry_picking"
    ]
  }
}
```

### Пример 3 — парадокс (paradox)
```json
{
  "id": "paradox.logic.probabilistic.monty_hall",
  "schema_version": "3.2",
  "domain": "logic.paradoxes",
  "subtopic": "logic.paradoxes.probabilistic",
  "tier": "logic",
  "type": "paradox",
  "statement": "После открытия ведущим проигрышной двери смена выбора повышает вероятность выигрыша с 1/3 до 2/3, что противоречит интуиции равновероятности.",
  "formal_notation": "P(win|switch) = 2/3; P(win|stay) = 1/3",
  "conditions": "Ведущий всегда открывает проигрышную дверь и знает где приз",
  "limits": ["Если ведущий открывает случайную дверь — вероятности равны 1/2"],
  "prereq": [
    "formula.math.probability.bayes",
    "concept.math.probability.conditional"
  ],
  "derives_from": [],
  "confidence": 1.0,
  "tags": ["paradox", "probability", "Monty_Hall", "Bayes"],
  "tier_extensions": {
    "category": "probabilistic_paradox"
  }
}
```

### Пример 4 — заблуждение (fallacy)
```json
{
  "id": "fallacy.logic.informal.ad_hominem",
  "schema_version": "3.2",
  "domain": "logic.fallacies",
  "subtopic": "logic.fallacies.informal",
  "tier": "logic",
  "type": "fallacy",
  "statement": "Атака на личность оппонента вместо разбора его аргументов; дискредитация источника не опровергает утверждение.",
  "formal_notation": "«X утверждает P; X — плохой человек; ∴ P ложно» — НЕВЕРНО",
  "conditions": "Срабатывает когда критика личности подаётся как опровержение аргумента",
  "limits": ["Иногда релевантно: доверие к источнику важно для эпистемической оценки — это не ad hominem"],
  "prereq": ["concept.logic.argument_structure", "concept.logic.relevance"],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["fallacy", "ad_hominem", "argumentation", "informal_logic"]
}
```

---

## ✅ Что включать

```
✅ ВСЕ ~188 когнитивных искажений из Cognitive Bias Codex (по одной записи каждое)
✅ ВСЕ ~150–200 логических заблуждений (формальных + неформальных)
✅ ВСЕ ~370 парадоксов из Wikipedia «List of paradoxes»
✅ ВСЕ 24 модуса аристотелевского силлогизма с именами (Barbara, Celarent...)
✅ Правило Байеса + интерпретация обновления убеждений
✅ Лестница причинности Джудеа Перла
✅ Модальная логика — системы K, T, S4, S5
✅ formal_notation для formal/inference_rule ОБЯЗАТЕЛЬНО
✅ formal_notation = null допустимо для fallacy/bias/paradox
```

## 🚫 Что НЕ включать

```
🚫 Математические теоремы теории доказательств → TZ_CORE_02_MATH
🚫 Конкретные психологические эксперименты → это иллюстрации
🚫 Нейробиологию искажений → TZ_CORE_05_BIOLOGY
```
