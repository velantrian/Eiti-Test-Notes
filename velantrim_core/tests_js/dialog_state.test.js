// v14.5.0: offline dialogue state (local/eiti_dstate.js) — scripted multi-turn conversations RU/EN/DE.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const D = require(path.join(__dirname, '..', '..', 'local', 'eiti_dstate.js'));

// Same pipeline as the host wrapper in index.html (EitiDialogHost.step)
function mk(saved) {
  const st = D.create(saved);
  return {
    st,
    say(text, L) {
      const m = D.meta(st, text, L);
      if (m) return { reply: m.text };
      let q = text;
      if (st.pending) { const a = D.answerClarify(st, text, L); if (a) q = a.text; }
      const r = D.resolve(st, q, L);
      if (r.clarify) { st.turn++; return { reply: D.askClarify(st, r.clarify, L), clarify: r.clarify }; }
      const f = D.observe(st, r.text, { refs: r.refs });
      const fr = D.frame(st, f, r.text, L);
      return fr ? { reply: fr.text, q: r.text } : { q: r.text };
    }
  };
}
// conv: [[input, {q?: string|RegExp, reply?: RegExp, clarify?: true}], ...]
function run(name, L, conv) {
  test(name, () => {
    const c = mk();
    conv.forEach(([inp, exp], i) => {
      const out = c.say(inp, L);
      const at = `${name} · turn ${i + 1} «${inp}» → ${JSON.stringify(out)}`;
      if (!exp) return;
      if (exp.q !== undefined) { if (exp.q instanceof RegExp) assert.match(out.q || '', exp.q, at); else assert.strictEqual(out.q, exp.q, at); }
      if (exp.reply) assert.match(out.reply || '', exp.reply, at);
      if (exp.noReply) assert.ok(!out.reply, at);
      if (exp.clarify) assert.ok(out.clarify, at);
    });
    assert.ok(JSON.stringify(c.st).length <= 4000, 'state stays small');
  });
}

// ── RU ──
run('ru: Грузия весной → там посмотреть', 'ru', [
  ['Хочу в Грузию весной', { reply: /Грузия, весной/ }],
  ['а что там посмотреть?', { q: 'а что в Грузии посмотреть?' }],
]);
run('ru: погода там тогда', 'ru', [
  ['Хочу в Грузию весной'], ['а какая там погода тогда?', { q: 'а какая в Грузии погода весной?' }],
]);
run('ru: туда взять', 'ru', [['Поеду в Италию летом'], ['что туда взять?', { q: /в Италию/ }]]);
run('ru: оттуда привезти', 'ru', [['Собираюсь в Японию осенью'], ['что оттуда привезти?', { q: /из Японии/ }]]);
run('ru: он → сущность', 'ru', [['кто такой Наполеон'], ['когда он родился?', { q: 'когда Наполеон родился?' }]]);
run('ru: она → сущность', 'ru', [['кто такая Мария Кюри'], ['чем она известна?', { q: /Мария Кюри/ }]]);
run('ru: о чём мы говорили', 'ru', [
  ['Хочу в Грузию весной'], ['кто такой Наполеон'],
  ['о чём мы говорили?', { reply: /Наполеон[\s\S]*Грузи/ }],
]);
run('ru: вернёмся к Грузии', 'ru', [
  ['Хочу в Грузию весной'], ['кто такой Наполеон'], ['когда он родился?'],
  ['вернёмся к Грузии', { reply: /вернёмся к разговору о Грузии/ }],
  ['а что туда взять?', { q: 'а что в Грузию взять?' }],
]);
run('ru: поездка без места → вопрос', 'ru', [
  ['хочу в отпуск', { reply: /Куда/ }], ['в Италию', { reply: /Италия.*Когда/ }], ['летом', { reply: /Италия, летом/ }],
]);
run('ru: старый план не подставляется', 'ru', [
  ['Хочу в Грузию весной'], ['что лучше купить: айфон или андроид?'], ['цена'],
  ['хочу в отпуск', { reply: /Куда/ }],
]);
run('ru: выбор между вариантами', 'ru', [
  ['что лучше купить: айфон или андроид?', { reply: /айфон|андроид|важн|критер/i }],
  ['цена', { reply: /айфон|андроид/i }],
]);
run('ru: тема угасает', 'ru', [
  ['Хочу в Грузию весной'],
  ...Array.from({ length: 12 }, (_, i) => ['привет ' + i]),
  ['а что там посмотреть?', { q: 'а что там посмотреть?' }],
]);
run('ru: без контекста ничего не меняется', 'ru', [['а что там посмотреть?', { q: 'а что там посмотреть?', noReply: true }]]);
run('ru: уточнение при неоднозначности', 'ru', [
  ['кто такой Наполеон'], ['Хочу во Францию летом'],
  ['а это что?'], // may or may not clarify — just must not crash
]);
run('ru: настроение запоминается', 'ru', [['мне грустно сегодня'], ['о чём мы говорили?', { reply: /./ }]]);
run('ru: двойная смена места', 'ru', [
  ['Хочу в Грузию весной'], ['а лучше в Испанию'], ['что там посмотреть?', { q: /в Испании/ }],
]);

