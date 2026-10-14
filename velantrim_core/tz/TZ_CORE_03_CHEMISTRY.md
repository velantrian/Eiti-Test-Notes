# 🧪 TZ_CORE_03_CHEMISTRY — Химия
**Схема:** v3.2 · **Tier:** invariant  
**Единиц:** 2 000–2 500 · **Батчей:** 80–100  
**Читать сначала:** TZ_CORE_00_MASTER.md

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `chemistry.laws` | Фундаментальные законы химии | 25 | P0 |
| `chemistry.atomic.structure` | Строение атома, квантовые числа, орбитали | 25 | P0 |
| `chemistry.atomic.periodic` | Периодический закон, тренды таблицы | 25 | P0 |
| `chemistry.bonding.ionic` | Ионная связь, кристаллические решётки | 20 | P0 |
| `chemistry.bonding.covalent` | Ковалентная связь, ВСПР, МО, гибридизация | 25 | P0 |
| `chemistry.bonding.metallic` | Металлическая связь, зонная теория | 15 | P1 |
| `chemistry.bonding.intermolecular` | Вандерваальс, водородная связь, диполь | 20 | P1 |
| `chemistry.thermochemistry` | Энтальпия, закон Гесса, теплоёмкость | 25 | P0 |
| `chemistry.thermodynamics` | ΔG, ΔH, ΔS, самопроизвольность реакций | 25 | P0 |
| `chemistry.kinetics` | Скорость реакции, Аррениус, порядок реакции | 25 | P0 |
| `chemistry.equilibrium` | Константа равновесия, принцип Ле Шателье | 20 | P0 |
| `chemistry.solutions` | Растворимость, осмос, Рауль, Вант-Гофф | 20 | P1 |
| `chemistry.acid_base` | Кислоты/основания, pH, буферы, гидролиз | 25 | P0 |
| `chemistry.electrochemistry` | Электролиз, ЭДС, ряд активности, Нернст | 25 | P0 |
| `chemistry.redox` | ОВР, степень окисления, полуреакции | 20 | P0 |
| `chemistry.gases` | Идеальный газ, Ван-дер-Ваальс, кинетическая теория | 20 | P0 |
| `chemistry.substances.elements` | Свойства элементов и простых веществ (по группам) | 80 | P0 |
| `chemistry.substances.inorganic` | Ключевые неорганические соединения | 80 | P0 |
| `chemistry.substances.organic.hydrocarbons` | Алканы, алкены, алкины, арены | 60 | P0 |
| `chemistry.substances.organic.functional` | Спирты, карбокислоты, эфиры, альдегиды, кетоны, амины | 80 | P0 |
| `chemistry.substances.organic.biomolecules` | Аминокислоты, нуклеотиды, сахара, липиды | 80 | P0 |
| `chemistry.substances.polymers` | Полимеры — строение, синтез, свойства | 40 | P1 |
| `chemistry.reactions.named` | Именные органические реакции (топ-100) | 100 | P1 |
| `chemistry.reactions.types` | Типы реакций — замещение, присоединение, элиминация | 30 | P0 |
| `chemistry.analytical` | Качественный и количественный анализ, спектроскопия | 30 | P2 |
| `chemistry.nuclear` | Ядерные реакции, изотопы, радиохимия | 20 | P2 |
| `chemistry.quantum` | Квантовая химия — МО, ТФД, конфигурационное взаимодействие | 25 | P2 |

---

## 🔑 Примеры записей

### Пример 1 — вещество (material)
```json
{
  "id": "material.chemistry.organic.biomolecule.atp",
  "schema_version": "3.2",
  "domain": "chemistry.substances",
  "subtopic": "chemistry.substances.organic.biomolecules",
  "tier": "invariant",
  "type": "material",
  "statement": "Аденозинтрифосфат — универсальный переносчик энергии в клетке; гидролиз γ-фосфатной связи освобождает ~30,5 кДж/моль.",
  "formal_notation": "C₁₀H₁₆N₅O₁₃P₃; ATP → ADP + Pᵢ ΔG° = −30,5 кДж/моль",
  "conditions": "При физиологических условиях (pH 7,4; Mg²⁺ как кофактор)",
  "limits": ["Нестабилен при экстремальных pH и температуре"],
  "prereq": [
    "concept.chemistry.phosphate_bond",
    "concept.biology.metabolism.energy"
  ],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["ATP", "biomolecule", "energy", "phosphate"],
  "tier_extensions": {
    "esm_target": "ImmutableCore"
  }
}
```

### Пример 2 — закон (law)
```json
{
  "id": "law.chemistry.thermochemistry.hess",
  "schema_version": "3.2",
  "domain": "chemistry.thermochemistry",
  "subtopic": "chemistry.thermochemistry",
  "tier": "invariant",
  "type": "law",
  "statement": "Тепловой эффект реакции не зависит от пути превращения и определяется только начальным и конечным состоянием системы.",
  "formal_notation": "ΔH_реакции = Σ ΔHf°(продукты) − Σ ΔHf°(реагенты)",
  "conditions": "Постоянное давление; энтальпия — функция состояния",
  "limits": ["Не учитывает кинетику и пути реакции"],
  "prereq": [
    "concept.chemistry.enthalpy",
    "law.physics.thermodynamics.first"
  ],
  "derives_from": ["law.physics.thermodynamics.first"],
  "confidence": 0.99,
  "tags": ["thermochemistry", "Hess", "enthalpy", "reaction_heat"]
}
```

