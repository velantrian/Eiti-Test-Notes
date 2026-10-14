# 🧬 TZ_CORE_05_BIOLOGY — Биология
**Схема:** v3.2 · **Tier:** invariant  
**Единиц:** 600–700 · **Батчей:** 24–28  
**Читать сначала:** TZ_CORE_00_MASTER.md

> **Принцип:** механизмы, применимые ко ВСЕМ организмам.
> Ни одного конкретного вида как отдельной записи.

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `biology.cell.structure` | Прокариоты/эукариоты, органеллы и их функции | 30 | P0 |
| `biology.cell.membrane` | Мембрана, транспорт, рецепторы, сигнальные пути | 25 | P0 |
| `biology.cell.cycle` | G1/S/G2/M, митоз, мейоз, контрольные точки | 25 | P0 |
| `biology.cell.death` | Апоптоз, некроз, аутофагия — механизмы | 15 | P1 |
| `biology.molecular.central_dogma` | Репликация, транскрипция, трансляция | 30 | P0 |
| `biology.molecular.genetic_code` | 64 кодона, вырожденность, старт/стоп | 25 | P0 |
| `biology.molecular.protein_structure` | 4 уровня структуры, фолдинг, шапероны | 20 | P0 |
| `biology.molecular.regulation` | Оперон, энхансеры, метилирование, некодирующие РНК | 20 | P1 |
| `biology.molecular.crispr` | CRISPR-Cas9 — молекулярный механизм | 10 | P1 |
| `biology.metabolism.glycolysis` | Гликолиз — 10 шагов, ферменты, энергетика | 25 | P0 |
| `biology.metabolism.krebs` | Цикл Кребса — 8 шагов, ферменты, продукты | 25 | P0 |
| `biology.metabolism.etc` | Дыхательная цепь — 4 комплекса, АТФ-синтаза, итог | 20 | P0 |
| `biology.metabolism.photosynthesis` | Световые реакции, цикл Кальвина | 20 | P0 |
| `biology.metabolism.lipids` | β-окисление, синтез жирных кислот | 15 | P1 |
| `biology.metabolism.nitrogen` | Цикл мочевины, синтез/распад аминокислот | 15 | P1 |
| `biology.genetics.mendel` | 3 закона Менделя | 15 | P0 |
| `biology.genetics.molecular` | Хромосомная теория, сцепление, кроссинговер | 20 | P0 |
| `biology.genetics.population` | Харди-Вайнберг, дрейф, поток генов | 15 | P0 |
| `biology.evolution.mechanisms` | Естественный отбор, половой отбор, адаптация | 20 | P0 |
| `biology.evolution.speciation` | Видообразование — алло/симпатрическое | 15 | P1 |
| `biology.evolution.molecular` | Нейтральная теория, молекулярные часы, LUCA | 15 | P1 |
| `biology.anatomy.nervous` | Потенциал действия, синапс, нейромедиаторы | 25 | P0 |
| `biology.anatomy.cardiovascular` | Сердечный цикл, малый/большой круг, давление | 20 | P0 |
| `biology.anatomy.immune` | Врождённый/адаптивный иммунитет, T/B-клетки, антитела | 25 | P0 |
| `biology.anatomy.endocrine` | Ключевые гормоны, оси гипоталамус-гипофиз | 20 | P1 |
| `biology.anatomy.other_systems` | Пищеварительная, дыхательная, выделительная, опорная | 25 | P1 |
| `biology.ecology.principles` | Экосистема, энергетические пирамиды, сукцессия | 20 | P1 |

---

## 🔑 Примеры записей

### Пример 1 — механизм (mechanism)
```json
{
  "id": "mechanism.biology.molecular.dna_replication",
  "schema_version": "3.2",
  "domain": "biology.molecular",
  "subtopic": "biology.molecular.central_dogma",
  "tier": "invariant",
  "type": "mechanism",
  "statement": "Репликация ДНК — полуконсервативный процесс: каждая дочерняя молекула содержит одну исходную и одну новосинтезированную цепь; ведётся в направлении 5'→3'.",
  "formal_notation": "ДНК-полимераза: 5'→3' синтез; хеликаза разматывает; праймаза создаёт РНК-праймер; ведущая цепь — непрерывно; отстающая — фрагменты Оказаки",
  "conditions": "Требует праймера (праймаза), дезоксирибонуклеотидтрифосфатов, Mg²⁺",
  "limits": ["Ошибка ~1 на 10⁹ пар оснований после корректуры"],
  "prereq": [
    "concept.biology.dna_structure",
    "material.chemistry.biomolecule.dna_base.adenine"
  ],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["replication", "DNA", "central_dogma", "molecular"]
}
```

### Пример 2 — закон (law)
```json
{
  "id": "law.biology.genetics.hardy_weinberg",
  "schema_version": "3.2",
  "domain": "biology.genetics",
  "subtopic": "biology.genetics.population",
  "tier": "invariant",
  "type": "law",
  "statement": "В идеальной популяции частоты аллелей и генотипов остаются постоянными из поколения в поколение.",
  "formal_notation": "p + q = 1; p²(AA) + 2pq(Aa) + q²(aa) = 1",
  "conditions": "Большая популяция; случайные скрещивания; нет отбора, мутаций, миграции",
  "limits": [
    "Нарушается при малой популяции (дрейф генов)",
    "Нарушается при наличии отбора, мутаций, ненейтральных аллелей",
    "Реальные популяции всегда отклоняются — закон описывает нулевую гипотезу"
  ],
  "prereq": ["concept.biology.allele", "concept.biology.genotype_frequency"],
  "derives_from": ["law.math.probability.binomial"],
  "confidence": 0.99,
  "tags": ["population_genetics", "Hardy-Weinberg", "allele_frequency", "evolution"]
}
```

---

## ✅ Что включать

```
✅ Полный генетический код (все 64 кодона — в батче)
✅ Все 10 шагов гликолиза с ферментами и энергетикой
✅ Все 8 шагов цикла Кребса с субстратами, ферментами, продуктами
✅ Комплексы I–IV дыхательной цепи + АТФ-синтаза
✅ Световые реакции (фотосистемы I и II, Z-схема)
✅ Цикл Кальвина (3 фазы: карбоксилирование, восстановление, регенерация)
✅ Потенциал действия — механизм Na⁺/K⁺ по шагам
✅ Все нейромедиаторы (глутамат, ГАМК, дофамин, серотонин, АХ, НА) — механизм
✅ T-клетки и B-клетки — типы и функции
```

## 🚫 Что НЕ включать

```
🚫 Конкретные виды животных, растений, грибов → Encyclopedia layer
🚫 Клинические данные болезней → TZ_CORE_07_VARIANT (медицина)
🚫 Биохимию конкретных лекарств → TZ_CORE_07_VARIANT
🚫 Экологические данные конкретных экосистем → только принципы
```