// ── EN ──
run('en: Japan → there', 'en', [
  ['I want to travel to Japan in spring', { reply: /Japan, in spring/ }],
  ['what can I see there?', { q: 'what can I see in Japan?' }],
]);
run('en: weather then', 'en', [['I want to go to Italy in summer'], ['what is the weather there then?', { q: /in Italy.*in summer|in summer.*in Italy/ }]]);
run('en: he → entity', 'en', [['who is Einstein'], ['when was he born?', { q: 'when was Einstein born?' }]]);
run('en: famous for keeps clean entity', 'en', [
  ['tell me about Einstein'], ['what is Einstein famous for?'], ['when was he born?', { q: 'when was Einstein born?' }],
]);
run('en: what were we talking about', 'en', [
  ['I want to travel to Japan in spring'], ['who is Einstein'],
  ['what were we talking about?', { reply: /Einstein[\s\S]*Japan/ }],
]);
run('en: back to', 'en', [
  ['I want to travel to Japan in spring'], ['who is Einstein'],
  ['back to Japan', { reply: /back to.*Japan/i }], ['what to pack for there?', { q: /Japan/ }],
]);
run('en: trip frame asks', 'en', [['I want a vacation', { reply: /Where/i }], ['to Spain', { reply: /When/i }], ['in winter', { reply: /Spain, in winter/ }]]);
run('en: choose frame', 'en', [['which is better, tea or coffee?', { reply: /tea|coffee|matter|criterion|important/i }], ['health', { reply: /tea|coffee/i }]]);
run('en: clarify Einstein vs Japan', 'en', [
  ['tell me about Einstein'], ['I want to travel to Japan in spring'],
  ['what is it famous for?', { clarify: true, reply: /Einstein.*Japan|Japan.*Einstein/ }],
  ['the first one', { q: /Einstein/ }],
]);
run('en: clarify answered by name', 'en', [
  ['tell me about Einstein'], ['I want to travel to Japan in spring'],
  ['what is it famous for?', { clarify: true }], ['Japan', { q: /Japan/ }],
]);
run('en: no context', 'en', [['what can I see there?', { q: 'what can I see there?' }]]);

// ── DE ──
run('de: Italien → dort', 'de', [
  ['Ich möchte im Sommer nach Italien reisen', { reply: /Italien, im Sommer/ }],
  ['was kann man dort sehen?', { q: 'was kann man in Italien sehen?' }],
]);
run('de: worüber haben wir gesprochen', 'de', [
  ['Ich möchte im Sommer nach Italien reisen'], ['wer ist Goethe'],
  ['worüber haben wir gesprochen?', { reply: /Goethe[\s\S]*Italien/ }],
]);
run('de: er → Goethe', 'de', [['wer ist Goethe'], ['wann wurde er geboren?', { q: /Goethe/ }]]);
run('de: zurück zu', 'de', [
  ['Ich möchte im Sommer nach Italien reisen'], ['wer ist Goethe'],
  ['zurück zu Italien', { reply: /Italien/ }],
]);
run('de: Reise ohne Ziel', 'de', [['Ich möchte Urlaub machen', { reply: /Wohin/i }], ['nach Spanien', { reply: /Wann/i }], ['im Winter', { reply: /Spanien/ }]]);
run('de: dorthin mitnehmen', 'de', [['Ich möchte im Sommer nach Italien reisen'], ['was soll ich dorthin mitnehmen?', { q: /nach Italien/ }]]);

// ── state, persistence, summary ──
test('state persists through JSON (IndexedDB) and stays capped', () => {
  const a = mk();
  a.say('Хочу в Грузию весной', 'ru');
  const saved = JSON.parse(JSON.stringify(a.st));
  const b = mk(saved);
  assert.strictEqual(b.say('а что там посмотреть?', 'ru').q, 'а что в Грузии посмотреть?');
  for (let i = 0; i < 200; i++) b.say('кто такой Персонаж' + i + ' и что такое вещь' + i, 'ru');
  assert.ok(JSON.stringify(b.st).length <= 4000);
  assert.ok(b.st.stack.length <= 6);
});
test('summary for the LLM is compact', () => {
  const a = mk(); a.say('Хочу в Грузию весной', 'ru'); a.say('кто такой Наполеон', 'ru');
  const s = D.summary(a.st);
  assert.match(s, /place=/); assert.match(s, /Наполеон/); assert.ok(s.length <= 300);
});
test('garbage input never throws', () => {
  const a = mk();
  for (const t of ['', '   ', '???', 'там', 'он', 'это', 'or or or', 'A или B или', '🙂'.repeat(50)]) for (const L of ['ru', 'en', 'de']) a.say(t, L);
});
run('ru: новый отпуск после разговора о Грузии — спрашиваем заново', 'ru', [
  ['Хочу в Грузию весной'], ['а что туда взять?'],
  ['хочу в отпуск', { reply: /Куда/ }], ['в Италию', { reply: /Когда/ }], ['летом', { reply: /Италия, летом/ }],
]);
