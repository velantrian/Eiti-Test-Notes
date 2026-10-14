# 🔧 TZ_CORE_08_PRACTICAL — Практические знания
**Схема:** v3.2 · **Tier:** practical  
**Единиц:** 750–850 · **Батчей:** 30–34  
**Читать сначала:** TZ_CORE_00_MASTER.md

> **Принцип:** КАК делается, не зачем. Механизм технологии,
> не её история или экономика.

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `practical.metallurgy.ferrous` | Доменный процесс, BOF, EAF, непрерывная разливка | 30 | P0 |
| `practical.metallurgy.nonferrous` | Производство Al (Байер+Холл-Эру), Cu, Ti, Zn | 25 | P0 |
| `practical.metallurgy.heat_treatment` | Закалка, отжиг, отпуск, цементация | 20 | P0 |
| `practical.metallurgy.joining` | Сварка (MMA/TIG/MIG/лазер), пайка, диффузионная сварка | 20 | P1 |
| `practical.materials.composites` | Углепластик, стекловолокно, кермет — структура и свойства | 15 | P1 |
| `practical.materials.ceramics` | Техническая керамика, оксид алюминия, нитрид кремния | 15 | P2 |
| `practical.chemical.separation` | Дистилляция, ректификация, экстракция, адсорбция | 25 | P0 |
| `practical.chemical.synthesis` | Синтез аммиака (Габер-Бош), серная кислота (контактный), хлор (Cl₂) | 20 | P0 |
| `practical.chemical.refining` | Нефтепереработка — крекинг, риформинг, гидроочистка | 20 | P0 |
| `practical.chemical.polymerization` | Свободно-радикальная, ионная, Циглер-Натта, ROMP | 20 | P1 |
| `practical.chemical.biotech` | Ферментация, биореакторы, масштабирование | 15 | P1 |
| `practical.energy.thermal` | Цикл Ренкина, паровая турбина, КПД тепловых машин | 20 | P0 |
| `practical.energy.nuclear` | Реактор PWR/BWR — принцип, управляющие стержни, теплоноситель | 20 | P0 |
| `practical.energy.renewables` | Фотовольтаика, ветер, гидро, геотермал — принципы | 25 | P0 |
| `practical.energy.storage` | Li-ion, LFP, NMC, NaS, водород — принципы | 20 | P1 |
| `practical.energy.fusion` | Токамак, инерциальный синтез — принцип | 10 | P1 |
| `practical.electronics.semiconductors` | p-n переход, транзисторы BJT/MOSFET, CMOS | 25 | P0 |
| `practical.electronics.fabrication` | Литография, диффузия, эпитаксия, техпроцесс | 20 | P1 |
| `practical.electronics.photonics` | Лазер, LED, оптоволокно, фотодетектор | 15 | P1 |
| `practical.computing.architecture` | Фон Нейман, конвейер, кэш, суперскалярность, RISC/CISC | 20 | P0 |
| `practical.computing.storage` | Flash NAND, HDD, SSD — принципы хранения | 15 | P1 |
| `practical.computing.networking` | TCP/IP стек концептуально, маршрутизация, DNS, HTTP | 20 | P1 |
| `practical.computing.crypto` | RSA, AES, SHA, эллиптические кривые — принципы | 20 | P0 |
| `practical.computing.quantum` | Кубит, суперпозиция, запутанность, квантовые ворота, алгоритм Шора | 15 | P1 |
| `practical.medical.imaging` | МРТ, КТ, ПЭТ, УЗИ, рентген — физические принципы | 25 | P0 |
| `practical.medical.diagnostics` | ПЦР, NGS, ELISA, масс-спектрометрия — принципы | 20 | P0 |
| `practical.medical.therapeutics` | CRISPR клинический, мРНК-вакцины, моноклональные антитела | 20 | P0 |
| `practical.civil.structural` | Сопромат, балки, бетон, сейсмостойкость — принципы | 25 | P1 |
| `practical.agriculture` | Севооборот, ирригация, ГМО механизм, пестициды классы | 25 | P1 |

---

## 🔑 Примеры записей

### Пример 1 — процесс (process)
```json
{
  "id": "process.practical.metallurgy.steel.bof",
  "schema_version": "3.2",
  "domain": "practical.metallurgy",
  "subtopic": "practical.metallurgy.ferrous",
  "tier": "practical",
  "type": "process",
  "statement": "Кислородно-конвертерный процесс (BOF): продувка жидкого чугуна кислородом для окисления углерода и примесей с получением стали за ~40 минут.",
  "formal_notation": "C + O₂ → CO₂; Si + O₂ → SiO₂; 2Fe + O₂ → 2FeO; T ~ 1600°C; выход ~ 95%",
  "conditions": "Жидкий чугун 1250–1350°C; содержание C в чугуне 4–5%; конвертер 50–350 т",
  "limits": [
    "Нельзя напрямую плавить скрап без доли чугуна >25%",
    "Требует чистого кислорода (>99,5%)"
  ],
  "prereq": [
    "concept.practical.blast_furnace",
    "law.chemistry.redox",
    "material.chemistry.substance.iron"
  ],
  "derives_from": [],
  "confidence": 0.97,
  "tags": ["steel", "BOF", "metallurgy", "converter"],
  "tier_extensions": {
    "scale": "industrial",
    "success_rate": 0.95,
    "safety_critical": true,
    "safety_notes": "Выброс CO при продувке; взрыв при попадании влаги в конвертер"
  }
}
```

### Пример 2 — технология (technology)
```json
{
  "id": "technology.practical.medical.mrna_vaccine",
  "schema_version": "3.2",
  "domain": "practical.medical",
  "subtopic": "practical.medical.therapeutics",
  "tier": "practical",
  "type": "technology",
  "statement": "мРНК-вакцина: введение липидных наночастиц с мРНК-кодом антигена → клетки синтезируют белок → иммунный ответ без живого патогена.",
  "formal_notation": "мРНК (модифицированная ψ-уридин) → рибосомы → антигенный белок → B/T-клеточный ответ → иммунологическая память",
  "conditions": "мРНК нестабильна → хранение при −70°C (Pfizer) или −20°C (Moderna) с LNP",
  "limits": [
    "Нет интеграции в геном (мРНК деградирует за ~дни)",
    "Требует холодовой цепи хранения",
    "Не применимо при тяжёлом иммунодефиците без консультации"
  ],
  "prereq": [
    "mechanism.biology.molecular.translation",
    "concept.biology.immune.adaptive"
  ],
  "derives_from": [],
  "confidence": 0.97,
  "tags": ["mRNA", "vaccine", "LNP", "immunology"],
  "tier_extensions": {
    "scale": "clinical",
    "success_rate": 0.90,
    "safety_critical": true,
    "safety_notes": "Редкие: миокардит у молодых мужчин (VAERS); анафилаксия ~2–5 на 1 млн доз"
  }
}
```

---

## ✅ Правила для practical фактов

```
✅ tier_extensions.scale ОБЯЗАТЕЛЬНО: lab/pilot/industrial/clinical/consumer
✅ tier_extensions.success_rate ОБЯЗАТЕЛЬНО (0.0–1.0)
✅ tier_extensions.safety_critical ОБЯЗАТЕЛЬНО (true/false)
✅ tier_extensions.safety_notes если safety_critical = true
✅ formal_notation содержит химическую реакцию или физическую схему процесса
✅ conditions содержит рабочие параметры (T, P, время, выход)
✅ limits содержит ограничения субстрата и условий применимости
```
