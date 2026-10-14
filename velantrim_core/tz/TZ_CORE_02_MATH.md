# 📐 TZ_CORE_02_MATH — Математика
**Схема:** v3.2 · **Tier:** invariant  
**Единиц:** 650–750 · **Батчей:** 26–30  
**Читать сначала:** TZ_CORE_00_MASTER.md

---

## 📊 Карта подтем

| subtopic | Описание | Единиц | Приоритет |
|----------|---------|:------:|:---------:|
| `math.foundations.logic` | Пропозициональная и предикатная логика | 25 | P0 |
| `math.foundations.set_theory` | ZFC, операции над множествами, мощность | 25 | P0 |
| `math.foundations.proof_theory` | Типы доказательств, Гёдель | 15 | P1 |
| `math.number_theory.basic` | Простые, делимость, НОД, НОК | 25 | P0 |
| `math.number_theory.advanced` | Ферма, Эйлер, Китайская теорема, квадратные вычеты | 20 | P1 |
| `math.algebra.linear` | Векторы, матрицы, определители, СЛУ | 25 | P0 |
| `math.algebra.abstract` | Группы, кольца, поля, гомоморфизмы | 25 | P1 |
| `math.algebra.polynomials` | Теорема Безу, разложение, Виет | 15 | P1 |
| `math.geometry.euclidean` | Планиметрия — теоремы треугольника и окружности | 25 | P0 |
| `math.geometry.solid` | Стереометрия — тела, объёмы, площади | 20 | P1 |
| `math.geometry.analytic` | Уравнения прямой/плоскости/конических сечений | 20 | P1 |
| `math.geometry.differential` | Кривые, поверхности, кривизна, геодезические | 15 | P2 |
| `math.trigonometry` | Тождества, формулы суммы/разности/двойного угла | 20 | P0 |
| `math.calculus.limits` | Предел, непрерывность, теоремы о пределах | 20 | P0 |
| `math.calculus.derivatives` | Производная, правила, теоремы Ролля/Лагранжа | 25 | P0 |
| `math.calculus.integrals` | Интеграл Ньютона-Лейбница, методы, формулы | 25 | P0 |
| `math.calculus.multivariable` | Частные производные, градиент, дивергенция, ротор | 20 | P1 |
| `math.calculus.differential_eq` | ОДУ, уравнения в частных производных, методы | 20 | P1 |
| `math.calculus.series` | Ряды Тейлора/Маклорена, сходимость, признаки | 20 | P1 |
| `math.probability.basics` | Аксиомы Колмогорова, Байес, независимость | 25 | P0 |
| `math.probability.distributions` | Нормальное, Пуассон, биномиальное, ЦПТ | 25 | P1 |
| `math.probability.statistics` | Оценка, МНК, критерии, дисперсионный анализ | 20 | P1 |
| `math.discrete.combinatorics` | Перестановки, сочетания, принцип включений-исключений | 20 | P0 |
| `math.discrete.graph_theory` | Планарность, Эйлер, Гамильтон, раскраска | 20 | P2 |
| `math.topology.basics` | Открытые/замкнутые множества, компактность, связность | 15 | P2 |
| `math.complex_analysis` | Формула Эйлера, теорема Коши, вычеты | 20 | P2 |

---

## 🔑 Примеры записей

### Пример 1 — аксиома (axiom)
```json
{
  "id": "axiom.math.set_theory.zfc_extensionality",
  "schema_version": "3.2",
  "domain": "math.foundations",
  "subtopic": "math.foundations.set_theory",
  "tier": "invariant",
  "type": "axiom",
  "statement": "Два множества равны тогда и только тогда, когда они содержат одинаковые элементы.",
  "formal_notation": "∀A ∀B (A = B ↔ ∀x (x∈A ↔ x∈B))",
  "conditions": "Теория множеств ZFC",
  "limits": [],
  "prereq": ["definition.math.set_theory.set", "definition.math.set_theory.membership"],
  "derives_from": [],
  "confidence": 1.0,
  "tags": ["ZFC", "set_theory", "axiom", "extensionality"]
}
```