### Пример 3 — именная реакция (method)
```json
{
  "id": "method.chemistry.reactions.diels_alder",
  "schema_version": "3.2",
  "domain": "chemistry.reactions",
  "subtopic": "chemistry.reactions.named",
  "tier": "invariant",
  "type": "method",
  "statement": "[4+2]-циклоприсоединение диена и диенофила с образованием шестичленного цикла; стереоспецифично (syn-присоединение, endo-правило).",
  "formal_notation": "диен (s-cis) + диенофил → циклогексен-производное; [4π + 2π]",
  "conditions": "Диен в s-cis конформации; диенофил с электроноакцепторной группой",
  "limits": [
    "Требует s-cis конформации диена (цикл возможен только тогда)",
    "Обратная реакция (ретро Дильс-Альдер) при высокой температуре"
  ],
  "prereq": [
    "concept.chemistry.diene",
    "concept.chemistry.cycloaddition",
    "concept.chemistry.frontier_orbitals"
  ],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["organic", "cycloaddition", "Diels-Alder", "named_reaction"]
}
```

### Пример 4 — аминокислота (material)
```json
{
  "id": "material.chemistry.biomolecule.aminoacid.glycine",
  "schema_version": "3.2",
  "domain": "chemistry.substances",
  "subtopic": "chemistry.substances.organic.biomolecules",
  "tier": "invariant",
  "type": "material",
  "statement": "Глицин — простейшая аминокислота без хирального центра; единственная не оптически активная стандартная аминокислота.",
  "formal_notation": "H₂N-CH₂-COOH; MW = 75.03 г/моль; pKa NH₃⁺=9.6; pKa COOH=2.35",
  "conditions": "Нейтральная форма при физиологическом pH; ионная при pH < 2.35 или > 9.6",
  "limits": [],
  "prereq": ["concept.chemistry.amino_acid", "concept.chemistry.zwitterion"],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["amino_acid", "glycine", "biomolecule", "achiral"]
}
```

---

## ✅ Что включать

```
✅ Все 20 стандартных аминокислот (каждая отдельная запись: формула, pKa, боковая цепь)
✅ Все 4 ДНК-основания + все 4 РНК-основания
✅ Ключевые метаболиты (АТФ, НАД, ФАД, КоА, пируват, ацетил-КоА)
✅ Все классы органических соединений с примером вещества
✅ Строение простых веществ по группам периодической таблицы
✅ Топ-100 именных реакций (Дильс-Альдер, Гриньяр, Вюрц, Хек, Сузуки...)
✅ Все ключевые неорганические соединения (H₂SO₄, HCl, NaOH, NH₃, и т.д.)
✅ Ключевые промышленные вещества (сталь, цемент, пластики — химически)
✅ formal_notation для КАЖДОГО вещества: формула + ключевые параметры
```

## 🚫 Что НЕ включать

```
🚫 Все 118 элементов с полным описанием → только ключевые тренды и группы
🚫 Синтетические пути (ретросинтез конкретных молекул) → это применение
🚫 Технологические процессы → TZ_CORE_08_PRACTICAL (там синтез Габер-Бош)
🚫 Минералы → TZ_CORE_04_MINERALS
```

---

## 🔗 Кросс-ссылки

| Куда | Пример |
|------|--------|
| `physics.quantum` | квантовая химия prereq: `principle.physics.quantum.*` |
| `physics.thermodynamics` | ΔG prereq: `law.physics.thermodynamics.*` |
| `biology.*` | биомолекулы prereq'ят биологические концепты |
| `geology.mineralogy` | минеральный состав → в TZ_CORE_04 |

---

## ⚙️ Порядок сбора

```
P0: laws → atomic → bonding.covalent → thermochemistry/thermodynamics
    → kinetics → equilibrium → acid_base → electrochemistry → redox
    → gases → substances.elements → substances.inorganic
    → substances.organic.hydrocarbons → substances.organic.functional
    → substances.organic.biomolecules → reactions.types

P1: bonding.metallic → bonding.intermolecular → solutions
    → polymers → reactions.named

P2: analytical → nuclear → quantum
```

---

## 📌 Специальные правила для этого домена

**Для material (вещества):**
- `formal_notation` ОБЯЗАТЕЛЬНО содержит: химическую формулу + MW (молярная масса) + ключевой параметр (pKa / Tкип / Tпл / ΔHf°)
- `conditions` указывает агрегатное состояние при н.у. и условие изменения
- `tags` включает: класс соединения, функциональную группу, применение

**Для именных реакций (method):**
- `formal_notation` содержит схему реакции в виде: реагент + реагент → продукт
- `conditions` содержит требования к субстрату/катализатору
- `limits` содержит ограничения субстрата
