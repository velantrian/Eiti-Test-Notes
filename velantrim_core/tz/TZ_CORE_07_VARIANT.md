# 🌊 TZ_CORE_07_VARIANT — Вариантные знания
**Схема:** v3.2 · **Tier:** variant  
**Единиц:** 4 500–5 000 · **Батчей:** 180–200  
**Читать сначала:** TZ_CORE_00_MASTER.md

> **Принцип:** факты с датой и источником. Изменяются — поле
> `valid_from` обязательно, `valid_until` при известном сроке.

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `geography.countries` | 195 стран — столица, язык, валюта, площадь, форма правления | 585 | P0 |
| `geography.physical` | Горы, реки, озёра, океаны — ключевые параметры топ-100 | 200 | P1 |
| `geography.climate_zones` | Климатические пояса, биомы, характеристики | 80 | P1 |
| `astronomy.solar_system` | 8 планет + 5 карликовых + топ-30 спутников | 130 | P0 |
| `astronomy.exoplanets` | Топ-200 экзопланет (TRAPPIST-1, Kepler-452b...) | 200 | P1 |
| `astronomy.notable_objects` | Топ-100 (туманности, звёзды, чёрные дыры) | 100 | P1 |
| `astronomy.cosmology_params` | Постоянная Хаббла, возраст вселенной, тёмная материя — текущие | 30 | P0 |
| `environment.climate` | Концентрация CO₂, температурные аномалии, тренды | 50 | P0 |
| `environment.tipping_points` | 9 климатических переломных точек с confidence | 25 | P0 |
| `environment.biodiversity` | Оценки числа видов, темп вымирания, угрозы | 30 | P1 |
| `medicine.diseases` | Топ-500 болезней: механизм, симптомы, лечение кратко | 500 | P0 |
| `medicine.drugs` | Топ-300 препаратов: класс, механизм, взаимодействия | 300 | P0 |
| `medicine.lab_values` | 50 лабораторных показателей с нормами | 100 | P0 |
| `medicine.pathogens` | Топ-50 патогенов: механизм патогенности, лечение | 100 | P0 |
| `biology.model_organisms` | 20 модельных организмов: зачем используются в науке | 60 | P1 |
| `biology.crop_species` | 100 важнейших с/х культур и животных | 100 | P1 |
| `economics.indicators` | Ключевые макропоказатели, индексы, рейтинги с датами | 80 | P1 |
| `economics.institutions` | ВТО, МВФ, ВБ, ЦБ — структура и полномочия | 40 | P1 |
| `history.periods` | Ключевые исторические периоды с датами и значением | 100 | P1 |
| `history.events` | Топ-200 событий определивших современный мир | 200 | P1 |
| `demographics.global` | Население мира, регионов, тренды — с датой | 50 | P1 |
| `technology.current` | Текущие рекорды (мощность процессоров, скорость сетей) — с датой | 60 | P2 |
| `geology.active_volcanoes` | Топ-50 активных вулканов — Смитсоновская программа | 100 | P2 |

---

## 🔑 Примеры записей

### Пример 1 — страна (fact)
```json
{
  "id": "fact.geography.country.germany",
  "schema_version": "3.2",
  "domain": "geography.countries",
  "subtopic": "geography.countries",
  "tier": "variant",
  "type": "fact",
  "statement": "Германия — федеративная парламентская республика в Центральной Европе; крупнейшая экономика ЕС.",
  "formal_notation": null,
  "conditions": null,
  "limits": [],
  "prereq": [],
  "derives_from": [],
  "confidence": 0.99,
  "tags": ["country", "Germany", "Europe", "EU"],
  "tier_extensions": {
    "source": "UN, Statista 2025",
    "valid_from": "2025-01-01",
    "capital": "Берлин",
    "official_language": "немецкий",
    "currency": "EUR",
    "area_km2": 357114,
    "population": 84607016,
    "government": "федеративная парламентская республика",
    "un_member": true,
    "eu_member": true,
    "nato_member": true
  }
}
```

### Пример 2 — болезнь (fact)
```json
{
  "id": "fact.medicine.disease.type2_diabetes",
  "schema_version": "3.2",
  "domain": "medicine.diseases",
  "subtopic": "medicine.diseases",
  "tier": "variant",
  "type": "fact",
  "statement": "Сахарный диабет 2 типа — метаболическое заболевание с инсулинорезистентностью тканей и относительной недостаточностью инсулина; хроническая гипергликемия.",
  "formal_notation": "Диагноз: HbA1c ≥ 6,5%; глюкоза натощак ≥ 7,0 ммоль/л; или ПГТТ 2ч ≥ 11,1 ммоль/л",
  "conditions": null,
  "limits": [],
  "prereq": ["mechanism.biology.metabolism.insulin_signaling"],
  "derives_from": [],
  "confidence": 0.97,
  "tags": ["diabetes", "metabolic", "insulin_resistance", "chronic"],
  "tier_extensions": {
    "source": "WHO ICD-11 5A11; ADA Standards 2025",
    "valid_from": "2025-01-01",
    "icd11_code": "5A11",
    "treatment": "метформин + образ жизни; ГПП-1 агонисты; SGLT2 ингибиторы",
    "global_prevalence": "~10% взрослого населения (2025)"
  }
}
```

### Пример 3 — препарат (fact)
```json
{
  "id": "fact.medicine.drug.metformin",
  "schema_version": "3.2",
  "domain": "medicine.drugs",
  "subtopic": "medicine.drugs",
  "tier": "variant",
  "type": "fact",
  "statement": "Метформин — бигуанид первой линии при СД2; снижает печёночный глюконеогенез через активацию AMPK.",
  "formal_notation": "C₄H₁₁N₅; MW=129.16; механизм: AMPK↑ → глюконеогенез↓ → инсулиночувствительность↑",
  "conditions": null,
  "limits": [],
  "prereq": ["fact.medicine.disease.type2_diabetes"],
  "derives_from": [],
  "confidence": 0.97,
  "tags": ["metformin", "biguanide", "diabetes", "AMPK"],
  "tier_extensions": {
    "source": "DrugBank 6.0; FDA 2025",
    "valid_from": "2025-01-01",
    "drug_class": "biguanide",
    "fda_approved": true,
    "contraindications": "ХБП стадия 4–5, лактоацидоз",
    "key_interactions": "йодсодержащие контрасты (временная отмена)"
  }
}
```

---

## ✅ Правила для variant фактов

```
✅ tier_extensions.source — ОБЯЗАТЕЛЬНО (название источника + год)
✅ tier_extensions.valid_from — ОБЯЗАТЕЛЬНО (ISO дата)
✅ Для стран: capital, official_language, currency, area_km2, population, government
✅ Для болезней: ICD-11 код, основное лечение, prevalence если известна
✅ Для препаратов: DrugBank класс, механизм одной строкой, ключевые противопоказания
✅ Для космоса: масса, радиус, расстояние, период обращения
✅ confidence ≤ 0.95 (вариантные факты не абсолютны)
```
