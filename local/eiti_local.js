// VELANTRIM EITI v14.4.0 — «простой интеллект» на устройстве: калькулятор (цифры и числа словами, RU/EN/DE)
// и ответы по собственным данным пользователя (заметки, файлы). Чистая логика без DOM и без eval:
// хост передаёт снимок данных, движок возвращает готовый текст ответа или null («не моё — пусть отвечают другие»).
(function (root) {
  'use strict';

  // ───────────────────────── общие утилиты ─────────────────────────
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[\u00a0\u2009\u202f]/g, ' ')
      .replace(/[«»"“”„]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isRu(s) { return /[а-яё]/i.test(String(s || '')); }
  // v14.4.0: язык ответа. opts.lang ('ru'|'en'|'de') задаёт хост (язык приложения + язык ввода); без него — по тексту вопроса.
  var LANGS = { ru: 1, en: 1, de: 1 };
  function langOf(q, lang) { return LANGS[lang] ? lang : (isRu(q) ? 'ru' : 'en'); }
  // langHint(text) → 'de' | 'en' | null — язык латинского текста (те же списки, что в offline/eiti_offline_de.js)
  var HINT_DE = /\s(und|ich|du|nicht|ist|bist|danke|bitte|hallo|tschüss|tschüs|guten|gute|morgen|abend|nacht|wie|was|wer|kannst|machst|geht|es|mir|dich|dir|mich|ein|eine|einen|noch|ja|nein|doch|hilfe|witz|märchen|geschichte|erzähl|erzähle|wieviel|viele|notizen|notiz|dateien|mal|geteilt|durch|wurzel|prozent|von|tag|heute|gestern|habe|hab|meine|mein|deine|dein|sehr|gut|schlecht|entschuldigung|tut|leid|klar|genau|toll|super|servus|moin|grüß|grüss|weiter|nochmal|vielen|dank|zwei|drei|vier|sechs|sieben|acht|neun|zehn|elf|zwölf|zwanzig|dreißig|hundert|tausend|hoch|komma|quadrat|berechne|rechne|multipliziert|dividiert|hälfte)(?=\s)/g;
  var HINT_EN = /\s(the|and|you|your|are|is|what|how|who|hello|hi|hey|thanks|thank|please|can|do|does|my|me|i|it|this|that|tell|joke|story|notes?|files?|times|plus|minus|of|good|morning|night|bye|yes|no|help|more|another|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|hundred|thousand|divided|multiplied|squared|cubed|root|percent|calculate|half)(?=\s)/g;
  function langHint(text) {
    var raw = String(text || '');
    if (/[а-яё]/i.test(raw)) return null;
    if (/[äöüß]/i.test(raw)) return 'de';
    var s = (' ' + raw.toLowerCase().replace(/[^a-zäöüß0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ').replace(/ /g, '  ');
    var d = (s.match(HINT_DE) || []).length, e = (s.match(HINT_EN) || []).length;
    return d > 0 && d > e ? 'de' : (e > 0 ? 'en' : null);
  }
  function M(L, ru, en, de) { return L === 'ru' ? ru : L === 'de' ? (de != null ? de : en) : en; }

  // ───────────────────────── числа словами ─────────────────────────
  // Формы — именительный и косвенные падежи («трёхсот», «семи», «двадцати»).
  var W = {};
  function def(v, forms) { forms.split(' ').forEach(function (f) { W[f] = v; }); }
  def(0, 'ноль нуль ноля нуля нолю нулю zero');
  def(1, 'один одна одно одного одной одну одному одним one');
  def(2, 'два две двух двум двумя two');
  def(3, 'три трех трем тремя three');
  def(4, 'четыре четырех четырем четырьмя four');
  def(5, 'пять пяти пятью five');
  def(6, 'шесть шести шестью six');
  def(7, 'семь семи семью seven');
  def(8, 'восемь восьми восемью восьмью eight');
  def(9, 'девять девяти девятью nine');
  def(10, 'десять десяти десятью ten');
  def(11, 'одиннадцать одиннадцати eleven');
  def(12, 'двенадцать двенадцати twelve');
  def(13, 'тринадцать тринадцати thirteen');
  def(14, 'четырнадцать четырнадцати fourteen');
  def(15, 'пятнадцать пятнадцати fifteen');
  def(16, 'шестнадцать шестнадцати sixteen');
  def(17, 'семнадцать семнадцати seventeen');
  def(18, 'восемнадцать восемнадцати eighteen');
  def(19, 'девятнадцать девятнадцати nineteen');
  def(20, 'двадцать двадцати twenty');
  def(30, 'тридцать тридцати thirty');
  def(40, 'сорок сорока forty');
  def(50, 'пятьдесят пятидесяти fifty');
  def(60, 'шестьдесят шестидесяти sixty');
  def(70, 'семьдесят семидесяти seventy');
  def(80, 'восемьдесят восьмидесяти eighty');
  def(90, 'девяносто девяноста ninety');
  def(100, 'сто ста сотня сотни');
  def(200, 'двести двухсот двумстам');
  def(300, 'триста трехсот тремстам');
  def(400, 'четыреста четырехсот четыремстам');
  def(500, 'пятьсот пятисот пятистам');
  def(600, 'шестьсот шестисот шестистам');
  def(700, 'семьсот семисот семистам');
  def(800, 'восемьсот восьмисот восьмистам');
  def(900, 'девятьсот девятисот девятистам');
  // v14.4.0: немецкие числа (простые формы; составные «einundzwanzig» — только цифрами)
  def(0, 'null'); def(1, 'eins ein eine'); def(2, 'zwei'); def(3, 'drei'); def(4, 'vier'); def(5, 'fünf funf'); def(6, 'sechs'); def(7, 'sieben');
  def(8, 'acht'); def(9, 'neun'); def(10, 'zehn'); def(11, 'elf'); def(12, 'zwölf zwolf'); def(13, 'dreizehn'); def(14, 'vierzehn'); def(15, 'fünfzehn');
  def(16, 'sechzehn'); def(17, 'siebzehn'); def(18, 'achtzehn'); def(19, 'neunzehn'); def(20, 'zwanzig'); def(30, 'dreißig dreissig'); def(40, 'vierzig');
  def(50, 'fünfzig'); def(60, 'sechzig'); def(70, 'siebzig'); def(80, 'achtzig'); def(90, 'neunzig');
  var MULT = {};
  'тысяча тысячи тысяч тысячу тысячам thousand thousands tausend'.split(' ').forEach(function (f) { MULT[f] = 1e3; });
  'миллион миллиона миллионов million millions millionen'.split(' ').forEach(function (f) { MULT[f] = 1e6; });
  'миллиард миллиарда миллиардов billion billions'.split(' ').forEach(function (f) { MULT[f] = 1e9; });
  var HALF = { 'полтора': 1.5, 'полторы': 1.5, 'полутора': 1.5, 'половина': 0.5, 'половину': 0.5, 'пол': 0.5, 'half': 0.5 };
  var FRAC = { 'десятая': 10, 'десятых': 10, 'десятые': 10, 'сотая': 100, 'сотых': 100, 'тысячная': 1000, 'тысячных': 1000 };

  function isNumTok(t) { return /^\d+(?:[.,]\d+)?$/.test(t); }
  function wordVal(t) { return Object.prototype.hasOwnProperty.call(W, t) ? W[t] : null; }

  // Читает целое число из слов начиная с i: «сто сорок два», «две тысячи двадцать», «one hundred five».
  // → { v, n } (n — сколько токенов съели) или null.
  function readInt(toks, i) {
    var total = 0, cur = 0, n = 0, any = false, lastSmall = 1000;
    while (i + n < toks.length) {
      var t = toks[i + n];
      if (t === 'and' && any && i + n + 1 < toks.length && wordVal(toks[i + n + 1]) !== null) { n++; continue; }
      var v = wordVal(t);
      if (v !== null) {
        // порядок разрядов должен убывать: «сорок два» — да, «два сорок» — это два числа
        var rank = v >= 100 ? 100 : v >= 20 ? 20 : v >= 10 ? 10 : 1;
        if (any && rank >= lastSmall && !(rank === 1 && lastSmall === 20)) break;
        if (any && lastSmall === 20 && rank !== 1) break;
        cur += v; lastSmall = rank === 10 ? 1 : rank; any = true; n++;
        if (rank === 10) lastSmall = 1; // «двенадцать» закрывает десятки и единицы
        continue;
      }
      if ((t === 'hundred' || t === 'hundert') && any && cur > 0 && cur < 10) { cur *= 100; lastSmall = 100; n++; continue; }
      // v14.10.0: «hundred / hundert» без множителя = 100 («a hundred plus five», «hundert minus zwei»)
      if ((t === 'hundred' || t === 'hundert') && !any) { cur = 100; lastSmall = 100; any = true; n++; continue; }
      if (Object.prototype.hasOwnProperty.call(MULT, t)) {
        total += (any ? (cur || 1) : 1) * MULT[t]; cur = 0; any = true; lastSmall = 1000; n++; continue;
      }
      break;
    }
    if (!any) return null;
    return { v: total + cur, n: n };
  }

  // Число: цифры, слова, смешанное («2 тысячи»), дроби «два и пять», «две целых пять десятых», «полтора».
  function readNumber(toks, i) {
    var t = toks[i];
    if (t === undefined) return null;
    if (Object.prototype.hasOwnProperty.call(HALF, t)) return { v: HALF[t], n: 1 };
    var base = null;
    if (isNumTok(t)) {
      base = { v: parseFloat(t.replace(',', '.')), n: 1, digits: true };
      if (Object.prototype.hasOwnProperty.call(MULT, toks[i + 1] || '')) { base = { v: base.v * MULT[toks[i + 1]], n: 2 }; }
    } else {
      base = readInt(toks, i);
    }
    if (!base) return null;
    var j = i + base.n;
    // «две целых пять десятых», «ноль целых три десятых»
    if (/^цел(ая|ых|ую)$/.test(toks[j] || '')) {
      var fr = isNumTok(toks[j + 1] || '') ? { v: parseFloat(toks[j + 1]), n: 1 } : readInt(toks, j + 1);
      if (fr && FRAC[toks[j + 1 + fr.n]]) return { v: base.v + fr.v / FRAC[toks[j + 1 + fr.n]], n: base.n + 2 + fr.n };
      if (fr) return { v: base.v + fr.v / Math.pow(10, String(Math.floor(fr.v)).length), n: base.n + 1 + fr.n };
      return { v: base.v, n: base.n + 1 };
    }
    // «два и пять» → 2,5 (только словами/цифрами, дробная часть — целое число)
    if ((toks[j] === 'и' || toks[j] === 'point' || toks[j] === 'komma' || toks[j] === 'запятая') && toks[j + 1] !== undefined) {
      var fp = null, fn = 0;
      if (/^\d+$/.test(toks[j + 1])) { fp = toks[j + 1]; fn = 1; }
      else { var ri = readInt(toks, j + 1); if (ri && ri.v < 1000) { fp = String(ri.v); fn = ri.n; } }
      if (fp !== null && !Object.prototype.hasOwnProperty.call(MULT, toks[j + 1 + fn] || '')) {
        return { v: base.v + parseFloat('0.' + fp), n: base.n + 1 + fn };
      }
    }
    // «десять с половиной»
    if (toks[j] === 'с' && /^половин/.test(toks[j + 1] || '')) return { v: base.v + 0.5, n: base.n + 2 };
    return base;
  }

  // ───────────────────────── калькулятор ─────────────────────────
  // Многословные операторы → однословные метки (порядок важен: длинные первыми).
  var PHRASES = [
    // v14.10.0: «half of 50», «die Hälfte von 50», «половина от 50» → 0.5 × 50
    [/(?:^|\s)(?:die\s+)?(?:half of|hälfte von|haelfte von|половина от|половину от|половина из)(?=\s)/g, ' 0.5 MUL '],
    [/квадратн[а-я]* корн[а-я]* из|квадратный корень из|корень квадратный из|корень из|корня из|square root of|root of|sqrt|quadratwurzel aus|wurzel aus|wurzel von/g, ' SQRT '],
    [/кубическ[а-я]* корн?[а-я]* из/g, ' CBRT '],
    [/в квадрате|в квадрат|squared|zum quadrat|im quadrat/g, ' SQ '],
    [/в кубе|cubed/g, ' CUBE '],
    [/в степени|в \d+ степени|to the power of|to the power|\bpower\b|\bhoch\b/g, ' POW '],
    [/умножить на|умножить|умноженное на|умножь на|помножить на|помножь на|multiplied by|times|multipliziert mit|\bmal\b/g, ' MUL '],
    [/разделить на|разделить|делить на|деленное на|разделенное на|подели на|поделить на|раздели на|divided by|over|geteilt durch|dividiert durch|\bdurch\b/g, ' DIV '],
    [/прибавить к|прибавить|прибавь|сложить с|плюс|plus|and add|add/g, ' ADD '],
    [/отнять от|отнять|отними|вычесть из|вычесть|минус|minus|subtract/g, ' SUB '],
    [/процентов от|процента от|процент от|% от|percent of|% of|prozent von|% von/g, ' PCTOF '],
    [/процентов|процента|процент|percent|prozent/g, ' PCT ']
  ];
  var PREFIX = /^(?:(?:eiti|эйти)[,:]?\s+)?(?:(?:а|ну|скажи|подскажи|пожалуйста|please|bitte|быстро)[,]?\s+)*(?:сколько будет|сколько это|сколько|посчитай(?: мне)?|подсчитай|вычисли|рассчитай|реши|calculate|compute|what is|what's|whats|how much is|calc|was ist|was sind|wie viel ist|wieviel ist|wie viel sind|berechne|rechne)?\s*(?:пожалуйста\s+|please\s+|bitte\s+)?/;

  // v14.4.0: немецкие составные числительные: «dreihundert» → «drei hundert», «einundzwanzig» → «zwanzig ein»
  var DE_ONES = 'ein|eins|zwei|drei|vier|fünf|funf|sechs|sieben|acht|neun', DE_TENS = 'zwanzig|dreißig|dreissig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig';
  function deSplit(s) {
    return s.replace(new RegExp('(^|\\s)(' + DE_ONES + ')und(' + DE_TENS + ')(?=\\s|$|hundert|tausend)', 'g'), '$1$3 $2')
      .replace(new RegExp('(^|\\s)(' + DE_ONES + '|zehn|elf|zwölf|' + DE_TENS + ')?(hundert|tausend)(?=\\S)', 'g'), function (m, a, b, c) { return a + (b ? b + ' ' : '') + c + ' '; })
      .replace(new RegExp('(^|\\s)(' + DE_ONES + '|zehn|elf|zwölf|' + DE_TENS + ')(hundert|tausend)(?=\\s|$)', 'g'), '$1$2 $3');
  }
  function tokenizeCalc(q) {
    var s = norm(q);
    if (s.length > 160) return null;
    // даты, время, телефоны, версии — не арифметика
    if (/\b\d{1,4}[./-]\d{1,2}[./-]\d{1,4}\b/.test(s) || /\b\d{1,2}:\d{2}\b/.test(s) || /\+\d[\d\s()-]{8,}/.test(s) || /\bv?\d+\.\d+\.\d+/.test(s)) return null;
    s = s.replace(PREFIX, '').replace(/[?!=]+\s*$/, '').replace(/\s*=\s*\??$/, '').trim();
    if (!s) return null;
    // v14.10.0: «twenty-five» → «twenty five» (дефис между словами — не минус); артикли the/a/an/der/die/das — шум
    s = s.replace(/([a-zäöüß])-(?=[a-zäöüß])/g, '$1 ');
    s = deSplit(s);
    PHRASES.forEach(function (p) { s = s.replace(p[0], p[1]); });
    s = (' ' + s + ' ').replace(/\s(?:the|an?|der|die|das)(?=\s)/g, ' ').trim();
    s = s.replace(/(\d),(\d)/g, '$1.$2')
      .replace(/[×xх](?=\s*[\d(])/g, ' MUL ').replace(/\*\*/g, ' POW ').replace(/[*·]/g, ' MUL ')
      .replace(/[÷:/]/g, ' DIV ').replace(/[−–—]/g, '-').replace(/\+/g, ' ADD ').replace(/-/g, ' SUB ')
      .replace(/\^/g, ' POW ').replace(/%/g, ' PCT ').replace(/√/g, ' SQRT ').replace(/²/g, ' SQ ').replace(/³/g, ' CUBE ')
      .replace(/([()])/g, ' $1 ');
    var raw = s.split(/\s+/).filter(Boolean), out = [], i = 0;
    while (i < raw.length) {
      var t = raw[i];
      if (/^(ADD|SUB|MUL|DIV|POW|SQRT|CBRT|SQ|CUBE|PCT|PCTOF)$/.test(t)) { out.push({ op: t }); i++; continue; }
      if (t === '(' || t === ')') { out.push({ op: t }); i++; continue; }
      if (t === 'на' && out.length && out[out.length - 1].num !== undefined && (/^\d/.test(raw[i - 1]) || /^\d/.test(raw[i + 1] || ''))) { out.push({ op: 'MUL' }); i++; continue; } // «2 на 3» (только с цифрами: «один на один» — не умножение)
      var r = readNumber(raw, i);
      if (r) { out.push({ num: r.v }); i += r.n; continue; }
      return null; // посторонние слова → это не выражение
    }
    return out;
  }

  // Рекурсивный спуск: expr = term {(+|-) term}; term = unary {(*|/) unary}; unary = -unary | power;
  // power = postfix [^ unary]; postfix = primary {² ³ %}; primary = num | (expr) | √primary.
  function parse(tokens) {
    var p = 0, err = null;
    function peek() { return tokens[p]; }
    function isOp(o) { var t = tokens[p]; return t && t.op === o; }
    function primary() {
      var t = tokens[p];
      if (!t) throw new Error('end');
      if (t.num !== undefined) { p++; return { k: 'n', v: t.num }; }
      if (t.op === '(') { p++; var e = expr(); if (!isOp(')')) throw new Error('paren'); p++; return { k: 'p', e: e }; }
      if (t.op === 'SQRT' || t.op === 'CBRT') { p++; var neg = false; if (isOp('SUB')) { p++; neg = true; } var arg = postfix(); return { k: t.op === 'SQRT' ? 'sqrt' : 'cbrt', e: neg ? { k: 'neg', e: arg } : arg }; }
      throw new Error('unexpected');
    }
    function postfix() {
      var e = primary();
      for (;;) {
        if (isOp('SQ')) { p++; e = { k: 'pow', a: e, b: { k: 'n', v: 2 }, sup: 2 }; continue; }
        if (isOp('CUBE')) { p++; e = { k: 'pow', a: e, b: { k: 'n', v: 3 }, sup: 3 }; continue; }
        if (isOp('PCT') && !(tokens[p + 1] && tokens[p + 1].op === 'PCTOF')) { p++; e = { k: 'pct', e: e }; continue; }
        if (isOp('PCTOF')) { p++; var b = unary(); e = { k: 'pctof', a: e, b: b }; continue; }
        break;
      }
      return e;
    }
    function power() {
      var a = postfix();
      if (isOp('POW')) { p++; return { k: 'pow', a: a, b: unary() }; }
      return a;
    }
    function unary() {
      if (isOp('SUB')) { p++; return { k: 'neg', e: unary() }; }
      if (isOp('ADD')) { p++; return unary(); }
      return power();
    }
    function term() {
      var a = unary();
      while (isOp('MUL') || isOp('DIV')) { var o = tokens[p++].op; a = { k: o === 'MUL' ? 'mul' : 'div', a: a, b: unary() }; }
      return a;
    }
    function expr() {
      var a = term();
      while (isOp('ADD') || isOp('SUB')) { var o = tokens[p++].op; a = { k: o === 'ADD' ? 'add' : 'sub', a: a, b: term() }; }
      return a;
    }
    try { var e = expr(); if (p !== tokens.length) return null; return e; } catch (x) { return null; }
  }

  function CalcError(code) { this.code = code; }
  function ev(e) {
    switch (e.k) {
      case 'n': return e.v;
      case 'p': return ev(e.e);
      case 'neg': return -ev(e.e);
      case 'pct': return ev(e.e) / 100;
      case 'pctof': return ev(e.a) / 100 * ev(e.b);
      case 'sqrt': { var v = ev(e.e); if (v < 0) throw new CalcError('negroot'); return Math.sqrt(v); }
      case 'cbrt': return Math.cbrt(ev(e.e));
      case 'pow': { var r = Math.pow(ev(e.a), ev(e.b)); if (isNaN(r)) throw new CalcError('nan'); return r; }
      case 'mul': return ev(e.a) * ev(e.b);
      case 'div': { var d = ev(e.b); if (d === 0) throw new CalcError('div0'); return ev(e.a) / d; }
      case 'add': case 'sub': {
        var a = ev(e.a);
        // «200 + 10%» — процент от левого операнда (как на калькуляторе)
        var b = e.b.k === 'pct' ? a * ev(e.b.e) / 100 : ev(e.b);
        return e.k === 'add' ? a + b : a - b;
      }
    }
    throw new CalcError('bad');
  }
  function hasOperator(e) { return e.k !== 'n' && e.k !== 'p' && !(e.k === 'neg' && e.e.k === 'n') ? true : e.k === 'p' ? hasOperator(e.e) : false; }

  function fmtNum(v, ru) {
    // ru: true | 'ru' → «1 234,5»; 'de' → «1.234,5»; false | 'en' → «1,234.5»
    var de = ru === 'de'; ru = ru === true || ru === 'ru' || de;
    if (!isFinite(v)) return '∞';
    var r = Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-9 && v !== 0) ? v.toPrecision(10).replace(/\.?0+e/, 'e') : String(+v.toPrecision(12));
    if (/e/.test(r)) { var m = r.split('e'); return m[0].replace('.', ru ? ',' : '.') + ' × 10^' + (+m[1]); }
    var neg = r.charAt(0) === '-'; if (neg) r = r.slice(1);
    var parts = r.split('.'), ip = parts[0];
    if (ip.length > 4) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, de ? '.' : ru ? '\u00a0' : ',');
    return (neg ? '−' : '') + ip + (parts[1] ? (ru ? ',' : '.') + parts[1] : '');
  }
  var PREC = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4 };
  function show(e, ru, parent) {
    var s;
    switch (e.k) {
      case 'n': return fmtNum(e.v, ru);
      case 'p': return '(' + show(e.e, ru) + ')';
      case 'neg': s = '−' + show(e.e, ru, 'neg'); if (parent && parent !== 'neg') return '(' + s + ')'; break;
      case 'pct': return show(e.e, ru, 'pow') + '%';
      case 'pctof': return show(e.a, ru, 'pow') + '% ' + (ru === 'de' ? 'von' : ru === true || ru === 'ru' ? 'от' : 'of') + ' ' + show(e.b, ru, 'pow');
      case 'sqrt': return '√' + show(e.e, ru, 'pow');
      case 'cbrt': return '∛' + show(e.e, ru, 'pow');
      case 'pow': s = e.sup === 2 ? show(e.a, ru, 'pow') + '²' : e.sup === 3 ? show(e.a, ru, 'pow') + '³' : show(e.a, ru, 'pow') + '^' + show(e.b, ru, 'pow'); break;
      default: s = show(e.a, ru, e.k) + ' ' + { add: '+', sub: '−', mul: '×', div: '÷' }[e.k] + ' ' + show(e.b, ru, e.k + 'R');
    }
    var me = PREC[e.k] || 5, pk = parent && parent.replace(/R$/, ''), pp = PREC[pk] || 0;
    if (parent && (pp > me || (pp === me && /R$/.test(parent) && (pk === 'sub' || pk === 'div')) || (pk === 'pow' && e.k !== 'n'))) s = '(' + s + ')';
    return s;
  }

  // calc(text) → { expr, value, text } | { error, text } | null (это не арифметика)
  function calc(q, lang) {
    var toks = tokenizeCalc(q);
    if (!toks || !toks.length) return null;
    var e = parse(toks);
    if (!e || !hasOperator(e)) return null;
    // без явного языка — как раньше: кириллица или одни цифры → по-русски
    var L = LANGS[lang] ? lang : (isRu(q) || !/[a-z]/i.test(q) ? 'ru' : (langHint(q) === 'de' ? 'de' : 'en'));
    var shown = show(e, L);
    try {
      var v = ev(e);
      if (!isFinite(v)) return { error: 'big', text: M(L, 'Получается слишком большое число.', 'The result is too large.', 'Das Ergebnis ist zu groß.') };
      if (Math.abs(v) < 1e-12) v = 0; else v = +v.toPrecision(12);
      return { expr: shown, value: v, text: shown + ' = ' + fmtNum(v, L) };
    } catch (x) {
      var c = x && x.code;
      var msg = c === 'div0' ? shown + M(L, ': на ноль делить нельзя.', ': division by zero is undefined.', ': Division durch null ist nicht definiert.')
        : c === 'negroot' ? shown + M(L, ': квадратный корень из отрицательного числа не определён среди действительных чисел.', ': the square root of a negative number is not a real number.', ': Die Quadratwurzel einer negativen Zahl ist keine reelle Zahl.')
          : M(L, 'Не получается посчитать ' + shown + '.', 'Cannot compute ' + shown + '.', shown + ' lässt sich nicht berechnen.');
      return { error: c || 'bad', text: msg };
    }
  }

  // ───────────────────────── периоды ─────────────────────────
  var DAY = 86400000;
  function startOfDay(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function startOfWeek(t) { var d = new Date(startOfDay(t)); var wd = (d.getDay() + 6) % 7; return d.getTime() - wd * DAY; } // понедельник
  function addMonths(t, k) { var d = new Date(t); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + k); return d.getTime(); }
  function startOfYear(t) { var d = new Date(t); return new Date(d.getFullYear(), 0, 1).getTime(); }
  var NUMW = '(\\d+|' + Object.keys(W).filter(function (k) { return /^[а-я]+$/.test(k) && W[k] > 1 && W[k] <= 31; }).join('|') + ')';
  // period(text, now) → { from, to, ru: 'сегодня', en: 'today' } | null
  // JS-\w и \b не знают кириллицу: \w → буква/цифра (флаг u), \b → пробел в «нормализованной» строке с пробелами по краям.
  function U(src) { return new RegExp(src.replace(/\\w/g, '[\\p{L}\\p{N}_]').replace(/\\b/g, ' '), 'u'); }
  function pad(s) { return ' ' + String(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' '; }
  function period(s, now) {
    var d0 = startOfDay(now), m, ps = pad(s), t = function (src) { return U(src).test(ps); };
    if (t('\\b(сегодня|today|heute)\\b')) return { from: d0, to: d0 + DAY, ru: 'сегодня', en: 'today', de: 'heute' };
    if (t('\\bпозавчера\\b|\\bday before yesterday\\b|\\bvorgestern\\b')) return { from: d0 - 2 * DAY, to: d0 - DAY, ru: 'позавчера', en: 'the day before yesterday', de: 'vorgestern' };
    if (t('\\b(вчера|yesterday|gestern)\\b')) return { from: d0 - DAY, to: d0, ru: 'вчера', en: 'yesterday', de: 'gestern' };
    if ((m = ps.match(U('\\b(?:за|в) последни[ех] ' + NUMW + ' (?:дн|сут)|\\bthe (?:last|past) (\\d+) days\\b|\\b(?:in )?den letzten (\\d+) tagen\\b')))) {
      var n = m[1] ? (/^\d+$/.test(m[1]) ? +m[1] : W[m[1]]) : +(m[2] || m[3]);
      if (n > 0 && n <= 3660) return { from: d0 - (n - 1) * DAY, to: d0 + DAY, ru: 'за последние ' + n + ' ' + plural(n, 'день', 'дня', 'дней'), en: 'in the last ' + n + ' days', de: 'in den letzten ' + n + ' Tagen' };
    }
    if (t('\\b(?:прошл|предыдущ)\\w* недел|\\blast week\\b|\\bletzte woche\\b|\\bvorige woche\\b')) { var w = startOfWeek(now); return { from: w - 7 * DAY, to: w, ru: 'на прошлой неделе', en: 'last week', de: 'letzte Woche' }; }
    if (t('\\bза (?:последнюю )?неделю\\b|\\bpast week\\b|\\bvergangene woche\\b')) return { from: d0 - 6 * DAY, to: d0 + DAY, ru: 'за неделю', en: 'in the past week', de: 'in der vergangenen Woche' };
    if (t('\\b(?:эт|текущ)\\w* недел|\\bна неделе\\b|\\bthis week\\b|\\bdiese woche\\b')) return { from: startOfWeek(now), to: d0 + DAY, ru: 'на этой неделе', en: 'this week', de: 'diese Woche' };
    if (t('\\b(?:прошл|предыдущ)\\w* месяц|\\blast month\\b|\\bletzten monat\\b|\\bletzter monat\\b')) return { from: addMonths(now, -1), to: addMonths(now, 0), ru: 'в прошлом месяце', en: 'last month', de: 'im letzten Monat' };
    if (t('\\bза (?:последний )?месяц\\b|\\bpast month\\b')) return { from: d0 - 29 * DAY, to: d0 + DAY, ru: 'за месяц', en: 'in the past month', de: 'im vergangenen Monat' };
    if (t('\\b(?:эт|текущ)\\w* месяц|\\bthis month\\b|\\bdiesen monat\\b|\\bdiesem monat\\b')) return { from: addMonths(now, 0), to: d0 + DAY, ru: 'в этом месяце', en: 'this month', de: 'diesen Monat' };
    if (t('\\bпрошл\\w* год|\\blast year\\b|\\bletztes jahr\\b|\\bletzten jahr\\b')) { var y = startOfYear(now); return { from: new Date(new Date(y).getFullYear() - 1, 0, 1).getTime(), to: y, ru: 'в прошлом году', en: 'last year', de: 'letztes Jahr' }; }
    if (t('\\b(?:эт|текущ)\\w* год|\\bза год\\b|\\bthis year\\b|\\bdieses jahr\\b|\\bdiesem jahr\\b')) return { from: startOfYear(now), to: d0 + DAY, ru: 'в этом году', en: 'this year', de: 'dieses Jahr' };
    return null;
  }

  // ───────────────────────── данные пользователя ─────────────────────────
  function noteTime(n) { return +(n.created || n.updated || 0); }
  function noteTouched(n) { return +(n.updated || n.created || 0); }
  function liveNotes(notes) { return (notes || []).filter(function (n) { return n && n.status !== 'deleted' && !n.deleted && !n.trashed && (n.title || n.body || n.content); }); }
  function body(n) { return String(n.body != null ? n.body : (n.content || '')); }
  function title(n, L) { var t = String(n.title || '').trim(); if (t) return t; var b = body(n).trim().split('\n')[0].slice(0, 50); return b || M(L === true ? 'ru' : L, '(без заголовка)', '(untitled)', '(ohne Titel)'); }
  function tagsOf(n) {
    var t = n.tags; if (!t) return [];
    if (!Array.isArray(t)) t = String(t).split(/[,;\s]+/);
    return t.map(function (x) { return norm(x).replace(/^#/, ''); }).filter(Boolean);
  }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  function notesW(n, L) { return M(L, n + ' ' + plural(n, 'заметка', 'заметки', 'заметок'), n + ' ' + (n === 1 ? 'note' : 'notes'), n + ' ' + (n === 1 ? 'Notiz' : 'Notizen')); }
  function filesW(n, L) { return M(L, n + ' ' + plural(n, 'файл', 'файла', 'файлов'), n + ' ' + (n === 1 ? 'file' : 'files'), n + ' ' + (n === 1 ? 'Datei' : 'Dateien')); }
  function fmtDate(t, L) {
    if (!t) return '';
    var d = new Date(t), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return L === 'ru' || L === 'de' || L === true ? p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
      : d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function utf8Len(s) { s = String(s || ''); var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? (i++, 4) : 3; } return n; }
  function fileBytes(f) {
    if (typeof f.size === 'number' && f.size >= 0) return f.size;
    var c = f.content != null ? f.content : (f.data != null ? f.data : '');
    if (typeof c !== 'string') return c && c.byteLength ? c.byteLength : 0;
    var m = c.match(/^data:[^,]*;base64,/); if (m) return Math.floor((c.length - m[0].length) * 3 / 4);
    return utf8Len(c);
  }
  function fmtBytes(b, ru) {
    var de = ru === 'de'; ru = ru === true || ru === 'ru';
    var u = ru ? ['Б', 'КБ', 'МБ', 'ГБ'] : ['B', 'KB', 'MB', 'GB'], i = 0, v = b;
    while (v >= 1024 && i < 3) { v /= 1024; i++; }
    return (i ? (v >= 100 ? Math.round(v) : +v.toFixed(1)) : v).toString().replace('.', ru || de ? ',' : '.') + ' ' + u[i];
  }
  function snippet(text, terms, len) {
    var t = String(text || '').replace(/\s+/g, ' ').trim(); len = len || 120;
    var lo = norm(t), at = -1;
    for (var i = 0; i < terms.length && at < 0; i++) at = lo.indexOf(terms[i]);
    if (at < 0 || t.length <= len) return t.length > len ? t.slice(0, len) + '…' : t;
    var s = Math.max(0, at - 40);
    return (s ? '…' : '') + t.slice(s, s + len) + (s + len < t.length ? '…' : '');
  }
  function chip(n) { return '⟦EITINOTE:' + String(n.id).replace(/[^\w.:-]/g, '') + '⟧'; }
  function noteLine(n, L, terms) {
    var sn = snippet(body(n), terms || [], 110);
    return '• **' + title(n, L) + '** · ' + fmtDate(noteTouched(n), L) + (sn ? '\n  ' + sn : '') + (n.id ? ' ' + chip(n) : '');
  }
  var STOPQ = /^(и|в|во|на|о|об|обо|про|по|с|со|к|из|за|для|мне|мои|мой|моих|my|the|a|an|of|about|on|in|for|что|это|meine|meinen|meiner|über|uber|von|zu|zum|zur|der|die|das|den|dem|ein|eine|einen|und|im)$/;
  function queryTerms(x) {
    return norm(x).replace(/[^\p{L}\p{N}\s#-]/gu, ' ').split(/\s+/).filter(function (w) { return w && !STOPQ.test(w); })
      .map(function (w) { w = w.replace(/^#/, ''); return w.length > 5 ? w.slice(0, w.length - 2) : w.length > 4 ? w.slice(0, 4) : w; }); // грубая основа: «кошке» → «кош», «рецептах» → «рецепт»
  }
  function searchNotes(notes, q) {
    var terms = queryTerms(q); if (!terms.length) return { terms: terms, hits: [] };
    var hits = [];
    notes.forEach(function (n) {
      var tt = norm(title(n, 'ru')), bb = norm(body(n)), tg = tagsOf(n).join(' '), sc = 0, all = true;
      terms.forEach(function (t) {
        var ht = tt.indexOf(t) >= 0, hb = bb.indexOf(t) >= 0, hg = tg.indexOf(t) >= 0;
        if (!ht && !hb && !hg) all = false;
        sc += (ht ? 3 : 0) + (hg ? 2 : 0) + (hb ? 1 + Math.min(2, bb.split(t).length - 2) * 0.25 : 0);
      });
      if (sc > 0 && (all || terms.length > 2 && sc >= terms.length * 1.5)) hits.push({ n: n, s: sc + (all ? 2 : 0) });
    });
    hits.sort(function (a, b) { return b.s - a.s || noteTouched(b.n) - noteTouched(a.n); });
    return { terms: terms, hits: hits.map(function (h) { return h.n; }) };
  }

  // Распознавание запросов о своих данных. Фразы заякорены на всё сообщение — обычная болтовня не срабатывает.
  var LEAD = '^(?:(?:eiti|эйти)[,:]?\\s+)?(?:(?:а|ну|слушай|скажи|подскажи|покажи|напомни|пожалуйста|please|hey|tell me|show me|bitte|sag mir|zeig mir|zeige mir)[,]?\\s+)*';
  var TAIL = '\\s*(?:пожалуйста|please|bitte)?\\s*[?.!]*$';
  function rx(body) { return new RegExp((LEAD + '(?:' + body + ')' + TAIL).replace(/\\w/g, '[\\p{L}\\p{N}_]'), 'u'); }
  var NOTE = '(?:замет(?:к\\w*|ок)|записк\\w*|записок|записей|записи|запись|notes?|notizen|notiz)';
  var FILE = '(?:файл\\w*|documents?|files?|dateien|datei|dokumente)';
  var PER = '(?:\\s+(?:(?:за|на|в|во|с)\\s+(?:сегодня|вчера|позавчера|(?:эту |этой |прошлую |прошлой |последнюю )?недел[июе]|(?:этот |этом |прошлый |прошлом |последний )?месяц[е]?|(?:этот |этом |прошлый |прошлом )?год[у]?|последни[ех]\\s+[\\p{L}\\d]+\\s+(?:дн\\w*|сут\\w*))|сегодня|вчера|позавчера|today|yesterday|(?:this|last) (?:week|month|year)|(?:in|over) the (?:last|past) (?:\\d+ days|week|month)|in the past week|heute|gestern|vorgestern|(?:diese|letzte) woche|(?:diesen|letzten) monat|(?:dieses|letztes) jahr|in den letzten \\d+ tagen))?';
  var INTENTS = [
    { id: 'notes_count', re: rx('(?:сколько|какое количество|количество|число)\\s+(?:у меня\\s+|всего\\s+|есть\\s+|сейчас\\s+)*(?:моих\\s+)?' + NOTE + '(?:\\s+(?:у меня|всего|есть|сохранено|в приложении))*' + PER + '|сколько\\s+(?:я\\s+)?(?:написал\\w*|создал\\w*|записал\\w*|сделал\\w*)\\s+' + NOTE + PER + '|сколько\\s+' + NOTE + '\\s+(?:я\\s+)?(?:написал\\w*|создал\\w*|записал\\w*|сделал\\w*)' + PER + '|how many notes(?: do i have| have i (?:got|written|made|created)| did i (?:write|make|create))?' + PER + '|(?:count|number of)(?: my)? notes' + PER) },
    { id: 'files_size', re: rx('(?:сколько|какой)\\s+(?:места|объ[еь]м\\w*|размер\\w*)\\s+(?:занима\\w+\\s+)?(?:у меня\\s+)?(?:мои\\s+|все\\s+)?(?:' + FILE + '|хранилищ\\w*)(?:\\s+занима\\w+)?|(?:размер|объ[еь]м|вес)\\s+(?:моих\\s+|всех\\s+)?(?:' + FILE + '|хранилищ\\w* файлов|хранилищ\\w*)|сколько (?:весят|занимают) (?:мои |все )?' + FILE + '|(?:total )?(?:file )?storage (?:size|used|usage)|(?:size of|total size of) (?:my |all )?files|how much (?:space|storage) do (?:my |all )?files (?:take|use|take up)') },
    { id: 'files_count', re: rx('(?:сколько|количество|число)\\s+(?:у меня\\s+|всего\\s+|есть\\s+)*(?:моих\\s+|загруженных\\s+|импортированных\\s+)?' + FILE + '(?:\\s+(?:у меня|всего|есть|загружено|в приложении))*|how many files(?: do i have| have i (?:got|uploaded))?|(?:count|number of)(?: my)? files') },
    { id: 'notes_last', re: rx('(?:последн\\w+|свеж\\w+|недавн\\w+)\\s+(?:моя\\s+)?' + NOTE + '|(?:какая|какую|что за)\\s+(?:была\\s+)?последн\\w+\\s+' + NOTE + '|(?:my\\s+)?(?:last|latest|most recent|newest)\\s+notes?|what (?:was|is) my (?:last|latest) note') },
    { id: 'notes_longest', re: rx('(?:сам\\w+\\s+)?(?:длинн\\w+|больш\\w+|объемн\\w+)\\s+' + NOTE + '|(?:my\\s+)?(?:longest|biggest|largest)\\s+notes?|which note is the longest') },
    { id: 'notes_shortest', re: rx('(?:сам\\w+\\s+)?(?:коротк\\w+|маленьк\\w+)\\s+' + NOTE + '|(?:my\\s+)?(?:shortest|smallest)\\s+notes?') },
    { id: 'notes_tag', re: rx('(?:все\\s+)?' + NOTE + '\\s+(?:с\\s+тегом|по\\s+тегу|с\\s+меткой|по\\s+метке|под\\s+тегом|тег)\\s+(#?[\\p{L}\\d_-]+)|(?:покажи\\s+)?(?:все\\s+)?(?:тег|метк\\w)\\s+(#?[\\p{L}\\d_-]+)\\s+' + NOTE + '|(?:all\\s+)?notes\\s+(?:tagged|with (?:the )?tag|under (?:the )?tag)\\s+(#?[\\p{L}\\d_-]+)|(?:notes for|show) (?:tag|#)\\s*(#?[\\p{L}\\d_-]+)') },
    { id: 'notes_period', re: rx('что\\s+я\\s+(?:записал\\w*|написал\\w*|писал\\w*|заметил\\w*|сохранил\\w*)' + PER + '|(?:мои\\s+)?' + NOTE + '\\s+(?:за|с|от)\\s+(?:сегодня|вчера|позавчера|неделю|эту неделю|прошлую неделю|месяц|этот месяц|прошлый месяц|год|последние\\s+[\\p{L}\\d]+\\s+дн\\w*)|what did i (?:write|note|save)(?: down)?' + PER + '|(?:my\\s+)?notes (?:from|for) (?:today|yesterday|this week|last week|this month|last month|the last \\d+ days)') },
    { id: 'notes_search', re: rx('(?:что|что-нибудь|что-то)\\s+(?:у меня\\s+)?(?:есть\\s+)?(?:в\\s+(?:моих\\s+)?заметках|в\\s+(?:моих\\s+)?записях)\\s+(?:про|о|об|обо|насчет|по поводу|по)\\s+(.+)|(?:найди|поищи|ищи|покажи)\\s+(?:мне\\s+)?(?:в\\s+(?:моих\\s+)?(?:заметках|записях)\\s+(?:про\\s+|о\\s+|об\\s+)?(.+)|(?:мои\\s+)?(?:заметк\\w*|записи)\\s+(?:про|о|об|обо|где есть|со словом|с текстом|по)\\s+(.+))|(?:мои\\s+)?(?:заметк\\w*|записи)\\s+(?:про|о|об|обо)\\s+(.+)|где\\s+я\\s+(?:писал\\w*|записал\\w*|упоминал\\w*)\\s+(?:про|о|об)\\s+(.+)|(?:search|find|look)\\s+(?:in\\s+)?(?:my\\s+)?notes\\s+(?:for|about)\\s+(.+)|(?:find|show)\\s+(?:my\\s+)?notes\\s+(?:about|on|mentioning|with)\\s+(.+)|what(?:\\s+do)?\\s+(?:my\\s+)?notes\\s+say\\s+about\\s+(.+)|what did i write about\\s+(.+)|(?:my\\s+)?notes about\\s+(.+)') },
    { id: 'files_search', re: rx('(?:что|что-нибудь)\\s+(?:есть\\s+)?в\\s+(?:моих\\s+)?файлах\\s+(?:про|о|об|по)\\s+(.+)|(?:найди|поищи)\\s+в\\s+(?:моих\\s+)?файлах\\s+(?:про\\s+|о\\s+)?(.+)|(?:search|find)\\s+(?:in\\s+)?(?:my\\s+)?files\\s+(?:for|about)\\s+(.+)') }
  ];
  // v14.4.0: немецкие формулировки тех же запросов (отдельными записями — порядок русских/английских не меняется)
  var GNOTE = '(?:notizen|notiz)', GFILE = '(?:dateien|datei|dokumente)';
  [
    ['files_size', 'wie ?viel (?:speicher|speicherplatz|platz) (?:belegen|brauchen|verbrauchen|nehmen) (?:meine |alle )?' + GFILE + '(?: ein)?|(?:gesamt)?gr(?:ö|o)(?:ß|ss)e (?:meiner |aller )?' + GFILE + '|wie gro(?:ß|ss) sind (?:meine |alle )?' + GFILE],
    ['notes_count', 'wie ?viele (?:meiner )?' + GNOTE + '(?:\\s+(?:habe ich|hab ich|gibt es|sind es|sind gespeichert))?' + PER + '|wie ?viele ' + GNOTE + ' habe ich' + PER + '(?: (?:geschrieben|erstellt|angelegt))?|anzahl (?:meiner |der )?' + GNOTE + PER],
    ['files_count', 'wie ?viele (?:meiner )?' + GFILE + '(?:\\s+(?:habe ich|hab ich|gibt es))?|anzahl (?:meiner |der )?' + GFILE],
    ['notes_last', '(?:meine\\s+)?(?:letzte|neueste|jüngste|juengste)\\s+notiz|was (?:war|ist) meine (?:letzte|neueste) notiz'],
    ['notes_longest', '(?:meine\\s+)?(?:längste|laengste|größte|groesste)\\s+notiz|welche notiz ist (?:die )?(?:längste|laengste)'],
    ['notes_shortest', '(?:meine\\s+)?(?:kürzeste|kuerzeste|kleinste)\\s+notiz'],
    ['notes_tag', '(?:alle\\s+)?(?:meine\\s+)?notizen\\s+(?:mit (?:dem )?tag|getaggt mit|unter (?:dem )?tag|zum tag)\\s+(#?[\\p{L}\\d_-]+)'],
    ['notes_period', 'was habe ich' + PER + '\\s+(?:notiert|geschrieben|aufgeschrieben|gespeichert)|(?:meine\\s+)?notizen (?:von|für|fur) (?:heute|gestern|vorgestern|diese woche|letzte woche|diesen monat|letzten monat)'],
    ['notes_search', '(?:finde|suche|such|zeige|zeig)\\s+(?:mir\\s+)?(?:in\\s+)?(?:meinen\\s+)?notizen\\s+(?:(?:über|uber|zu|zum|zur|mit|nach)\\s+)?(.+)|(?:meine\\s+)?notizen\\s+(?:über|uber|zu|zum|zur)\\s+(.+)|was habe ich über\\s+(.+?)\\s+(?:geschrieben|notiert)|was steht in meinen notizen (?:über|uber|zu)\\s+(.+)'],
    ['files_search', '(?:finde|suche|such)\\s+(?:in\\s+)?(?:meinen\\s+)?dateien\\s+(?:(?:nach|über|uber|zu)\\s+)?(.+)|was steht in meinen dateien (?:über|uber|zu)\\s+(.+)']
  ].forEach(function (x) { INTENTS.push({ id: x[0], re: rx(x[1]), de: true }); });

  function detect(q) {
    var s = norm(q);
    if (!s || s.length > 200) return null;
    for (var i = 0; i < INTENTS.length; i++) {
      var m = s.match(INTENTS[i].re);
      if (m) {
        var arg = null; for (var k = 1; k < m.length; k++) if (m[k]) { arg = m[k].trim(); break; }
        if (arg) arg = arg.replace(/[?.!]+$/, '').replace(/\s+(пожалуйста|please)$/, '').trim();
        return { intent: INTENTS[i].id, arg: arg, s: s, de: !!INTENTS[i].de };
      }
    }
    return null;
  }

  // answer(q, data, now) → { intent, text } | null. data = { notes:[…], files:[…] }.
  function answerData(q, data, now, lang) {
    var d = detect(q); if (!d) return null;
    now = now || Date.now();
    var L = LANGS[lang] ? lang : (d.de ? 'de' : (isRu(q) ? 'ru' : 'en')), notes = liveNotes(data && data.notes), files = (data && data.files) || [];
    var per = period(d.s, now), t, list;
    var inPer = function (n) { var x = noteTime(n); return x >= per.from && x < per.to; };
    var P = function (x) { return x[L] || x.en; };
    var more = function (k) { return M(L, '\n…и ещё ' + k, '\n…and ' + k + ' more', '\n…und ' + k + ' weitere'); };
    switch (d.intent) {
      case 'notes_count':
        if (per) { var c = notes.filter(inPer).length; t = M(L, 'Создано ' + per.ru + ': ' + notesW(c, L) + '. Всего у тебя ' + notesW(notes.length, L) + '.', 'Notes created ' + per.en + ': ' + c + '. Total: ' + notesW(notes.length, L) + '.', 'Erstellt ' + per.de + ': ' + notesW(c, L) + '. Insgesamt hast du ' + notesW(notes.length, L) + '.'); }
        else {
          var wk = notes.filter(function (n) { return noteTime(n) >= startOfDay(now) - 6 * DAY; }).length;
          t = M(L, 'У тебя ' + notesW(notes.length, L) + (notes.length ? ', из них за последние 7 дней: ' + wk + '.' : '.'), 'You have ' + notesW(notes.length, L) + (notes.length ? ', ' + wk + ' of them from the last 7 days.' : '.'),
            'Du hast ' + notesW(notes.length, L) + (notes.length ? ', davon ' + wk + ' aus den letzten 7 Tagen.' : '.'));
        }
        break;
      case 'files_count': {
        var bytes = files.reduce(function (a, f) { return a + fileBytes(f); }, 0), sz = files.length ? ' (' + fmtBytes(bytes, L) + ').' : '.';
        t = M(L, 'У тебя ' + filesW(files.length, L) + sz, 'You have ' + filesW(files.length, L) + sz, 'Du hast ' + filesW(files.length, L) + sz);
        break;
      }
      case 'files_size': {
        var tot = 0, big = null;
        files.forEach(function (f) { var b = fileBytes(f); tot += b; if (!big || b > big.b) big = { f: f, b: b }; });
        t = M(L, 'Файлы занимают ' + fmtBytes(tot, L) + ' (' + filesW(files.length, L) + ')' + (big ? '. Самый крупный — «' + big.f.name + '», ' + fmtBytes(big.b, L) + '.' : '.'),
          'Files take up ' + fmtBytes(tot, L) + ' (' + filesW(files.length, L) + ')' + (big ? '. The largest is “' + big.f.name + '”, ' + fmtBytes(big.b, L) + '.' : '.'),
          'Deine Dateien belegen ' + fmtBytes(tot, L) + ' (' + filesW(files.length, L) + ')' + (big ? '. Die größte ist „' + big.f.name + '“, ' + fmtBytes(big.b, L) + '.' : '.'));
        break;
      }
      case 'notes_last': {
        if (!notes.length) { t = M(L, 'Заметок пока нет.', 'You have no notes yet.', 'Du hast noch keine Notizen.'); break; }
        var last = notes.slice().sort(function (a, b) { return noteTouched(b) - noteTouched(a); })[0];
        t = M(L, 'Последняя заметка:\n', 'Your latest note:\n', 'Deine neueste Notiz:\n') + noteLine(last, L);
        break;
      }
      case 'notes_longest': case 'notes_shortest': {
        if (!notes.length) { t = M(L, 'Заметок пока нет.', 'You have no notes yet.', 'Du hast noch keine Notizen.'); break; }
        var srt = notes.slice().sort(function (a, b) { return body(b).length - body(a).length; }), lg = d.intent === 'notes_longest';
        var nn = lg ? srt[0] : srt[srt.length - 1], Lb = body(nn).trim(), wc = Lb ? Lb.split(/\s+/).length : 0;
        t = M(L, (lg ? 'Самая длинная заметка' : 'Самая короткая заметка') + ' — ' + Lb.length + ' ' + plural(Lb.length, 'символ', 'символа', 'символов') + ', ' + wc + ' ' + plural(wc, 'слово', 'слова', 'слов') + ':\n',
          (lg ? 'Your longest note' : 'Your shortest note') + ' — ' + Lb.length + ' characters, ' + wc + ' words:\n',
          (lg ? 'Deine längste Notiz' : 'Deine kürzeste Notiz') + ' — ' + Lb.length + ' Zeichen, ' + wc + ' ' + (wc === 1 ? 'Wort' : 'Wörter') + ':\n') + noteLine(nn, L);
        break;
      }
      case 'notes_tag': {
        var tag = norm(d.arg || '').replace(/^#/, '');
        list = notes.filter(function (n) { return tagsOf(n).indexOf(tag) >= 0; }).sort(function (a, b) { return noteTouched(b) - noteTouched(a); });
        t = list.length ? M(L, 'Заметки с тегом #' + tag + ' — ' + list.length + ':\n', 'Notes tagged #' + tag + ' — ' + list.length + ':\n', 'Notizen mit dem Tag #' + tag + ' — ' + list.length + ':\n') + list.slice(0, 8).map(function (n) { return noteLine(n, L); }).join('\n') + (list.length > 8 ? more(list.length - 8) : '')
          : M(L, 'Заметок с тегом #' + tag + ' нет.', 'No notes are tagged #' + tag + '.', 'Keine Notizen mit dem Tag #' + tag + '.');
        break;
      }
      case 'notes_period': {
        var pp = per || { from: startOfDay(now), to: startOfDay(now) + DAY, ru: 'сегодня', en: 'today', de: 'heute' };
        list = notes.filter(function (n) { var x = noteTime(n); return x >= pp.from && x < pp.to; }).sort(function (a, b) { return noteTime(b) - noteTime(a); });
        t = list.length ? M(L, 'Заметки, созданные ' + pp.ru + ' — ' + list.length + ':\n', 'Notes created ' + pp.en + ' — ' + list.length + ':\n', 'Notizen, erstellt ' + P(pp) + ' — ' + list.length + ':\n') + list.slice(0, 10).map(function (n) { return noteLine(n, L); }).join('\n') + (list.length > 10 ? more(list.length - 10) : '')
          : M(L, 'Заметок, созданных ' + pp.ru + ', нет.', 'No notes were created ' + pp.en + '.', 'Keine Notizen ' + P(pp) + ' erstellt.');
        break;
      }
      case 'notes_search': {
        var r = searchNotes(notes, d.arg || '');
        if (!r.terms.length) return null;
        var k = r.hits.length;
        t = k ? M(L, 'Нашёл в заметках про «' + d.arg + '» — ' + k + ':\n', 'Found ' + k + ' note' + (k === 1 ? '' : 's') + ' about “' + d.arg + '”:\n', k + (k === 1 ? ' Notiz' : ' Notizen') + ' zu „' + d.arg + '“ gefunden:\n') + r.hits.slice(0, 5).map(function (n) { return noteLine(n, L, r.terms); }).join('\n') + (k > 5 ? more(k - 5) : '')
          : M(L, 'В заметках ничего не нашлось про «' + d.arg + '».', 'Nothing about “' + d.arg + '” in your notes.', 'In deinen Notizen steht nichts zu „' + d.arg + '“.');
        break;
      }
      case 'files_search': {
        var terms = queryTerms(d.arg || ''); if (!terms.length) return null;
        var fh = files.filter(function (f) { var c = typeof f.content === 'string' && !/^data:/.test(f.content) ? norm(f.content) : ''; var nm = norm(f.name); return terms.every(function (x) { return c.indexOf(x) >= 0 || nm.indexOf(x) >= 0; }); });
        var fk = fh.length;
        t = fk ? M(L, 'Нашёл в файлах про «' + d.arg + '» — ' + fk + ':\n', 'Found ' + fk + ' file' + (fk === 1 ? '' : 's') + ' about “' + d.arg + '”:\n', fk + (fk === 1 ? ' Datei' : ' Dateien') + ' zu „' + d.arg + '“ gefunden:\n') + fh.slice(0, 5).map(function (f) { var sn = typeof f.content === 'string' && !/^data:/.test(f.content) ? snippet(f.content, terms, 100) : ''; return '• **' + f.name + '**' + (sn ? '\n  ' + sn : '') + ' ⟦EITIUFILE:' + String(f.name).replace(/[⟦⟧]/g, '') + '⟧'; }).join('\n')
          : M(L, 'В файлах ничего не нашлось про «' + d.arg + '».', 'Nothing about “' + d.arg + '” in your files.', 'In deinen Dateien steht nichts zu „' + d.arg + '“.');
        break;
      }
    }
    return t ? { intent: d.intent, text: t, lang: L } : null;
  }

  // Главная точка входа: калькулятор → данные пользователя. → { kind, intent, text } | null
  // opts.lang — язык ответа ('ru'|'en'|'de'); без него — по тексту вопроса (как до v14.4.0)
  function reply(q, data, now, opts) {
    var lang = opts && opts.lang;
    var c = calc(q, lang);
    if (c) return { kind: 'calc', intent: 'calc', text: c.text, value: c.value, error: c.error || null };
    var a = answerData(q, data, now, lang);
    if (a) return { kind: 'data', intent: a.intent, text: a.text, lang: a.lang };
    return null;
  }

  var API = { reply: reply, calc: calc, detect: detect, answerData: answerData, period: period, readNumber: function (s) { var t = norm(s).split(' '); var r = readNumber(t, 0); return r && r.n === t.length ? r.v : null; }, searchNotes: searchNotes, fmtBytes: fmtBytes, fileBytes: fileBytes, langOf: langOf, langHint: langHint, version: '14.4.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.EitiLocalLib = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
