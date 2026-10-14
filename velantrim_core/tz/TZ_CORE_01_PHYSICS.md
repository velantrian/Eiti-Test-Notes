# ⚛️ TZ_CORE_01_PHYSICS — Физика
**Схема:** v3.2 · **Tier:** invariant  
**Единиц:** 600–700 · **Батчей:** 25–28  
**Читать сначала:** TZ_CORE_00_MASTER.md

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `physics.mechanics.kinematics` | Кинематика — движение без причин | 25 | P0 |
| `physics.mechanics.dynamics` | Динамика — законы Ньютона, силы | 25 | P0 |
| `physics.mechanics.statics` | Статика, равновесие, момент силы | 15 | P1 |
| `physics.mechanics.fluid` | Гидро/аэростатика и динамика | 20 | P1 |
| `physics.mechanics.oscillations` | Колебания, маятник, резонанс | 20 | P1 |
| `physics.waves` | Волны, интерференция, дифракция | 20 | P1 |
| `physics.thermodynamics.laws` | 0–3 начала термодинамики | 25 | P0 |
| `physics.thermodynamics.statistical` | Стат. физика, энтропия, распределения | 20 | P2 |
| `physics.thermodynamics.heat_transfer` | Теплопроводность, конвекция, излучение | 15 | P2 |
| `physics.electromagnetism.electrostatics` | Кулон, поле, потенциал, Гаусс | 25 | P0 |
| `physics.electromagnetism.current` | Ток, ОМ, Кирхгоф, Джоуль-Ленц | 20 | P0 |
| `physics.electromagnetism.magnetism` | Магнитное поле, Био-Савар, Ампер | 20 | P1 |
| `physics.electromagnetism.induction` | Фарадей, Ленц, самоиндукция | 15 | P1 |
| `physics.electromagnetism.maxwell` | Уравнения Максвелла, ЭМ волны | 15 | P0 |
| `physics.optics.geometric` | Отражение, преломление, линзы, призмы | 20 | P1 |
| `physics.optics.wave` | Интерференция, дифракция, поляризация | 15 | P2 |
| `physics.optics.quantum` | Фотоэффект, Комптон, де Бройль | 15 | P1 |
| `physics.quantum.principles` | Постулаты КМ, принцип неопределённости, суперпозиция | 25 | P0 |
| `physics.quantum.atomic` | Модели атома, квантовые числа, спектры | 20 | P1 |
| `physics.quantum.nuclear` | Ядро, радиоактивность, реакции синтеза/деления | 15 | P1 |
| `physics.relativity.special` | СТО — постулаты, следствия, E=mc² | 20 | P0 |
| `physics.relativity.general` | ОТО — принцип эквивалентности, кривизна | 15 | P1 |
| `physics.particle` | Стандартная модель, фундаментальные частицы | 20 | P2 |
| `physics.constants` | Фундаментальные константы CODATA 2022 | 40 | P0 |
| `physics.condensed_matter` | Зонная теория, проводники/п/п/диэл, сверхпроводимость | 15 | P2 |

---

## 🔑 Примеры записей

### Пример 1 — закон (law)
```json
{
  "id": "law.physics.thermodynamics.second",
  "schema_version": "3.2",
  "domain": "physics.thermodynamics",
  "subtopic": "physics.thermodynamics.laws",
  "tier": "invariant",
  "type": "law",
  "statement": "Энтропия изолированной системы не убывает при самопроизвольных процессах; для обратимых ΔS=0, для необратимых ΔS>0.",
  "formal_notation": "dS ≥ δQ/T; ΔS_universe ≥ 0",
  "conditions": "Термодинамическое равновесие или квазистатические процессы",
  "limits": [
    "Не применимо к открытым системам обменивающимся энтропией с окружением",
    "Флуктуации могут локально нарушать при N→1 (теорема флуктуаций Крукса)"
  ],
  "prereq": [
    "concept.physics.entropy",
    "concept.physics.thermodynamic_system",
    "law.physics.thermodynamics.first"
  ],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["thermodynamics", "entropy", "irreversibility", "second_law"]
}
```