### Пример 2 — теорема (theorem)
```json
{
  "id": "theorem.math.calculus.fundamental",
  "schema_version": "3.2",
  "domain": "math.calculus",
  "subtopic": "math.calculus.integrals",
  "tier": "invariant",
  "type": "theorem",
  "statement": "Производная интеграла с переменным верхним пределом равна подынтегральной функции; интеграл от производной равен разности значений первообразной.",
  "formal_notation": "d/dx ∫ₐˣ f(t)dt = f(x); ∫ₐᵇ f'(x)dx = f(b) − f(a)",
  "conditions": "f непрерывна на [a,b]",
  "limits": ["Требует непрерывности f; для кусочно-непрерывных — по частям"],
  "prereq": [
    "definition.math.calculus.derivative",
    "definition.math.calculus.riemann_integral"
  ],
  "derives_from": ["definition.math.calculus.antiderivative"],
  "confidence": 1.0,
  "tags": ["calculus", "integral", "derivative", "Newton-Leibniz"]
}
```

### Пример 3 — формула (formula)
```json
{
  "id": "formula.math.probability.bayes",
  "schema_version": "3.2",
  "domain": "math.probability",
  "subtopic": "math.probability.basics",
  "tier": "invariant",
  "type": "formula",
  "statement": "Условная вероятность гипотезы H при наблюдении E равна произведению правдоподобия на априорную вероятность, нормированному на полную вероятность E.",
  "formal_notation": "P(H|E) = P(E|H)·P(H) / P(E); P(E) = Σᵢ P(E|Hᵢ)·P(Hᵢ)",
  "conditions": "P(E) > 0; гипотезы Hᵢ образуют полную группу событий",
  "limits": ["Требует корректного априорного распределения P(H)"],
  "prereq": [
    "axiom.math.probability.kolmogorov",
    "definition.math.probability.conditional"
  ],
  "derives_from": ["definition.math.probability.conditional"],
  "confidence": 1.0,
  "tags": ["probability", "bayes", "inference", "conditional"]
}
```

---

## ✅ Что включать

```
✅ Все аксиомы ZFC (9 аксиом)
✅ Все аксиомы Пеано (5 аксиом)
✅ 5 постулатов + 5 общих понятий Евклида
✅ Аксиомы теории групп, колец, полей, векторных пространств
✅ 3 аксиомы Колмогорова
✅ Теорема Гёделя о неполноте (первая и вторая)
✅ Все стандартные теоремы анализа (Ролль, Лагранж, Коши, Тейлор)
✅ Формулы тригонометрии (все стандартные тождества)
✅ Теоремы о пределах (о сжатой переменной, о замечательных пределах)
✅ Теорема о среднем значении (интегральная и дифференциальная)
✅ Формулы объёмов и площадей стандартных фигур
✅ Все критерии сходимости рядов (Даламбера, Коши, Лейбниц, Раабе)
```

## 🚫 Что НЕ включать

```
🚫 Конкретные числовые примеры (решение уравнения x²-5x+6=0)
🚫 Алгоритмы вычисления → это TZ_CORE_08_PRACTICAL
🚫 Теоремы из физики/статистики которые принадлежат другим доменам
🚫 13 000 записей MathWorld — берём ~700 ключевых, используемых в других науках
```

---

## 🔗 Кросс-ссылки

| Куда | Пример |
|------|--------|
| `physics.*` | почти все физические законы ссылаются на `math.*` |
| `logic.*` | math.foundations.logic → базис для TZ_CORE_06_LOGIC |
| `chemistry.*` | квантовая химия ссылается на math.calculus |
| `cs.*` | алгоритмы ссылаются на math.discrete |

---

## ⚙️ Порядок сбора

```
P0: foundations → number_theory.basic → algebra.linear
    → trigonometry → calculus.limits → calculus.derivatives
    → calculus.integrals → probability.basics → combinatorics

P1: всё остальное кроме topology и graph_theory

P2: topology, graph_theory, differential_geometry, complex_analysis
```
