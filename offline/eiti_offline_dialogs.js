/* EITI offline dialog engine (prototype, ES5, no deps, Safari-safe: no lookbehind / named groups).
 * Usage: var eng = EitiOfflineDialogs.create(data, {rng, now}); eng.reply("Как дела?") -> {text, intent, score}
 * Session state (contexts + memory) lives in eng.state; persist with JSON.stringify(eng.state) if wanted. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiOfflineDialogs = factory();
})(this, function () {
  'use strict';
  var STOP = {};
  ('а и ну мне я ты же бы вот так это то да ли уж ещё еще очень просто прям прямо сейчас сегодня пожалуйста плиз бот эйти eiti эй слушай скажи можешь ' +
   'типа короче кстати блин эээ эм ммм хм вообще слышь слушай слушайте подскажите будьте добры пожалуй вот блин ой ' +
   'the a an i to is it are you me my please so just hey bot eiti can do um uh like well oh').split(' ').forEach(function (w) { STOP[w] = 1; });
  var NAME_BAD = {};
  ('не нет да просто никто секрет устал устала грустно плохо хорошо нормально тут здесь дома один одна работаю зову бот ок').split(' ').forEach(function (w) { NAME_BAD[w] = 1; });

  // ── v2 input canonicalisation: emoji/emoticons → words, letter squeeze, voice-to-text artifacts, slang/abbrev expansion ──
  var EMO = [
    [/😢|😭|😞|😔|☹|🙁|💔|🥺|😿/g, ' грустно ', ' sad '], [/😂|🤣|😆|😹|😅/g, ' ахаха ', ' haha '], [/😊|🙂|☺|😌|😄|😁|😃/g, ' улыбка ', ' smile '],
    [/❤|💕|💖|😍|🥰|😘|💗|💓/g, ' люблю ', ' love '], [/👍|👌|🆗/g, ' ок ', ' ok '], [/👋/g, ' привет ', ' hi '],
    [/😡|🤬|😤|😠/g, ' злюсь ', ' angry '], [/😴|🥱|💤/g, ' устал ', ' tired '], [/🎉|🥳|🎂|🎊/g, ' ура ', ' yay '],
    [/😱|😨|😰|😟/g, ' страшно ', ' scared '], [/🤔/g, ' хм ', ' hmm '], [/🙏/g, ' спасибо ', ' thanks '], [/🤗|🫂/g, ' обними ', ' hug '],
    [/😐|😑|😶/g, ' так себе ', ' meh '], [/🤒|🤧|🤢/g, ' заболел ', ' sick '], [/🍕|🍔|🍝|🍜/g, ' хочу есть ', ' hungry '], [/🥲/g, ' грустно ', ' sad ']];
  var SLANG = {
    'чет': 'что-то', 'чето': 'что-то', 'чёт': 'что-то', 'чёто': 'что-то', 'кста': 'кстати', 'чонить': 'что-нибудь', 'чтонибудь': 'что-нибудь', 'чонибудь': 'что-нибудь', 'выхах': 'ахаха', 'ахпх': 'ахаха', 'тупит': 'тормозит', 'скок': 'сколько', 'спок': 'спокойной ночи', 'чтоб': 'чтобы', 'комп': 'компьютер', 'инет': 'интернет', 'англ': 'английский',
    'прив': 'привет', 'приветы': 'привет', 'привки': 'привет', 'хаюшки': 'привет', 'здрасьте': 'здравствуйте', 'драсте': 'здравствуйте', 'дратути': 'здравствуйте',
    'спс': 'спасибо', 'спасиб': 'спасибо', 'пасиб': 'спасибо', 'пасиба': 'спасибо', 'пасибо': 'спасибо', 'спасибки': 'спасибо', 'сенкс': 'спасибо', 'спасибочки': 'спасибо', 'благодарю': 'спасибо',
    'пж': 'пожалуйста', 'пжл': 'пожалуйста', 'пжлст': 'пожалуйста', 'плз': 'пожалуйста', 'пожалуста': 'пожалуйста', 'пожалуйсто': 'пожалуйста',
    'нз': 'не за что', 'хз': 'не знаю', 'незнаю': 'не знаю', 'кд': 'как дела', 'кк': 'как', 'каг': 'как', 'дила': 'дела', 'делишки': 'дела',
    'норм': 'нормально', 'нормас': 'нормально', 'нормалек': 'нормально', 'нормуль': 'нормально', 'норма': 'нормально', 'оч': 'очень', 'ооочень': 'очень',
    'щас': 'сейчас', 'щя': 'сейчас', 'ща': 'сейчас', 'че': 'что', 'чо': 'что', 'шо': 'что', 'чтоо': 'что', 'ваще': 'вообще', 'вобще': 'вообще',
    'тя': 'тебя', 'мя': 'меня', 'тыы': 'ты', 'кст': 'кстати', 'мб': 'может быть', 'имхо': 'по-моему', 'ок': 'ок', 'окей': 'ок', 'оки': 'ок', 'окс': 'ок', 'окк': 'ок', 'лады': 'ок', 'ладушки': 'ок', 'хорошо-хорошо': 'ок',
    'пок': 'пока', 'покеда': 'пока', 'покедова': 'пока', 'бб': 'пока', 'бай': 'пока', 'покасики': 'пока', 'пакеда': 'пока', 'споки': 'спокойной ночи', 'спокки': 'спокойной ночи', 'сладенских': 'сладких',
    'ору': 'ахаха', 'лол': 'ахаха', 'кек': 'ахаха', 'хаха': 'ахаха', 'хах': 'ахаха', 'ахах': 'ахаха', 'аха': 'ахаха', 'азаза': 'ахаха', 'хехе': 'ахаха', 'хд': 'ахаха', 'хдд': 'ахаха',
    'бро': 'друг', 'братан': 'друг', 'сорян': 'прости', 'сори': 'прости', 'сорри': 'прости', 'лан': 'ладно', 'ладн': 'ладно', 'збс': 'отлично', 'зашибись': 'отлично', 'огонь': 'отлично', 'кайф': 'отлично', 'топ': 'отлично',
    'капец': 'ужасно', 'жесть': 'ужасно', 'отстой': 'ужасно', 'хреново': 'плохо', 'фигово': 'плохо', 'паршиво': 'плохо', 'днище': 'плохо', 'грустненько': 'грустно', 'грусть': 'грустно', 'тоскливо': 'грустно',
    'скучн': 'скучно', 'скушно': 'скучно', 'скукота': 'скучно', 'спатки': 'спать', 'седня': 'сегодня', 'сёдня': 'сегодня', 'севодня': 'сегодня', 'чел': 'человек', 'щито': 'что', 'ничо': 'ничего', 'ниче': 'ничего', 'нече': 'нечего',
    'пасибочки': 'спасибо', 'го': 'давай', 'погнали': 'давай', 'изи': 'легко', 'кринж': 'стыдно', 'кринжово': 'стыдно', 'рофл': 'шутка', 'зай': 'друг', 'плиз': 'пожалуйста',
    'u': 'you', 'r': 'are', 'ur': 'your', 'pls': 'please', 'plz': 'please', 'thx': 'thanks', 'ty': 'thanks', 'tnx': 'thanks', 'thanx': 'thanks', 'thank': 'thanks', 'gn': 'good night', 'gm': 'good morning', 'idk': 'i dont know', 'dunno': 'dont know',
    'lol': 'haha', 'lmao': 'haha', 'rofl': 'haha', 'hahaha': 'haha', 'hehe': 'haha', 'rn': 'right now', 'wyd': 'what are you doing', 'hru': 'how are you', 'wbu': 'and you', 'hbu': 'and you', 'sup': 'whats up', 'wassup': 'whats up', 'wazzup': 'whats up',
    'bro': 'friend', 'dude': 'friend', 'gonna': 'going to', 'wanna': 'want to', 'gotta': 'got to', 'im': 'i am', 'cuz': 'because', 'bc': 'because', 'ok': 'ok', 'okay': 'ok', 'okey': 'ok', 'k': 'ok', 'kk': 'ok', 'cya': 'bye', 'bb': 'bye', 'byee': 'bye', 'thnx': 'thanks', 'plss': 'please', 'hiii': 'hi', 'heyy': 'hey', 'yo': 'hi'
  };
  var VOICE = /(^|\s)(запятая|точка|восклицательный знак|вопросительный знак|знак вопроса|двоеточие|новая строка|с новой строки|comma|full stop|period|question mark|exclamation mark|new line)(?=\s|$)/g;
  // transliteration (privet kak dela → привет как дела); applied only as an alternative reading of Latin input
  var TR = [['shch', 'щ'], ['sch', 'щ'], ['zh', 'ж'], ['kh', 'х'], ['ch', 'ч'], ['sh', 'ш'], ['ts', 'ц'], ['yu', 'ю'], ['ju', 'ю'], ['ya', 'я'], ['ja', 'я'], ['yo', 'ё'], ['jo', 'ё'], ['ye', 'е'], ['e\'', 'э'], ['\'', 'ь'],
    ['a', 'а'], ['b', 'б'], ['v', 'в'], ['w', 'в'], ['g', 'г'], ['d', 'д'], ['e', 'е'], ['z', 'з'], ['i', 'и'], ['j', 'й'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['f', 'ф'], ['h', 'х'], ['c', 'ц'], ['x', 'кс'], ['q', 'к']];
  var TR_HINT = /\b(privet|privetik|kak|dela|spasibo|spasib|poka|mne|menya|tebya|zovut|chto|cho|che|ploho|horosho|khorosho|normalno|norm|skuchno|grustno|ochen|zdravstvuy|zdravstvuyte|dobroe|utro|vecher|nochi|spokoynoy|davay|davai|zagadka|zagadku|vyuchit|podyshim|angliyskiy|pochemu|kogda|skolko|hochu|ustal|ustala|zdorovo|prikol|shutku|anekdot|pogoda|ty|tebe|moi|moy|chem|zanyat|druzhit|lyublyu|kotoryi|vremeni|nichego|nichego|kruto|uzhasno|sovet|pomogi|pomosh|rasskazhi|nu|da|net|ok)\b/g;
  function translit(s) {
    var out = '', i = 0, low = s.toLowerCase();
    outer: while (i < low.length) {
      for (var k = 0; k < TR.length; k++) { var a = TR[k][0]; if (low.substr(i, a.length) === a) {
        var r = TR[k][1];
        if (a === 'y') r = 'ы';
        out += r; i += a.length; continue outer; } }
      var ch = low.charAt(i);
      if (ch === 'y') { var prev = out.charAt(out.length - 1); out += /[аеёиоуыэюя]/.test(prev) ? 'й' : 'ы'; i++; continue; }
      out += ch; i++;
    }
    return out;
  }
  function norm(s, hintL) {
    s = String(s || '');
    var hasCyr = /[а-яё]/i.test(s), hasLat = /[a-z]/i.test(s);
    var eL = hasCyr ? 1 : (hasLat ? 2 : (hintL === 'en' ? 2 : 1));
    for (var i = 0; i < EMO.length; i++) s = s.replace(EMO[i][0], EMO[i][eL]);
    s = s.replace(/:-?\)+|\){2,}|=\)/g, eL === 1 ? ' улыбка ' : ' smile ').replace(/:-?\(+|\({2,}/g, eL === 1 ? ' грустно ' : ' sad ');
    s = s.toLowerCase().replace(/ё/g, 'е').replace(/[.,!?]/g, ' ').replace(VOICE, ' ').replace(VOICE, ' ')
      .replace(/[^a-zа-я0-9{}*+\-\/%^()., ']+/g, ' ').replace(/'/g, '')
      .replace(/[.,!?]+/g, ' ').replace(/\s+/g, ' ').trim();
    var toks = s.split(' '), o = [];
    for (var j = 0; j < toks.length; j++) {
      var t = toks[j];
      if (!/\d/.test(t)) t = t.replace(/[()]+/g, '');
      if (SLANG.hasOwnProperty(t)) t = SLANG[t];
      else {
        t = t.replace(/([a-zа-я])\1{2,}/g, '$1$1').replace(/([а-я])\1$/, '$1');
        if (/^(а?х[ае]){2,}х?$|^(ха){2,}$|^(ах){2,}а?$/.test(t)) t = 'ахаха';
        if (/^(ha){2,}h?$|^(he){2,}$/.test(t)) t = 'haha';
        if (SLANG.hasOwnProperty(t)) t = SLANG[t];
      }
      if (t) o.push(t);
    }
    return o.join(' ');
  }
  // ── v2 detectors (style of the user's message; emotional situation) ──
  var STY = {
    polite: /(^|\s)(вы|вас|вам|ваш|ваша|ваше|вами|здравствуйте|будьте добры|благодарю|извините|подскажите|не могли бы|не подскажете|уважаем|позвольте|будьте любезны|с уважением)(\s|$)|could you|would you|kindly|good afternoon|thank you very much|i would like|may i|sir|madam|dear eiti/,
    casual: /(^|\s)(прив|спс|хз|норм|нормас|че|чо|чё|лол|ору|бро|кринж|капец|жиза|го|лан|кек|пж|плз|збс|изи|оч|щас|ваще|тя|кд|сорян|чел|рофл|братан|кст|мб)(\s|$)|\){2,}|(^|\s)(u|ur|lol|lmao|gonna|wanna|bro|dude|sup|idk|rn|wyd|hru|thx|pls|ya|yeah|nah)(\s|$)/,
    pro: /(задач|дедлайн|отчет|отчёт|встреч|проект|клиент|коротко|кратко|по делу|по существу|срок|kpi|тз|резюме|созвон|совещан|руководител|коллег|презентац|бюджет|meeting|deadline|report|client|asap|brief|concise|summary|project|manager|colleague|tl;dr|tldr)/,
    fun: /(ахах|хаха|хех|лол|ору|рофл|кек|шутк|прикол|смешн|угар|xd|хд|😂|🤣|😜|🤪|haha|lmao|rofl|joke|funny|lol)/
  };
  var MOOD = [
    ['crisis', /(не хочу жить|покончить с собой|суицид|убить себя|хочу умереть|kill myself|suicid|want to die|end my life)/],
    ['grief', /(умер|умерла|умерли|не стало|похорон|погиб|скончал|died|passed away|funeral|lost my (mom|dad|mother|father|grand))/],
    ['sad', /(грустн|печал|плач|одинок|тоск|расстро|депресс|тяжело|ужасно|плохо|хреново|разбит|обидн|sad|lonely|cry|depress|upset|awful|terrible|miserable|heartbroken|hurt)/],
    ['stressed', /(стресс|нерв|тревог|волну|паник|дедлайн|не успева|завал|боюсь|страшно|переживаю|экзамен|сессия|stress|anxi|panic|worr|deadline|overwhelm|scared|nervous|exam)/],
    ['angry', /(злюсь|злой|злая|бесит|раздража|ненавиж|достал|достала|взбес|angry|furious|hate|annoyed|pissed|mad at)/],
    ['tired', /(устал|вымота|нет сил|выгор|спать хочу|сонн|измотан|tired|exhausted|burn ?out|sleepy|drained)/],
    ['celebrating', /(день рождени|днюха|ура|праздн|поздрав|получилось|сдал|сдала|повысили|новый год|свадьб|победил|выиграл|birthday|congrat|yay|celebrat|i passed|promoted|got the job|won)/],
    ['bored', /(скучн|скука|нечем заняться|нечего делать|bored|boring|nothing to do)/],
    ['happy', /(отлично|супер|класс|счастл|радост|рад |рада|кайф|прекрасно|чудесно|улыбка|ахаха|great|happy|awesome|glad|amazing|wonderful|haha|smile)/],
    ['reflective', /(смысл|судьб|вселенн|мудрост|философ|вечн|душа|бог|счастье|что такое|зачем мы|почему люди|meaning|universe|wisdom|soul|purpose|philosoph|why do people)/]
  ];
  var ID_MOOD = { crisis: 'crisis', crisis_follow: 'crisis', abuse: 'crisis', emo_grief: 'grief', emo_sad: 'sad', emo_lonely: 'sad', emo_hurt: 'sad', emo_breakup: 'sad', mood_bad: 'sad',
    emo_stress: 'stressed', emo_anxious: 'stressed', mood_busy: 'stressed', emo_angry: 'angry', mood_tired: 'tired', emo_sleepy: 'tired', mood_bored: 'bored',
    mood_great: 'happy', mood_good: 'happy', emo_happy: 'happy', emo_excited: 'happy', emo_proud: 'celebrating', lf_birthday: 'celebrating', lf_newyear: 'celebrating' };
  function detectStyle(raw, lo) {
    var r = String(raw || ''), l = r.toLowerCase(), h = {};
    for (var k in STY) if (STY[k].test(l) || STY[k].test(lo)) h[k] = 1;
    // street cues: no capitals, no punctuation, very short; capitals-only = shouting (treated as casual/emotional)
    if (!h.polite && r.length < 40 && r === l && !/[.,!?]/.test(r) && /[a-zа-я]/.test(l)) h.casual = (h.casual || 0) + 0.5;
    if (/^[^a-zа-яё]*[A-ZА-ЯЁ]{4,}[^a-zа-яё]*$/.test(r)) h.casual = (h.casual || 0) + 0.5;
    if (/^[A-ZА-ЯЁ]/.test(r) && /[.!?]$/.test(r) && r.length > 25 && !h.casual) h.polite = (h.polite || 0) + 0.3;
    return h;
  }
  function detectMood(lo, it) {
    if (it && it.prio >= 90) return 'crisis';
    if (it && it.mood) return it.mood;
    if (it && ID_MOOD[it.id]) return ID_MOOD[it.id];
    for (var i = 0; i < MOOD.length; i++) if (MOOD[i][1].test(lo)) return MOOD[i][0];
    if (it && it.cat === 'philosophy') return 'reflective';
    if (it && it.cat && /^(emotion|emotion_followup|crisis)$/.test(it.cat) && /sad|vent|story/.test(it.id)) return 'sad';
    return 'neutral';
  }
  var EMOJI_RE = /(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF])\uFE0F?|\u200D|\uFE0F/g;
  function stripEmoji(t) { return t.replace(EMOJI_RE, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').replace(/^\s+|\s+$/g, ''); }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev[j - 2 < 0 ? 0 : j - 2] + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  // ── v2.1 follow-ups relative to the PREVIOUS bot reply ──
  var FU = [
    ['ret', /^(давай )?(вернемся|вернуться|вернись|назад|обратно|back to|lets go back to|go back to)( к| ко| to)? ?(.*)$/],
    ['thanks_adv', /^(спасибо за (совет|советы|идею|идеи|подсказку|помощь)|полезно|полезный совет|хороший совет|thanks for the (advice|tip|tips|idea)|good advice|useful|helpful)$/],
    ['disagree', /^(не согласен|не согласна|я не согласен|я не согласна|неправда|не так|не правда|не думаю|вряд ли|disagree|i disagree|not true|i dont think so)$/],
    ['agree', /^(согласен|согласна|я согласен|я согласна|точно|верно|правда|в точку|так и есть|полностью согласен|agree|i agree|true|exactly|so true|right|indeed)$/],
    ['unfunny', /^(не смешно|несмешно|не смешная|не очень смешно|так себе шутка|не понял шутку|not funny|unfunny|lame|bad joke)$/],
    ['funny', /^(смешно|ахаха|ахаха ахаха|ржу|смешная|очень смешно|улыбка|хорошая шутка|funny|haha|so funny|good one|smile)$/],
    ['short', /^(короче|покороче|кратко|короче говоря|в двух словах|в общем|если коротко|tldr|tl dr|in short|shorter|briefly|summary)$/],
    ['what', /^(не понял|не поняла|не понимаю|в смысле|в каком смысле|это как|как это|что ты имеешь в виду|что это значит|что значит|непонятно|не понятно|объясни|поясни|что|what|what do you mean|i dont understand|i dont get it|huh|meaning|explain)$/],
    ['detail', /^(подробнее|поподробнее|расскажи подробнее|детальнее|можно подробнее|а подробнее|расскажи больше|tell me more|more details|elaborate|explain more|go on|details)$/],
    ['more', /^(еще|давай еще|еще раз|еще один|еще одну|еще давай|more|another|one more|again)$/],
    ['why', /^(а )?(почему|зачем|с чего бы|с чего ты взяла|почему так|why|how come|why so)$/],
    ['you', /^(а )?(ты|сама|у тебя|а у тебя|а тебе|тебе|а ты как|ты как|and you|you|what about you|how about you)$/],
    ['maybe', /^(может|может быть|наверное|не знаю|возможно|посмотрим|подумаю|не уверен|не уверена|maybe|perhaps|not sure|dont know|i dont know|well see)$/],
    ['no', /^(нет|не|неа|не а|нет спасибо|не хочу|не надо|не нужно|не сейчас|нет нет|не особо|no|nope|nah|no thanks|not really|not now)$/],
    ['yes', /^(да|ага|угу|ок|конечно|давай|хочу|да давай|ну да|да хочу|да конечно|ага давай|можно|валяй|естественно|yes|yeah|yep|yup|sure|ok|of course|please|yes please|lets do it|lets go|why not|почему бы и нет)$/],
    ['pron', /^(а )?(он|она|оно|они|это|этот|эта|тот|та|его|ее|им|ей|he|she|it|they|that|this|him|her)( .+)?$/]
  ];
  FU.forEach(function (f) { f[1] = new RegExp(f[1].source.replace(/([а-яa-z])\1/g, '$1$1?')); }); // tolerate norm()'s letter squeeze (подробнее → подробне)
  var YESNO_Q = /(^|[\s.!—-])(хочешь|хотите|рассказать|рассказать ещё|сохранить|сохраним|давай|давайте|можно|будешь|поставлю|поставить|запишем|записать|сделаем|могу|подсказать|подскажу|попробуем|попробуешь|сыграем|составим|начнем|начнём|продолжим|ещё одну|еще одну|ещё один|ещё вопрос|готов|готова|получилось|стало|помогло|want|shall|should i|do you|would you|can i|ready|did it|does it|is it|are you)/i;
  function lastQ(text) {
    var t = String(text || '').replace(/\s+$/, ''), segs = t.split(/\n+/), q = null;
    for (var i = segs.length - 1; i >= 0 && !q; i--) if (/[?？]/.test(segs[i])) q = segs[i];
    if (!q) return null;
    var sent = q.split(/[.!…]\s+/), last = sent[sent.length - 1] || q;
    for (var j = sent.length - 1; j >= 0; j--) if (/[?？]/.test(sent[j])) { last = sent[j]; break; }
    var type = / или | or /i.test(last) ? 'choice' : (YESNO_Q.test(last) ? 'yesno' : 'open');
    var opts = type === 'choice' ? last.replace(/[?？].*$/, '').split(/,| или | or /i).map(function (x) { return x.replace(/^.*?(:|—)\s*/, '').trim().toLowerCase(); }).filter(Boolean) : null;
    return { type: type, text: last, opts: opts };
  }
  function firstSentence(t) { var ps = stripEmoji(String(t)).split(/\n+/).filter(function (p) { p = p.trim(); return p && !/:$/.test(p) && !/^(скажи|say) /i.test(p); }), x = (ps[0] || String(t)).trim(), re = /[^.!?]+[.!?]*/g, s = '', m;
    while ((m = re.exec(x)) && s.length < 25) s += m[0];
    return (s || x).trim(); }
  var TOPIC_KW = [[/работ|начальн|коллег|офис|job|work|boss/, /^(why_work|sub_ctx_work|ctx_work|job_|bz_|bzx_|pr_work|lf_new_job)/, 'ctx_work'],
    [/учеб|учёб|школ|универ|экзам|study|school|exam/, /^(why_study|sub_ctx_study|ctx_study|st_|stx_|sb_|kd_homework)/, 'ctx_study'],
    [/отношен|парн|девушк|любов|relationship|partner/, /^(why_relationship|sub_ctx_rel|ctx_rel|rl_|emo_breakup|lf_crush)/, 'ctx_rel'],
    [/семь|мам|пап|брат|сестр|родител|family|mom|dad/, /^(fm_|ctx_family|lf_parents|why_family)/, 'ctx_family'],
    [/деньг|финанс|бюджет|money|budget/, /^(mn_|pr_money|ctx_money|why_money)/, 'ctx_money'],
    [/здоров|самочув|health/, /^(hl_|hlx_|mood_sick|sub_sick)/, null],
    [/питом|кот|кош|собак|pet|cat|dog/, /^(fn_pet|pet_|pt_)/, 'pet'],
    [/путешеств|поездк|отпуск|travel|trip/, /^(tr_|geo_|lf_vacation)/, 'trip'],
    [/хобби|увлечен|hobby/, /^(hb_)/, 'hobby'],
    [/истори|сказк|story/, /^(fl_story)/, 'story2']];
  // quality of matching pattern token p against input token u (0 = no match)
  function tokQ(p, u) {
    if (p === u) return 1;
    var pl = p.length, ul = u.length;
    if (pl >= 4 && ul >= 4) {
      var k = Math.min(pl, ul, 6), pre = Math.max(4, k - 1);
      if (p.slice(0, pre) === u.slice(0, pre) && Math.abs(pl - ul) <= 3) return 0.9; // morphology (устал/устала)
      var d = lev(p, u, pl >= 7 ? 2 : 1);
      if (d <= (pl >= 7 ? 2 : 1)) return 0.8; // typo
    }
    return 0;
  }
  function compile(data) {
    var list = [];
    data.intents.forEach(function (it, idx) {
      ['ru', 'en'].forEach(function (L) {
        (it.patterns[L] || []).forEach(function (p) {
          var e = { it: it, L: L, raw: p, idx: idx };
          if (p === '*') e.star = true;
          else if (p.indexOf('{') >= 0) {
            var slots = [];
            var src = '^' + norm(p).split(/(\{[a-z]+\})/).map(function (part) {
              var m = part.match(/^\{([a-z]+)\}$/);
              if (m) { slots.push(m[1]); return '(.+?)'; }
              return part.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
            }).join('') + '$';
            e.re = new RegExp(src); e.slots = slots;
          } else e.toks = norm(p).split(' ').filter(Boolean);
          e.n = list.length; list.push(e);
        });
      });
    });
    // token-index prefilter: every token of a plain pattern must fuzzy-match some user token (tokQ>0), so index each
    // pattern under its anchor token (longest content token). Long anchors (>=4) get keys for first-2 letters and their
    // one-edit variants; short anchors only match exactly. Regex and '*' patterns are always checked.
    var idx = {}, always = [];
    list.forEach(function (e) {
      if (!e.toks || !e.toks.length) { always.push(e.n); return; }
      var a = null;
      e.toks.forEach(function (t) { if (!a || (STOP[a] && !STOP[t]) || (!STOP[t] === !STOP[a] && t.length > a.length)) a = t; });
      var keys = a.length >= 4 ? ['l' + a.slice(0, 2), 'l' + a.slice(1, 3), 'l' + a.charAt(0) + a.charAt(2)] : ['x' + a];
      keys.forEach(function (k, i) { if (keys.indexOf(k) !== i) return; (idx[k] = idx[k] || []).push(e.n); });
    });
    list.idx = idx; list.always = always; list.mark = new Array(list.length);
    return list;
  }
  function userKeys(utoks) {
    var k = [], t, i;
    for (i = 0; i < utoks.length; i++) {
      t = utoks[i];
      k.push('x' + t);
      if (t.length >= 4) k.push('l' + t.slice(0, 2), 'l' + t.slice(1, 3), 'l' + t.charAt(0) + t.charAt(2), 'l' + t.charAt(1) + t.charAt(0));
    }
    return k;
  }
  function scorePattern(e, utoks, ucontent) {
    var p = e.toks, sum = 0, used = {}, i, j;
    for (i = 0; i < p.length; i++) {
      var best = 0, bj = -1;
      for (j = 0; j < utoks.length; j++) {
        if (used[j]) continue;
        var q = tokQ(p[i], utoks[j]);
        if (q > best) { best = q; bj = j; }
      }
      if (!best) return 0;
      used[bj] = 1; sum += best;
    }
    var covered = 0;
    for (j = 0; j < utoks.length; j++) if (used[j] && !STOP[utoks[j]]) covered++;
    var coverage = ucontent ? covered / ucontent : 1;
    var exact = (p.join(' ') === utoks.join(' ')) ? 30 : 0;
    // order bonus: contiguous phrase
    var phrase = utoks.join(' ').indexOf(p.join(' ')) >= 0 ? 8 : 0;
    return sum / p.length * 50 + coverage * 40 + Math.min(p.length, 5) * 3 + exact + phrase;
  }
  // ── safe calculator (no eval) ──
  function calc(expr) {
    var s = String(expr).toLowerCase().replace(/,/g, '.').replace(/×|х|x/g, '*').replace(/÷|:/g, '/')
      .replace(/плюс/g, '+').replace(/минус/g, '-').replace(/умножить на|умножь на|умножить/g, '*').replace(/разделить на|делить на|поделить на/g, '/')
      .replace(/в степени/g, '^').replace(/plus/g, '+').replace(/minus/g, '-').replace(/times|multiplied by/g, '*').replace(/divided by/g, '/')
      .replace(/[=?]/g, '').replace(/\s+/g, '');
    if (!/^[0-9.+\-*/^%()]+$/.test(s) || !/\d[+\-*/^%]|\)[+\-*/^%]|[+\-*/^]\d/.test(s)) return null;
    var pos = 0;
    function peek() { return s[pos]; }
    function num() {
      var m = s.slice(pos).match(/^\d+(\.\d+)?/); if (!m) throw 0; pos += m[0].length; return parseFloat(m[0]);
    }
    function atom() {
      if (peek() === '(') { pos++; var v = add(); if (peek() !== ')') throw 0; pos++; return v; }
      if (peek() === '-') { pos++; return -atom(); }
      var n = num(); if (peek() === '%') { pos++; n = n / 100; } return n;
    }
    function pow() { var b = atom(); if (peek() === '^') { pos++; return Math.pow(b, pow()); } return b; }
    function mul() { var v = pow(); while (peek() === '*' || peek() === '/') { var o = s[pos++], r = pow(); v = o === '*' ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var o = s[pos++], r = mul(); v = o === '+' ? v + r : v - r; } return v; }
    try { var v = add(); if (pos !== s.length || !isFinite(v)) return null; return Math.round(v * 1e10) / 1e10; } catch (x) { return null; }
  }

  function create(data, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random, nowFn = opts.now || function () { return new Date(); };
    var compiled = compile(data), dirty = false, TTL = data.context_ttl || 3;
    var st = { ctx: {}, mem: {}, used: {}, riddle: null, lastPool: null, lastPf: null, lastItem: null, lastLv: 1, seen: {}, packs: {}, turn: 0, sty: {}, style: 'warm', mood: 'neutral', moodLog: [], lastInsert: -99, lastNeg: -99, lastL: null };
    var STYLES = ['warm', 'polite', 'casual', 'pro', 'fun'], styleOpt = opts.style || 'warm';
    function pick(arr, key) {
      if (!arr || !arr.length) return '';
      key = key || '';
      var used = st.used[key] || [], avail = [], i;
      for (i = 0; i < arr.length; i++) if (used.indexOf(i) < 0) avail.push(i);
      if (!avail.length) { used = []; for (i = 0; i < arr.length; i++) avail.push(i); }
      var k = avail[Math.floor(rng() * avail.length)];
      used.push(k); st.used[key] = used.slice(-Math.max(1, arr.length - 1));
      return arr[k];
    }
    // ── pools: items are strings or {t,m,a,c,lv,tg,mo}; no repeats per session (seen by text), filters by category/level/tag/mood ──
    function txt(x) { return typeof x === 'string' ? x : (x.t || x.q || ''); }
    function poolArr(kind, L) { var p = data.pools && data.pools[kind]; return p ? (p[L] && p[L].length ? p[L] : (p.ru || [])) : []; }
    function fits(x, pf) {
      if (!pf) return true;
      if (typeof x === 'string') return !pf.c && !pf.tg && !pf.lv && !pf.m;
      if (pf.c && x.c !== pf.c && !(x.tg && x.tg.indexOf(pf.c) >= 0)) return false;
      if (pf.cx && (x.c === pf.cx)) return false;
      if (pf.tg && !(x.tg && x.tg.indexOf(pf.tg) >= 0)) return false;
      if (pf.lvN && x.lv !== pf.lvN) return false;
      if (pf.m && !x.m) return false;
      if (pf.mo && !(x.mo && x.mo.indexOf(pf.mo) >= 0)) return false;
      return true;
    }
    function pickPool(kind, L, pf) {
      var P = poolArr(kind, L), seenKey = kind + L, seen = st.seen[seenKey] = st.seen[seenKey] || {}, cand = [], fresh = [], i, relaxed = false;
      if (pf && pf.lv) {
        var lv = pf.lv === '+' ? Math.min(3, (st.lastLv || 1) + 1) : pf.lv === '-' ? Math.max(1, (st.lastLv || 1) - 1) : +pf.lv;
        pf = { lvN: lv, c: pf.c, tg: pf.tg };
      }
      for (i = 0; i < P.length; i++) if (fits(P[i], pf)) cand.push(P[i]);
      if (!cand.length) { relaxed = true; cand = P.slice(); }
      for (i = 0; i < cand.length; i++) if (!seen[txt(cand[i])]) fresh.push(cand[i]);
      if (!fresh.length) { for (i = 0; i < cand.length; i++) delete seen[txt(cand[i])]; fresh = cand; }
      if (!fresh.length) return null;
      var x = fresh[Math.floor(rng() * fresh.length)];
      seen[txt(x)] = 1;
      return { x: x, relaxed: relaxed };
    }
    function render(kind, x, L, pf) {
      if (typeof x === 'string') return x;
      var t = x.t;
      if (kind === 'joke') return t.replace(/ \/ /g, '\n');
      if (kind === 'quote') return '«' + t.replace(/^[«"]|[»"]$/g, '') + '»' + (x.a ? '\n— ' + x.a : '');
      if (kind === 'wisdom') return t + ((pf && pf.m && x.m) ? '\n\n💡 ' + (L === 'ru' ? 'Значение: ' : 'Meaning: ') + x.m : '');
      if (kind === 'aphorism') return t + (x.a ? '\n— ' + x.a : '');
      if (kind === 'poem') return '📜 ' + t.replace(/ \/ /g, '\n') + (x.a ? '\n\n— ' + x.a : '');
      if (kind === 'idiom') return '🗣️ «' + t + '»' + (x.m ? '\n💡 ' + (L === 'ru' ? 'Значение: ' : 'Meaning: ') + x.m : '');
      if (kind === 'tip') return '💡 ' + (L === 'ru' ? 'Совет: ' : 'Tip: ') + t;
      if (kind === 'twister') return '👅 «' + t.replace(/[.!]$/, '') + '»\n' + (L === 'ru' ? 'Уровень: ' : 'Level: ') + ['', '★☆☆', '★★☆', '★★★'][x.lv || 1] + (L === 'ru' ? ' · повтори три раза быстро!' : ' · say it three times fast!');
      return t;
    }
    // ── topic intent packs: data.intentPacks = {name:{file, keys:[anchor keys]}}; addIntents(pack) appends and recompiles ──
    function addIntents(p) {
      if (!p || !p.intents) return false;
      var have = {}; data.intents.forEach(function (x) { have[x.id] = 1; });
      p.intents.forEach(function (x) { if (!have[x.id]) { data.intents.push(x); byId[x.id] = x; } });
      dirty = true; // v14: recompile lazily once on the next match (batch loads)
      data._loaded = data._loaded || {}; data._loaded[p.pack] = 1;
      return true;
    }
    function intentPackFor(lo) {
      var M = data.intentPacks; if (!M) return null;
      var keys = [], best = null, bn = 0, k, i;
      lo.split(' ').forEach(function (t) { if (t) { keys.push('x' + t); if (t.length >= 5) keys.push('p' + t.slice(0, 5)); } });
      for (k in M) {
        if (data._loaded && data._loaded[k]) continue;
        var ks = M[k]._set; if (!ks) { ks = M[k]._set = {}; for (i = 0; i < M[k].keys.length; i++) ks[M[k].keys[i]] = 1; }
        var n = 0; for (i = 0; i < keys.length; i++) if (ks[keys[i]]) n++;
        if (n > bn) { bn = n; best = k; }
      }
      return best;
    }
    function packFor(kind) { var M = data.packs, k; if (!M) return null; for (k in M) if (M[k].pools && M[k].pools.indexOf(kind) >= 0 && !(data._loaded && data._loaded[k])) return k; return null; }
    function addPack(p) {
      if (!p) return false;
      var k, L;
      for (k in (p.pools || {})) {
        data.pools[k] = data.pools[k] || {};
        for (L in p.pools[k]) {
          var have = {}, merged = p.pools[k][L].slice();
          merged.forEach(function (x) { have[txt(x)] = 1; });
          (data.pools[k][L] || []).forEach(function (x) { if (!have[txt(x)]) merged.push(x); });
          data.pools[k][L] = merged;
        }
      }
      if (p.riddles) for (L in p.riddles) { var hv = {}, rr = p.riddles[L].slice(); rr.forEach(function (x) { hv[x.q] = 1; }); (data.riddles[L] || []).forEach(function (x) { if (!hv[x.q]) rr.push(x); }); data.riddles[L] = rr; }
      if (p.tales) { data._tales = data._tales || []; var th = {}; data._tales.forEach(function (x) { th[x.id] = 1; }); p.tales.forEach(function (x) { if (!th[x.id]) data._tales.push(x); }); }
      if (p.pack) { data._loaded = data._loaded || {}; data._loaded[p.pack] = 1; }
      return true;
    }
    // ── tales: data.tales = {groups:{g:{file,n,cu}}, who:{key:[g,id]}}; packs tales_<g> = {pack, tales:[{id,t,g,cu,src,ty,tg,age,s,p,m,en,who}]} ──
    var TALE_DARK = /страшное|грусть|война|предательство|наказание|конец света/;
    function taleLoad(g) {
      var T = data.tales; if (!T || !T.groups[g]) return false;
      if (data._loaded && data._loaded['tales_' + g]) return true;
      if (!opts.loadPack) return false;
      try { return addPack(opts.loadPack('tales_' + g)); } catch (e) { return false; }
    }
    function taleOk(x, tf, L) {
      if (!tf) return true;
      if (tf.g && x.g !== tf.g) return false;
      if (tf.cu && !new RegExp(tf.cu).test(x.cu)) return false;
      if (tf.ty && !new RegExp('^(' + tf.ty + ')$').test(x.ty)) return false;
      if (tf.src && !(x.src && x.src.indexOf(tf.src) >= 0)) return false;
      if (tf.tg && !new RegExp(tf.tg).test(x.tg.join(','))) return false;
      if (tf.moral && !x.m) return false;
      if (tf.q && !new RegExp(tf.q).test(x.t + ' ' + (x.src || '') + ' ' + (x.who || []).join(' '))) return false;
      var calm = tf.kids || tf.bed || st.bed;
      if (calm && (x.age === 'adult-soft' || TALE_DARK.test(x.tg.join(',')))) return false;
      if (tf.kids && x.ty === 'факт') return false;
      if ((x.ty === 'персонаж' || x.ty === 'факт') && !tf.ty && tf.g !== 'druid') return false;
      if (tf.len === 'l' && !(x.p && x.p.length >= 3)) return false;
      if (tf.len === 's' && x.p && x.p.length > 2) return false;
      if (L === 'en' && !x.en) return false;
      return true;
    }
    function talePick(tf, L) {
      var T = data.tales; if (!T) return null;
      var gs = [], g, tot = 0;
      if (tf && tf.g) gs = [tf.g]; else for (g in T.groups) if (g !== 'druid' || (tf && (tf.ty || tf.tg))) gs.push(g);
      if (tf && tf.cu && !tf.g) { gs = gs.filter(function (k) { return T.groups[k].cu.some(function (c) { return new RegExp(tf.cu).test(c); }); }); }
      // load lazily: specific filters → all candidate groups; generic → one weighted random group (+ whatever is loaded)
      var specific = tf && (tf.g || tf.cu || tf.ty || tf.src || tf.tg || tf.moral || tf.q);
      if (specific || gs.length === 1) gs.forEach(taleLoad);
      var more = function () { var un = gs.filter(function (k) { return !(data._loaded && data._loaded['tales_' + k]); }), t = 0, i, r; if (!un.length) return false; un.forEach(function (k) { t += data.tales.groups[k].n; }); r = rng() * t; for (i = 0; i < un.length; i++) { r -= data.tales.groups[un[i]].n; if (r <= 0 || i === un.length - 1) return taleLoad(un[i]); } return false; };
      if (!(specific || gs.length === 1) && !gs.some(function (k) { return data._loaded && data._loaded['tales_' + k]; })) more();
      st.taleSeen = st.taleSeen || {};
      var all = (data._tales || []).filter(function (x) { return gs.indexOf(x.g) >= 0 && taleOk(x, tf, L); });
      if (!all.length && tf && tf.len) { var tf2 = {}; for (var k in tf) if (k !== 'len') tf2[k] = tf[k]; all = (data._tales || []).filter(function (x) { return gs.indexOf(x.g) >= 0 && taleOk(x, tf2, L); }); }
      if (!all.length) return null;
      var fresh = all.filter(function (x) { return !st.taleSeen[x.id]; }), reset = false;
      while (!fresh.length && !specific && more()) { all = (data._tales || []).filter(function (x) { return gs.indexOf(x.g) >= 0 && taleOk(x, tf, L); }); fresh = all.filter(function (x) { return !st.taleSeen[x.id]; }); }
      if (!fresh.length) { all.forEach(function (x) { delete st.taleSeen[x.id]; }); fresh = all; reset = true; }
      var x = fresh[Math.floor(rng() * fresh.length)];
      st.taleSeen[x.id] = 1;
      return { x: x, reset: reset };
    }
    function taleHead(x, L) {
      var ru = L !== 'en', ic = x.ty === 'персонаж' ? '🧙' : x.ty === 'факт' ? '📜' : x.ty === 'миф' ? '⚡' : x.ty === 'былина' ? '🛡️' : '📖';
      return ic + ' «' + (ru ? x.t : x.en.t) + '»' + (ru ? ' — ' + x.cu + (x.src ? ' · ' + x.src : '') : '');
    }
    function taleTail(x, L, i) {
      var ru = L !== 'en', n = x.p ? x.p.length : 0, opt = [];
      if (n && i < n - 1) opt.push(ru ? '«дальше»' : "'next'");
      if (n && i < n - 1) opt.push(ru ? '«чем закончилось?»' : "'how did it end?'");
      if (x.m) opt.push(ru ? '«а мораль?»' : "'the moral?'");
      opt.push(ru ? '«ещё»' : "'another'"); opt.push(ru ? '«ещё из этой культуры»' : "'more from this culture'");
      return (st.bed ? (ru ? '🌙 ' : '🌙 ') : '💬 ') + opt.join(' · ') + (st.bed ? (ru ? '\nСладких снов…' : '\nSweet dreams…') : '');
    }
    function taleTell(tf, L, intro) {
      var r = talePick(tf, L), ru = L !== 'en';
      if (!r) {
        if (!data.tales) return { text: ru ? '📚 Сказки пока не загружены.' : '📚 Tales are not loaded yet.', sets: '' };
        return { text: ru ? '🤔 Такой сказки у меня пока нет. Скажи «расскажи сказку» — выберу другую.' : "🤔 I don't have one like that yet. Say 'tell me a story' and I'll pick another.", sets: '' };
      }
      var x = r.x, long = tf && tf.len === 'l' && x.p && L !== 'en';
      st.tale = { x: x, i: long ? 0 : -1, L: L }; st.taleTf = tf || {};
      var body = L === 'en' ? x.en.s : long ? x.p[0] + '\n\n(1/' + x.p.length + ')' : x.s;
      return { text: (r.reset ? (ru ? '🔁 Похожие я уже все рассказала — начинаю круг заново.\n\n' : '🔁 I have told all of those — starting over.\n\n') : '') + (intro || '') + taleHead(x, L) + '\n\n' + body + '\n\n' + taleTail(x, L, st.tale.i), sets: 'tale' };
    }
    function taleAction(a, it, vars, L) {
      var ru = L !== 'en', T = st.tale;
      if (a === 'tale') { var tf = it.tf || {}; if (tf.bed) st.bed = true; return taleTell(tf, L, tf.bed ? (ru ? '🌙 Устраивайся поудобнее. Режим сна включён — буду рассказывать только спокойные истории.\n\n' : '🌙 Get cosy. Bedtime mode is on — only calm stories now.\n\n') : ''); }
      if (a === 'tale_bed_off') { st.bed = false; return { text: ru ? '☀️ Режим сна выключен.' : '☀️ Bedtime mode off.', sets: '' }; }
      if (a === 'tale_more') return taleTell(st.taleTf || {}, L);
      if (a === 'tale_who') {
        var W = data.tales && data.tales.who, lo = ' ' + norm(vars._raw) + ' ', best = null, k;
        if (!W) return null;
        for (k in W) if (lo.indexOf(' ' + k + ' ') >= 0 && (!best || k.length > best.length)) best = k;
        if (!best) return null;
        taleLoad(W[best][0]);
        var x = null; (data._tales || []).forEach(function (y) { if (y.id === W[best][1]) x = y; });
        if (!x) return { text: ru ? '📚 Не могу открыть сборник сказок.' : "📚 Can't open the tales pack.", sets: '' };
        st.taleSeen = st.taleSeen || {}; st.taleSeen[x.id] = 1;
        if (L === 'en' && !x.en) L = 'ru';
        st.tale = { x: x, i: -1, L: L }; st.taleTf = { g: x.g };
        return { text: taleHead(x, L) + '\n\n' + (L === 'en' ? x.en.s : x.s) + '\n\n' + taleTail(x, L, -1), sets: 'tale' };
      }
      if (!T) return null;
      var X = T.x, n = X.p ? X.p.length : 0;
      if (a === 'tale_same') return taleTell({ cu: X.cu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), g: X.g }, L, ru ? '🌍 Ещё из той же традиции (' + X.cu + '):\n\n' : '🌍 Another from the same tradition:\n\n') ;
      if (a === 'tale_moral') return { text: X.m ? (ru ? '💡 Мораль: ' : '💡 Moral: ') + X.m : (ru ? '🤔 У этой истории нет одной традиционной морали — каждый находит в ней своё. А ты что из неё вынес(ла)?' : "🤔 There's no single traditional moral here — what did you take from it?"), sets: 'tale' };
      if (a === 'tale_next' || a === 'tale_end') {
        if (!n || (T.i >= n - 1 && a === 'tale_next')) return { text: (ru ? '🏁 Это вся история' + (n ? '' : ' — она короткая') + '. ' + (X.m ? 'Хочешь мораль? Или «ещё» — новую.' : 'Скажи «ещё» — расскажу новую.') : "🏁 That's the whole story. Say 'another' for a new one.") + (st.bed && ru ? '\n🌙 Сладких снов…' : ''), sets: 'tale' };
        T.i = a === 'tale_end' ? n - 1 : T.i + 1;
        var head = a === 'tale_end' ? (ru ? '🏁 Чем закончилось:\n\n' : '🏁 The ending:\n\n') : (T.i === 0 ? (ru ? '📖 Подробнее:\n\n' : '') : '');
        return { text: head + X.p[T.i] + '\n\n(' + (T.i + 1) + '/' + n + ')\n\n' + taleTail(X, L, T.i), sets: 'tale' };
      }
      return undefined;
    }
    function active(when) { if (!when) return true; for (var i = 0; i < when.length; i++) if (st.ctx[when[i]] > 0) return true; return false; }
    function fill(t, vars, L) {
      var name = st.mem.name;
      t = t.replace(/\{, name\}/g, name ? ', ' + name : '');
      return t.replace(/\{([a-z_]+)\}/g, function (m, k) {
        if (vars && vars[k] != null) return vars[k];
        if (k === 'name') return name || (L === 'en' ? 'friend' : 'друг');
        if (st.mem[k] != null) return st.mem[k];
        return m;
      });
    }
    function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
    function cleanName(v) {
      var w = String(v || '').trim().split(' ')[0];
      if (!/^[a-zа-я-]{2,20}$/.test(w) || NAME_BAD[w] || STOP[w]) return null;
      return cap(w);
    }

    function match(text) {
      var lo = norm(text, st.lastL), L = /[а-я]/.test(lo) ? 'ru' : (/[a-z]/.test(lo) ? 'en' : (st.lastL || 'ru'));
      var r = matchLo(lo, L), raw = String(text || '').toLowerCase();
      if (!/[а-яё]/.test(raw) && /[a-z]/.test(raw)) {
        var hits = (raw.match(TR_HINT) || []).length;
        if (hits) {
          var lo2 = norm(translit(raw)), r2 = matchLo(lo2, 'ru');
          if (r2.it && (!r.it || r2.score > r.score + (hits > 1 ? -10 : 5))) { r2.translit = true; r = r2; }
        }
      }
      return r;
    }
    var stamp = 0;
    function candidates(utoks) {
      if (opts.prefilter === false) { var all = []; for (var a = 0; a < compiled.length; a++) all.push(a); return all; }
      var out = compiled.always.slice(), keys = userKeys(utoks), mark = compiled.mark, i, j, b;
      stamp++;
      for (i = 0; i < out.length; i++) mark[out[i]] = stamp;
      for (i = 0; i < keys.length; i++) {
        b = compiled.idx[keys[i]]; if (!b) continue;
        for (j = 0; j < b.length; j++) if (mark[b[j]] !== stamp) { mark[b[j]] = stamp; out.push(b[j]); }
      }
      out.sort(function (x, y) { return x - y; });
      return out;
    }
    function matchLo(lo, L) {
      if (dirty) { compiled = compile(data); dirty = false; }
      var utoks = lo.split(' ').filter(Boolean), ucontent = 0;
      utoks.forEach(function (t) { if (!STOP[t]) ucontent++; });
      var best = null, star = null, cand = candidates(utoks);
      for (var ci = 0; ci < cand.length; ci++) {
        var e = compiled[cand[ci]], it = e.it;
        if (!active(it.when)) continue;
        var ctxBonus = it.when ? 25 : 0, sc = 0, vars = null;
        if (e.star) { if (e.L === L && (!star || ctxBonus || it.grab)) star = { it: it, score: 1, L: L }; continue; }
        if (e.re) {
          var m = lo.match(e.re);
          if (!m) continue;
          vars = {}; var ok = true;
          for (var k = 0; k < e.slots.length; k++) {
            var v = m[k + 1].trim(), sl = e.slots[k];
            if (sl === 'name' || sl === 'petname') { v = cleanName(v); if (!v || (e.raw === '{' + sl + '}' && utoks.length > 2)) ok = false; }
            if (sl === 'like' && (v.length > 40 || v.split(' ').length > 5)) ok = false;
            if ((sl === 'a' || sl === 'b') && v.split(' ').length > 3) ok = false;
            if (sl === 'expr') { var r = calc(v); if (r === null) ok = false; else vars.result = String(r).replace('.', L === 'ru' ? ',' : '.'); }
            vars[sl] = v;
          }
          if (!ok) continue;
          sc = 85 + (e.slots.length ? 5 : 0);
        } else {
          if (e.toks.length > utoks.length) continue;
          sc = scorePattern(e, utoks, ucontent);
          if (!sc) continue;
          if (e.L !== L) sc -= 15;
        }
        sc += ctxBonus + (it.prio || 0);
        if (!best || sc > best.score) best = { it: it, score: sc, vars: vars, L: L, pat: e.raw };
      }
      // threshold: weak global matches on long free text lose to a contextual catch-all
      var TH = 62;
      if ((!best || best.score < TH) && !star && opts.ctxFallback !== false) {
        // context-free fallback: a contextual intent (e.g. mood_good after "how are you") may answer without its context,
        // but only for plain multi-letter statements, never flow/follow-up/game steps.
        for (var fi = 0; fi < cand.length; fi++) {
          var fe = compiled[cand[fi]], fit = fe.it;
          if (!fit.when || active(fit.when) || !fe.toks || fit.cat === 'dialog_followup' || fit.cat === 'flow' || fit.cat === 'emotion_followup' || fit.cat === 'game' || /^(fl_|fu_|ctx_|riddle|pt_|pool_|f_|tl_)|_c\d+$/.test(fit.id)) continue;
          if (fe.toks.length > utoks.length || fe.toks.join('').length < 5) continue;
          var fsc = scorePattern(fe, utoks, ucontent); if (!fsc) continue;
          if (fe.L !== L) fsc -= 15;
          fsc += (fit.prio || 0) - 12;
          if (fsc >= TH && (!best || fsc > best.score)) best = { it: fit, score: fsc, vars: null, L: L, pat: fe.raw, ctxFree: true };
        }
      }
      if (star && star.it.grab && (!best || (!best.it.when && !(best.it.prio >= 50)))) return { it: star.it, score: 1, L: L, vars: {}, star: true, lo: lo };
      if (star && st.ctx && (!best || (best.score < TH + 25 && !best.it.when) || best.score < TH)) {
        if (!best || !(best.it.prio >= 50)) return { it: star.it, score: 1, L: L, vars: {}, star: true, lo: lo };
      }
      if (best && best.score >= TH) { best.lo = lo; return best; }
      return { it: null, L: L, score: best ? best.score : 0, lo: lo };
    }

    function doAction(it, vars, L) {
      var d = nowFn(), a = it.action, loc = L === 'ru' ? 'ru-RU' : 'en-GB';
      switch (a) {
        case 'time': vars.time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }); break;
        case 'date': vars.date = d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }); break;
        case 'weekday': vars.weekday = d.toLocaleDateString(loc, { weekday: 'long' }); break;
        case 'year': vars.year = String(d.getFullYear()); break;
        case 'coin': vars.coin = rng() < 0.5 ? (L === 'ru' ? 'орёл' : 'heads') : (L === 'ru' ? 'решка' : 'tails'); break;
        case 'dice': vars.dice = String(1 + Math.floor(rng() * 6)); break;
        case 'rand': vars.rand = String(1 + Math.floor(rng() * 100)); break;
        case 'rps': vars.rps = pick(L === 'ru' ? ['камень ✊', 'ножницы ✌️', 'бумага ✋'] : ['rock ✊', 'scissors ✌️', 'paper ✋'], 'rps'); break;
        case 'pick_or': vars.pick = rng() < 0.5 ? vars.a : vars.b; break;
        case 'recall_name':
          if (!st.mem.name) return { text: L === 'ru' ? '🙂 Ты ещё не говорил(а) мне своё имя. Как тебя зовут?' : "🙂 You haven't told me your name yet. What is it?", sets: 'ask_name' };
          break;
        case 'recall_memory':
          var parts = [];
          if (st.mem.name) parts.push((L === 'ru' ? 'тебя зовут ' : 'your name is ') + st.mem.name);
          if (st.mem.likes && st.mem.likes.length) parts.push((L === 'ru' ? 'ты любишь ' : 'you like ') + st.mem.likes.join(', '));
          if (st.mem.petname) parts.push((L === 'ru' ? 'твоего питомца зовут ' : "your pet's name is ") + st.mem.petname);
          if (st.mem.mood) parts.push((L === 'ru' ? 'настроение было: ' : 'your mood was: ') + st.mem.mood);
          if (!parts.length) return { text: L === 'ru' ? '🧠 Пока я почти ничего о тебе не знаю. Расскажи: как тебя зовут, что любишь?' : "🧠 I don't know much about you yet. What's your name, what do you like?" };
          vars.memory_summary = parts.join('; ') + '.'; break;
        case 'forget': st.mem = {}; break;
        case 'riddle': case 'riddle_again':
          var pool = data.riddles[L] || data.riddles.ru, ri = pool.indexOf(pick(pool, 'riddle_' + L));
          st.riddle = { L: L, i: ri, tries: 0 };
          return { text: pick(L === 'ru' ? ['🧩 Загадка:', '🤔 Отгадай:', '✨ Слушай загадку:'] : ['🧩 Riddle:', '🤔 Guess:'], 'rq') + '\n\n' + pool[ri].q + '\n\n' + (L === 'ru' ? '💡 Пиши ответ, «подсказка» или «сдаюсь».' : "💡 Answer, 'hint' or 'I give up'.") };
        case 'riddle_hint': case 'riddle_answer':
          if (!st.riddle) return null;
          var rr = data.riddles[st.riddle.L][st.riddle.i];
          vars.hint = rr.a[0].charAt(0).toUpperCase(); vars.answer = rr.a[0];
          if (a === 'riddle_hint' && rr.h) return { text: '💡 ' + (L === 'ru' ? 'Подсказка: ' : 'Hint: ') + rr.h + (L === 'ru' ? ' Первая буква — «' : " First letter: '") + vars.hint + (L === 'ru' ? '».' : "'."), sets: 'riddle' };
          if (a === 'riddle_answer') st.riddle = null;
          break;
        case 'riddle_check':
          if (!st.riddle) return null;
          var R = data.riddles[st.riddle.L][st.riddle.i], g = norm(vars._raw), okk = false;
          R.a.forEach(function (ans) { ans = norm(ans); g.split(' ').forEach(function (w) { if (tokQ(ans, w) >= 0.8 || g === ans) okk = true; }); });
          if (okk) { st.riddle = null; return { text: pick(L === 'ru' ? ['🎉 Правильно! Ты молодец! Ещё одну? Напиши «ещё».', '🏆 В точку! Хочешь ещё загадку?', '✅ Верно! Да ты мастер загадок 😄 Ещё?'] : ['🎉 Correct! Another? Type \'more\'.', '🏆 Spot on! One more?'], 'rok'), sets: 'riddle_done' }; }
          st.riddle.tries++;
          return { text: st.riddle.tries >= 2 ? (L === 'ru' ? '🤏 Не совсем. Хочешь подсказку? Напиши «подсказка» или «сдаюсь».' : "🤏 Not quite. 'hint' or 'I give up'?") : pick(L === 'ru' ? ['🙂 Не угадал(а), попробуй ещё!', '🤔 Хм, нет. Ещё попытка?'] : ['🙂 Nope, try again!', '🤔 Not that. Another guess?'], 'rno'), sets: 'riddle' };
        case 'more': break;
        case 'tale': case 'tale_next': case 'tale_end': case 'tale_moral': case 'tale_same': case 'tale_who': case 'tale_more': case 'tale_bed_off':
          return taleAction(a, it, vars, L);
        case 'meaning': case 'author':
          var li = st.lastItem;
          if (!li) return null;
          var x = li.x, ru = L === 'ru';
          if (a === 'meaning') {
            if (li.kind === 'wisdom' && x.m) return { text: (ru ? '💡 Смысл: ' : '💡 Meaning: ') + x.m + (ru ? '\n\nХочешь ещё пословицу? Скажи «ещё».' : "\n\nAnother one? Say 'more'."), sets: li.kind };
            if (li.kind === 'quote') return { text: ru ? '💭 Я понимаю это так: в короткой фразе спрятан опыт автора — попробуй примерить её к своей ситуации. А как ты сам(а) её понимаешь?' : '💭 I read it as condensed experience — try applying it to your own situation. How do you read it?', sets: li.kind };
            return { text: ru ? '🤔 Тут смысл почти буквальный — фраза говорит сама за себя. Дать другую, с объяснением?' : '🤔 It means pretty much what it says. Want another one with an explanation?', sets: li.kind };
          }
          if (li.kind === 'wisdom') return { text: ru ? '📜 Это народная мудрость — у пословиц нет одного автора.' : "📜 It's a traditional saying — proverbs don't have a single author.", sets: li.kind };
          if (li.kind === 'quote') return { text: x.a ? (ru ? '✍️ Автор: ' : '✍️ Source: ') + x.a + '.' : (ru ? '🤷 Точная атрибуция этой фразы не установлена — я не стану приписывать её кому-то наугад.' : "🤷 This one has no well-established attribution, so I won't guess."), sets: li.kind };
          return { text: ru ? '😄 Это народное творчество — автор неизвестен.' : "😄 That's folklore — author unknown.", sets: li.kind };
        case 'joke_switch':
          var lc = st.lastItem && st.lastItem.kind === 'joke' && st.lastItem.x.c, cats = {}, P2 = poolArr('joke', L), ks = [];
          P2.forEach(function (y) { if (y.c && y.c !== lc) cats[y.c] = 1; });
          for (var ck in cats) ks.push(ck);
          var pf2 = ks.length ? { c: ks[Math.floor(rng() * ks.length)] } : null, pr = pickPool('joke', L, pf2);
          if (!pr) return undefined;
          st.lastItem = { kind: 'joke', x: pr.x }; st.lastPool = 'joke'; st.lastPf = pf2;
          return { text: pick(L === 'ru' ? ['😅 Не зашло — понимаю! Давай другой жанр:', '🙃 Ладно, меняю пластинку:', '😄 Окей, попробуем совсем другое:'] : ['😅 Fair! Different kind then:', '🙃 Okay, switching genres:'], 'jsw') + '\n\n' + render('joke', pr.x, L) + '\n\n' + (L === 'ru' ? '💬 Скажи «ещё» — расскажу ещё из этой серии.' : "💬 Say 'more' for another like this."), sets: 'joke' };
      }
      return undefined;
    }

    function replyCore(text, m) {
      st.turn++;
      var it = m.it, L = m.L, out = null, sets;
      st.lastL = L;
      observe(text, m.lo || '', it);
      if (!it) { decay(); return { text: null, intent: null, score: m.score, mood: st.mood, style: curStyle() }; }
      var vars = m.vars || {}; vars._raw = text;
      // memory
      if (it.capture && vars.name) st.mem.name = vars.name;
      if (it.capture && vars.like) { st.mem.likes = (st.mem.likes || []).concat([vars.like]).slice(-5); }
      if (it.capture && vars.petname) st.mem.petname = vars.petname;
      if (it.remember) for (var k in it.remember) st.mem[k] = it.remember[k];
      sets = it.sets;
      var poolName = it.pool === '$ctx' ? st.lastPool : it.pool;
      if (it.action === 'more' && !poolName) { decay(); return { text: null, intent: null, score: 0 }; }
      if (it.action && it.action !== 'more') {
        var r = doAction(it, vars, L);
        if (r === null) { decay(); return { text: null, intent: null, score: 0 }; }
        if (r) { out = r.text; if (r.sets !== undefined) sets = r.sets; }
      }
      var needPack = null;
      if (!out && poolName && data.pools[poolName]) {
        var pf = it.action === 'more' ? st.lastPf : (it.pf || null);
        if (it.action === 'more' && pf && pf.lv) pf = { lv: st.lastLv };
        needPack = packFor(poolName);
        if (needPack && opts.loadPack) { try { if (addPack(opts.loadPack(needPack))) needPack = null; } catch (e) { } }
        var pr = pickPool(poolName, L, pf);
        if (pr) {
          var intro = it.action === 'more' ? pick(L === 'ru' ? ['🌿 Вот ещё:', '✨ Держи следующую:', '📜 И ещё:'] : ['🌿 Here\'s another:', '✨ Next one:'], 'mi') + '\n\n' : '';
          if (pr.relaxed && pf && (pf.c || pf.tg) && it.action !== 'more') intro = (L === 'ru' ? '🙂 Именно на эту тему у меня пока мало, но вот близкое:' : "🙂 I don't have much on exactly that, but here's something close:") + '\n\n';
          var tail = { wisdom: L === 'ru' ? (pf && pf.m ? '💬 «Ещё» — следующая пословица.' : '💬 «Ещё» — следующая; «что это значит?» — объясню.') : "💬 'more' for another, 'what does it mean?' for the meaning.",
            quote: L === 'ru' ? '💬 «Ещё» — следующая; «чья это цитата?» — скажу автора.' : "💬 'more' for another, 'who said that?' for the source.",
            twister: L === 'ru' ? '💬 «Ещё», «посложнее» или «попроще».' : "💬 'more', 'harder' or 'easier'." }[poolName] || (L === 'ru' ? '💬 Скажи «ещё» — расскажу следующую.' : "💬 Say 'more' for another.");
          out = intro + render(poolName, pr.x, L, pf) + '\n\n' + tail;
          st.lastItem = { kind: poolName, x: pr.x };
          if (poolName === 'twister' && pr.x.lv) st.lastLv = pr.x.lv;
          if (it.action !== 'more') st.lastPf = pf;
        }
        st.lastPool = poolName; sets = poolName;
      }
      if (!out) {
        var sty = curStyle(), SS = it.styles && it.styles[L], reps = null, derived = false;
        if (sty !== 'warm' && SS && SS[sty] && SS[sty].length) reps = SS[sty];
        if (!reps) { reps = (it.replies[L] && it.replies[L].length) ? it.replies[L] : it.replies[L === 'ru' ? 'en' : 'ru']; derived = sty !== 'warm'; }
        out = fill(pick(reps, it.id + L + (reps === it.replies[L] ? '' : sty)), vars, L);
        if (derived && sty === 'pro') out = stripEmoji(out);
      }
      if (it.foot && opts.footer && data.foot) out += '\n\n' + pick(data.foot[L], 'foot' + L);
      // context update
      if (sets !== undefined) { st.ctx = {}; if (sets) st.ctx[sets] = TTL; }
      else decay();
      if (it.pool && it.pool !== '$ctx') st.lastPool = it.pool;
      var base = out, ins = insertFor(it, L, out);
      if (ins) out += '\n\n' + ins.text;
      if (curStyle() === 'pro' && (it.action || poolName)) out = stripEmoji(out);
      var res = { text: out, base: base, L: L, intent: it.id, score: m.score, star: !!m.star, mood: st.mood, style: curStyle(), insert: ins ? ins.kind : null, translit: !!m.translit };
      if (needPack) res.needPack = needPack;
      return res;
    }

    // ── follow-ups relative to the previous bot reply ──
    var byId = {}; data.intents.forEach(function (x) { byId[x.id] = x; });
    st.hist = []; st.last = null; st.ents = [];
    function fuKind(lo) {
      if (!lo || lo.split(' ').length > 7) return null;
      for (var i = 0; i < FU.length; i++) { var mm = lo.match(FU[i][1]); if (mm) return { k: FU[i][0], m: mm }; }
      return null;
    }
    var YES_KW = [[/загадк|riddle/, 'riddle_ask'], [/шутк|анекдот|joke/, 'pool_joke'], [/факт|fact/, 'pool_fact'], [/подыш|дыхател|breath/, 'fl_breath_start'],
      [/сочин|историю|story/, 'fl_story_start'], [/благодарн|gratitude/, 'fl_grat_start'], [/мотивац|motivat/, 'pool_motivation'], [/идеи|идею|idea/, 'pool_idea'],
      [/выговор|vent/, 'sad_vent'], [/напомин|таймер|remind|timer/, 'app_reminders'], [/заметк|note/, 'app_notes']];
    function otherVariant(last) {
      var it = last.it, L = last.L, sty = curStyle(), SS = it.styles && it.styles[L];
      var reps = [].concat((SS && SS[sty]) || [], it.replies[L] || []), cands = [];
      for (var i = 0; i < reps.length; i++) { var t = fill(reps[i], {}, L); if (t !== last.base && cands.indexOf(t) < 0) cands.push(t); }
      return cands.length ? pick(cands, 'ov_' + it.id) : null;
    }
    function T(L, ru, en) { return L === 'en' ? en : ru; }
    function followUp(fk, lo, raw, m0) {
      var last = st.last, it = last.it, L = last.L, q = last.q, k = fk.k, out = null, target = null, keepQ = null, id = 'fu_' + k;
      var ex = it.expects || {};
      if (last.fuYes && k === 'yes') target = last.fuYes;
      switch (k) {
        case 'yes':
          if (!target && ex.yes) target = ex.yes;
          if (!target && st.lastPool && byId.pool_more && (!q || /ещ|more|another|друг/i.test(q.text || '') || it.pool)) target = 'pool_more';
          if (!target && q && q.type === 'yesno') for (var i = 0; i < YES_KW.length && !target; i++) if (YES_KW[i][0].test(q.text.toLowerCase()) && byId[YES_KW[i][1]] && active(byId[YES_KW[i][1]].when)) target = YES_KW[i][1];
          if (!target && q && q.type === 'yesno' && /подробн|ещё|еще|расскаж|more|tell/i.test(q.text)) { k = 'detail'; id = 'fu_detail'; break; }
          if (!target) {
            if (q && q.type === 'open') { out = T(L, '🙂 Расскажи подробнее — мне правда интересно!', "🙂 Tell me more — I'm curious!"); id = 'fu_yes_open'; keepQ = { type: 'open', text: '' }; }
            else if (q && q.type === 'choice') { out = T(L, '🙂 А что именно выберешь: ' + (q.opts || []).join(' или ') + '?', '🙂 Which one: ' + (q.opts || []).join(' or ') + '?'); id = 'fu_yes_choice'; keepQ = q; }
            else if (q) { out = T(L, '👍 Отлично! Тогда расскажи, что именно тебе интересно, — и я помогу.', '👍 Great! Tell me what exactly interests you and I\'ll help.'); id = 'fu_yes'; }
            else { out = T(L, '👍 Хорошо!', '👍 Okay!'); id = 'fu_ack'; }
          }
          break;
        case 'no':
          if (ex.no) { target = ex.no; break; }
          if (q && q.type === 'yesno') { out = T(L, '🙂 Хорошо, не буду. О чём тогда поговорим?', "🙂 Okay, no problem. What shall we talk about instead?"); id = 'fu_no'; }
          else if (q) { out = T(L, '💛 Понимаю. Если захочешь — расскажешь потом.', "💛 That's okay. You can tell me later if you want."); id = 'fu_no_open'; }
          else { out = T(L, '🙂 Окей.', '🙂 Okay.'); id = 'fu_ack'; }
          break;
        case 'maybe':
          out = T(L, '🙂 Без спешки — подумай. Решишь — просто напиши «да» или «нет».', "🙂 No rush. Just say 'yes' or 'no' when you decide."); keepQ = q; break;
        case 'why':
          out = it.why ? pick(it.why[L] || it.why.ru, 'why' + it.id) : (/^(fc_|facts|ms_space)/.test(it.id) || it.pool === 'fact' || (it.action === 'more' && st.lastPool === 'fact') || it.cat === 'facts' || it.cat === 'animals'
            ? T(L, '🔬 Так устроен мир 🙂 Это общепринятый научный факт; подробнее объяснит онлайн-режим с ключом ИИ в Настройках.', "🔬 That's how the world works 🙂 It's a well-established fact; the online mode can explain more.")
            : T(L, '💭 Я так сказала, потому что это обычно помогает в похожих ситуациях. Но твою ситуацию ты знаешь лучше — как думаешь сам(а)?', '💭 I said that because it usually helps in similar situations. But you know your situation best — what do you think?'));
          break;
        case 'you':
          out = it.you ? pick(it.you[L] || it.you.ru, 'you' + it.id) : (/howdy|mood_|greet/.test(it.id)
            ? T(L, '😊 У меня всё отлично, спасибо, что спросил(а)! Я рада нашему разговору.', "😊 I'm great, thanks for asking! Happy to chat.")
            : T(L, '🤖 Я офлайн-помощник, своего опыта у меня нет 😊 Но мне правда интересно, что думаешь ты!', "🤖 I'm an offline helper with no experiences of my own 😊 But I'd love to hear yours!"));
          break;
        case 'more': case 'detail':
          break;
        case 'what':
          if (it.rephrase) out = pick(it.rephrase[L] || it.rephrase.ru, 'rp' + it.id);
          else { var ov = otherVariant(last); out = T(L, '🙂 Скажу иначе: ', '🙂 Let me put it another way: ') + firstSentence(ov || last.base) + T(L, '\nЕсли непонятно что-то конкретное — спроси, разберём.', '\nIf something specific is unclear, ask and we\'ll sort it out.'); }
          id = 'fu_rephrase'; break;
        case 'short':
          out = T(L, 'Если коротко: ', 'In short: ') + firstSentence(last.base); break;
        case 'funny':
          out = (it.pool === 'joke' || st.lastPool === 'joke') ? T(L, '😄 Рада, что зашло! Ещё одну? Скажи «ещё».', "😄 Glad you liked it! Say 'more' for another.") : T(L, '😄 Хорошо, что улыбнуло!', '😄 Glad it made you smile!'); break;
        case 'unfunny':
          out = T(L, '😅 Юмор — дело вкуса. Попробую другую?', '😅 Humour is subjective. Try another one?'); keepQ = { type: 'yesno', text: '' }; st._fuYes = 'pool_joke'; break;
        case 'agree': out = T(L, '🤝 Приятно, что мы на одной волне!', "🤝 Nice to be on the same page!"); break;
        case 'disagree': out = T(L, '🙂 Справедливо — у каждого свой взгляд. Как ты это видишь?', '🙂 Fair enough — everyone sees it differently. How do you see it?'); keepQ = { type: 'open', text: '' }; break;
        case 'thanks_adv': out = T(L, '💛 Рада помочь! Расскажешь потом, как получилось?', '💛 Glad to help! Tell me later how it went?'); keepQ = { type: 'yesno', text: '' }; break;
        case 'pron':
          var ent = st.mem.petname || (st.ents.length ? st.ents[st.ents.length - 1] : null), rest = (fk.m[3] || '').trim();
          if (last.sets) st.ctx[last.sets] = TTL;
          if (rest) {
            var mm = matchLo(norm((ent ? ent + ' ' : '') + rest), L);
            if (!mm.it || mm.score < 62) mm = matchLo(norm(rest), L);
            if (mm.it) { var rr = replyCore(raw, mm); rr.via = 'fu_pron'; rr.ref = ent; return rr; }
          }
          out = ent ? T(L, '🙂 Ты про ' + ent + '? Расскажи, мне интересно!', '🙂 You mean ' + ent + '? Tell me more!') : T(L, '🙂 Ты про то, о чём мы только что говорили? Уточни, пожалуйста, — и я отвечу точнее.', '🙂 You mean what we just talked about? Could you clarify?');
          keepQ = { type: 'open', text: '' }; break;
        case 'ret':
          var kw = (fk.m[4] || '').trim(), topic = null, j;
          for (j = 0; j < TOPIC_KW.length; j++) if (TOPIC_KW[j][0].test(kw)) { topic = TOPIC_KW[j]; break; }
          if (!topic) return null;
          var found = null; for (j = st.hist.length - 1; j >= 0; j--) if (topic[1].test(st.hist[j].id)) { found = st.hist[j]; break; }
          st.ctx = {}; var cx = (found && found.sets) || topic[2]; if (cx) st.ctx[cx] = TTL;
          out = found ? T(L, '🔙 Вернёмся. Мы говорили: «' + firstSentence(found.text) + '»\nЧто сейчас важнее всего обсудить?', '🔙 Back to it. We were saying: "' + firstSentence(found.text) + '"\nWhat matters most right now?')
                      : T(L, '🔙 Давай. Расскажи, что сейчас происходит?', "🔙 Sure. Tell me what's going on?");
          id = 'fu_return'; keepQ = { type: 'open', text: '' };
          st.turn++; observe(raw, lo, found ? byId[found.id] : null);
          if (curStyle() === 'pro') out = stripEmoji(out);
          return { text: out, intent: id, score: 100, fu: true, mood: st.mood, style: curStyle(), keepQ: keepQ, keepCtx: true };
      }
      if (k === 'more' || k === 'detail') {
        if (it.more) out = pick(it.more[L] || it.more.ru, 'more' + it.id);
        else { var o2 = otherVariant(last); out = o2 ? T(L, '📎 Ещё об этом:\n\n', '📎 More on this:\n\n') + o2 : null; }
        if (!out) { out = T(L, '🙂 Офлайн это всё, что я знаю по этой теме. С ключом ИИ в Настройках смогу рассказать подробнее.', "🙂 That's all I know offline. With an AI key in Settings I can go deeper."); id = 'fu_detail_none'; }
        else id = 'fu_detail';
      }
      if (st._fuYes) { var fy = st._fuYes; st._fuYes = null; keepQ = keepQ || {}; keepQ.fuYes = fy; }
      if (target && byId[target]) { var r2 = replyCore(raw, { it: byId[target], L: L, vars: {}, score: 100, lo: lo }); r2.via = 'fu_' + fk.k; return r2; }
      if (!out) return null;
      st.turn++; observe(raw, lo, it); decay();
      if (curStyle() === 'pro') out = stripEmoji(out);
      return { text: out, intent: id, score: 100, fu: true, mood: st.mood, style: curStyle(), keepQ: keepQ };
    }
    var SMALL_CAT = /^(greeting|howdy|farewell|polite|wow|social|smalltalk|game|fun|flow)$/;
    function reply(text) {
      var lo0 = norm(text, st.lastL), fk = st.last ? fuKind(lo0) : null, m = match(text), r = null, prev = st.last, needI = null;
      if ((!m.it || m.score < 100) && data.intentPacks) {
        for (var tries = 0; tries < 3 && (!m.it || m.score < 100); tries++) {
          needI = intentPackFor(lo0); if (!needI || !opts.loadPack) break;
          try { if (addIntents(opts.loadPack(needI))) { var m2 = match(text); if (m2.it && (!m.it || m2.score > m.score)) m = m2; needI = null; } else break; } catch (e) { break; }
        }
      }
      // v14: death/funeral/memorial words always route to condolences (e.g. «годовщина смерти мамы»)
      if (byId.emo_grief && /(^| )(умер|умерл|смерт|погиб|похорон|помин|скончал|died|death|funeral|passed away)/.test(lo0) && !/(не умер|чуть не|умираю от смеха|до смерти (хочу|устал|надоел))/.test(lo0) && (!m.it || !/grief|crisis|abuse|loss|condol/.test(m.it.id))) m = { it: byId.emo_grief, L: /[а-я]/.test(lo0) ? 'ru' : 'en', vars: {}, score: 100, lo: lo0 };
      var specific = m.it && ((m.it.when && !m.star) || m.it.prio >= 50 || (m.star && m.it.grab) || (m.it.action === 'more' && st.lastPool)) && !(fk && m.it.id === 'ctx_no' && fk.k !== 'no' || /^riddle_/.test(m.it.id) && st.riddle);
      if (fk && !specific) r = followUp(fk, lo0, text, m);
      if (!r) r = replyCore(text, m);
      if (r.fu) {
        if (prev) { prev.q = r.keepQ ? { type: r.keepQ.type, text: r.keepQ.text || '', opts: r.keepQ.opts } : null; prev.fuYes = r.keepQ && r.keepQ.fuYes; prev.text = r.text; }
      } else if (r.intent) {
        var it = byId[r.intent];
        if (prev && it && prev.it && !it.when && it.cat !== prev.it.cat && !SMALL_CAT.test(it.cat) && !r.via) r.topicChange = true;
        var q = it.expects ? { type: it.expects.type || 'yesno', text: '' } : ((it.pool || /^(joke_switch|meaning|author)$/.test(it.action || '')) ? { type: 'yesno', text: 'ещё more' } : lastQ(r.text));
        st.last = { it: it, id: it.id, L: r.L || st.lastL || 'ru', text: r.text, base: r.base || r.text, q: q, sets: firstKey(st.ctx), turn: st.turn };
        st.hist = st.hist.concat([{ id: it.id, text: r.base || r.text, sets: st.last.sets, turn: st.turn }]).slice(-5);
        if (it.remember) for (var k2 in it.remember) if (/^(pet|person|trip|hobby)$/.test(k2)) st.ents = st.ents.concat([it.remember[k2]]).slice(-5);
      }
      r.lastQ = st.last && st.last.q ? st.last.q.type : null;
      if (needI) r.needPack = needI;
      return r;
    }
    function firstKey(o) { for (var k in o) return k; return null; }
    // ── style: explicit setting, or 'auto' = mirror the user (EMA over recent messages), fallback warm ──
    function curStyle() { return styleOpt === 'auto' ? st.style : (STYLES.indexOf(styleOpt) >= 0 ? styleOpt : 'warm'); }
    function observe(raw, lo, it) {
      var h = detectStyle(raw, lo), k, best = 'warm', bv = 0.9;
      for (k in st.sty) st.sty[k] *= 0.6;
      for (k in h) st.sty[k] = (st.sty[k] || 0) + h[k];
      for (k in st.sty) if (st.sty[k] > bv) { bv = st.sty[k]; best = k; }
      st.style = best;
      var md = detectMood(lo, it);
      st.mood = md; st.moodLog = st.moodLog.concat([md]).slice(-6);
      if (/^(crisis|grief|sad|angry)$/.test(md)) st.lastNeg = st.turn;
    }
    // ── context-aware inserts: support / wisdom / joke / fact / motivation, rate-limited, never jokes near sadness ──
    function insertFor(it, L, out) {
      if (opts.inserts === false || !data.pools) return null;
      if (it.action || it.pool || it.prio >= 50 || it.noinsert || /^(crisis|abuse|net_|app_|act_|riddle)/.test(it.id)) return null;
      if (out.length > 360 || /[?？]\s*$/.test(out)) return null;
      if (st.turn - st.lastInsert < (opts.insertGap || 4)) return null;
      var md = st.mood, sty = curStyle(), kind = null, recentNeg = st.turn - st.lastNeg <= 5;
      if (md === 'crisis') return null;
      if (/^(sad|stressed|angry|tired|grief)$/.test(md)) kind = (md === 'tired' && !recentNeg) ? 'motivation' : 'support';
      else if (md === 'reflective') kind = sty === 'pro' ? null : 'wisdom';
      else if (/^(bored|happy|celebrating)$/.test(md)) kind = recentNeg ? null : (sty === 'polite' || sty === 'pro' ? (md === 'bored' ? 'fact' : null) : (md === 'celebrating' ? 'motivation' : (rng() < 0.6 ? 'joke' : 'fact')));
      else if (md === 'neutral' && (sty === 'fun' || sty === 'casual') && !recentNeg) kind = rng() < 0.5 ? 'joke' : 'fact';
      if (!kind || !data.pools[kind]) return null;
      if (rng() > (opts.insertRate || (kind === 'support' ? 0.6 : 0.35))) return null;
      var pr = pickPool(kind, L, { mo: md }); if (!pr) return null;
      st.lastInsert = st.turn;
      var pre = { support: '💛 ', wisdom: L === 'ru' ? '💭 Мысль вдогонку: ' : '💭 A thought: ', joke: L === 'ru' ? '😄 Кстати, к слову: ' : '😄 By the way: ', fact: L === 'ru' ? '🧠 Кстати: ' : '🧠 Fun fact: ', motivation: '✨ ' }[kind];
      var t = pre + render(kind, pr.x, L);
      if (sty === 'pro') t = stripEmoji(t);
      return { kind: kind, text: t };
    }
    function decay() { for (var k in st.ctx) { st.ctx[k]--; if (st.ctx[k] <= 0) delete st.ctx[k]; } }
    return { reply: reply, match: match, state: st, addPack: function (p) { return p && p.intents ? addIntents(p) : addPack(p); }, addPacks: function (list) { var n = 0; (list || []).forEach(function (p) { if (p && (p.intents ? addIntents(p) : addPack(p))) n++; }); return n; }, hasPack: function (k) { return !!(data._loaded && data._loaded[k]); }, packs: function () { return data.packs || {}; }, calc: calc, norm: norm, setStyle: function (x) { styleOpt = x; }, style: curStyle };
  }
  return { create: create, norm: norm, calc: calc, translit: translit, detectStyle: detectStyle, detectMood: detectMood, stripEmoji: stripEmoji };
});