### Пример 2 — константа (constant)
```json
{
  "id": "constant.physics.fundamental.speed_of_light",
  "schema_version": "3.2",
  "domain": "physics.constants",
  "subtopic": "physics.constants",
  "tier": "invariant",
  "type": "constant",
  "statement": "Скорость света в вакууме — фундаментальная константа, определяющая верхний предел скорости передачи информации и энергии.",
  "formal_notation": "c = 299 792 458 м/с (точно, по определению СИ с 1983)",
  "conditions": "Вакуум; определена точно через определение метра",
  "limits": [
    "В среде фазовая скорость v = c/n < c, но групповая скорость сигнала ≤ c"
  ],
  "prereq": ["postulate.physics.relativity.light_speed_invariance"],
  "derives_from": [],
  "confidence": 1.0,
  "tags": ["constant", "relativity", "light", "CODATA"],
  "tier_extensions": {
    "esm_target": "ImmutableCore",
    "discovered_by": "определена через SI",
    "year": 1983
  }
}
```

### Пример 3 — принцип (principle)
```json
{
  "id": "principle.physics.quantum.uncertainty",
  "schema_version": "3.2",
  "domain": "physics.quantum",
  "subtopic": "physics.quantum.principles",
  "tier": "invariant",
  "type": "principle",
  "statement": "Невозможно одновременно точно измерить координату и импульс частицы: произведение неопределённостей ≥ ℏ/2.",
  "formal_notation": "Δx · Δp ≥ ℏ/2; ΔE · Δt ≥ ℏ/2",
  "conditions": "Квантовые объекты; следствие некоммутативности операторов",
  "limits": [
    "Не ограничение точности измерения — фундаментальное свойство природы",
    "Не применимо к классическим объектам (ℏ → 0)"
  ],
  "prereq": [
    "concept.physics.quantum.wavefunction",
    "concept.physics.quantum.operator_commutator"
  ],
  "derives_from": ["postulate.physics.quantum.state_superposition"],
  "confidence": 0.99,
  "tags": ["quantum", "heisenberg", "uncertainty", "measurement"]
}
```

---

## ✅ Что включать

```
✅ Все именованные физические законы (Ньютон, Фарадей, Кулон...)
✅ Все уравнения Максвелла в обеих формах (интегральной и дифференциальной)
✅ Все 4 начала термодинамики включая нулевое
✅ Все постулаты квантовой механики
✅ Все постулаты СТО и принцип эквивалентности ОТО
✅ Фундаментальные константы CODATA 2022 (c, h, ℏ, G, e, mₑ, mₚ, kB, NA, ε₀, μ₀, α, Ry)
✅ Ключевые производные формулы из каждой области
✅ Эффекты с именем (эффект Доплера, Холла, Комптона, Мёссбауэра...)
✅ Модели (атом Бора, идеальный газ, жёсткое тело, точечная масса)
✅ limits для ВСЕХ law, principle, postulate — обязательно
```

## 🚫 Что НЕ включать

```
🚫 Историю открытий и биографии физиков
🚫 Задачи и примеры решений
🚫 Конкретные числовые результаты экспериментов (кроме констант)
🚫 Технологические применения → это TZ_CORE_08_PRACTICAL
🚫 Астрономию → только если фундаментальный закон (Кеплер — да, характеристики Марса — нет)
```

---

## 🔗 Кросс-ссылки с другими доменами

| Куда | Пример |
|------|--------|
| `math.*` | `prereq: ["theorem.math.calculus.fundamental"]` для формул |
| `chemistry.*` | термохимия, квантовая химия ссылаются на КМ |
| `biology.*` | термодинамика клетки ссылается на термодинамику |
| `physics.constants` | все законы ссылаются на свои константы |

---

## ⚙️ Порядок сбора батчей

```
P0 первыми (фундамент для всего остального):
  1. physics.constants          ← без этого нет formal_notation
  2. physics.mechanics.dynamics ← Ньютон — prereq для половины физики
  3. physics.thermodynamics.laws
  4. physics.electromagnetism.electrostatics
  5. physics.electromagnetism.maxwell
  6. physics.quantum.principles
  7. physics.relativity.special

P1 после (используют P0 как prereq):
  8–18: остальные подтемы механики, оптики, квантовой

P2 последними:
  19–25: стат. физика, конденсированные среды, частицы
```
