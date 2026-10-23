// VELANTRIM EITI v14.4.0 — немецкий слой офлайн-диалогов.
// Движок диалогов знает только RU/EN. Этот модуль:
//  1) toEn(text): переводит частые немецкие фразы в английские эквиваленты, которые движок понимает;
//  2) localize(intentId, enText): для основных намерений (приветствия, спасибо, как дела, помощь, прощание,
//     кто ты, что умеешь…) отдаёт готовый немецкий шаблон; для остального — null (хост оставляет английский ответ);
//  3) isGerman(text): эвристика «текст на немецком».
// Никакого машинного перевода: только написанные вручную шаблоны.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiOfflineDE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function norm(s) {
    return ' ' + String(s || '').toLowerCase().replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü')
      .replace(/[^a-zäöüß0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }
  // слова, которых почти не бывает в английском
  var DE_WORDS = /\s(und|ich|du|nicht|ist|bist|danke|bitte|hallo|tschüss|tschüs|guten|gute|morgen|abend|nacht|wie|was|wer|kannst|machst|geht|es|mir|dich|dir|mich|ein|eine|einen|noch|ja|nein|doch|hilfe|witz|märchen|geschichte|erzähl|erzähle|wieviel|viele|notizen|notiz|dateien|mal|geteilt|durch|wurzel|prozent|von|tag|heute|gestern|habe|hab|meine|mein|deine|dein|sehr|gut|schlecht|entschuldigung|tut|leid|klar|genau|toll|super|servus|moin|grüß|grüss|weiter|nochmal|vielen|dank)(?=\s)/g;
  var EN_WORDS = /\s(the|and|you|your|are|is|what|how|who|hello|hi|hey|thanks|thank|please|can|do|does|my|me|i|it|this|that|tell|joke|story|notes?|files?|times|plus|minus|of|good|morning|night|bye|yes|no|help|more|another)(?=\s)/g;
  function score(s, re) { var m = norm(s).replace(/ /g, '  ').match(re); return m ? m.length : 0; }
  function isGerman(text) {
    var raw = String(text || '');
    if (/[а-яё]/i.test(raw)) return false;
    if (/[äöüß]/i.test(raw)) return true;
    var d = score(raw, DE_WORDS), e = score(raw, EN_WORDS);
    return d > 0 && d > e;
  }
  function isEnglish(text) {
    var raw = String(text || '');
    if (/[а-яё]/i.test(raw) || /[äöüß]/i.test(raw)) return false;
    var d = score(raw, DE_WORDS), e = score(raw, EN_WORDS);
    return e > 0 && e >= d;
  }
  // немецкая фраза → английский эквивалент (порядок важен: более конкретные выше)
  var MAP = [
    [/^ (gute nacht|schlaf gut|schlaf schön) /, 'good night'],
    [/^ (guten morgen|morgen|moin|moin moin) /, 'good morning'],
    [/^ (guten tag|tag) /, 'good afternoon'],
    [/^ (guten abend|n abend) /, 'good evening'],
    [/ (wie geht es dir|wie gehts|wie geht s|wie geht es ihnen|wie geht s dir|alles gut bei dir|wie läuft s|wie läuft es) /, 'how are you'],
    [/^ (hallo|hallo du|hi|hey|servus|grüß dich|grüss dich|grüß gott|moin|na) /, 'hello'],
    [/^ (hallo|hi|hey|servus) /, 'hello'],
    [/ (vielen dank|danke schön|danke sehr|danke|dankeschön|merci) /, 'thank you'],
    [/^ (tschüss|tschüs|tschau|ciao|auf wiedersehen|bis bald|bis später|bis dann|bye) /, 'bye'],
    [/ (wer bist du|was bist du|wie heißt du|wie heisst du) /, 'who are you'],
    [/ (wer hat dich (gemacht|erschaffen|entwickelt|programmiert)) /, 'who made you'],
    [/ (was kannst du|was kannst du alles|was kannst du so|was machst du|wobei kannst du helfen) /, 'what can you do'],
    [/ (hilfe|hilf mir|kannst du mir helfen|ich brauche hilfe|hilfst du mir) /, 'what can you do'],
    [/ (erzähl|erzähle|sag|kennst du)( mir)? (einen |nen |noch einen )?witz /, 'tell me a joke'],
    [/^ (witz|ein witz|noch ein witz) /, 'tell me a joke'],
    [/ (erzähl|erzähle|lies)( mir)? (ein |eine )?(märchen|gutenachtgeschichte|gute nacht geschichte|geschichte) /, 'tell me a story'],
    [/^ (märchen|ein märchen) /, 'tell me a story'],
    [/^ (entschuldigung|sorry|tut mir leid|verzeihung) /, 'sorry'],
    [/^ (noch einen|noch eins|noch mal|nochmal|mehr|weiter|noch eine) /, 'more'],
    [/^ (ja|jawohl|klar|genau|ja gerne|gerne|ja bitte) /, 'yes'],
    [/^ (nein|nee|nö|nein danke) /, 'no'],
    [/^ (ok|okay|alles klar|gut|passt|in ordnung) /, 'ok'],
    [/ (mir geht es gut|mir gehts gut|mir geht s gut|alles gut|gut danke|sehr gut|super|prima|toll) /, 'i am great'],
    [/ (mir geht es schlecht|mir gehts schlecht|nicht so gut|schlecht) /, 'i feel bad'],
    [/ (mir ist langweilig|langweilig) /, 'i am bored'],
    [/ (ich bin müde|bin müde|müde) /, 'i am tired'],
    [/ (ich liebe dich|hab dich lieb) /, 'i love you'],
    [/ (welche sprache|sprichst du deutsch|kannst du deutsch|sprache ändern|sprache wechseln) /, 'change language']
  ];
  function toEn(text) {
    var s = norm(text);
    for (var i = 0; i < MAP.length; i++) if (MAP[i][0].test(s)) return MAP[i][1];
    return null;
  }
  // немецкие шаблоны по id намерения движка
  var TPL = {
    greet_hi: ['👋 Hallo! Schön, dich zu sehen. Wie geht es dir heute?', '😊 Hey! Wie ist deine Stimmung?', '✨ Hallo! Ich bin gerade offline, plaudere aber gern. Wie geht es dir?'],
    greet_morning: ['☀️ Guten Morgen! Wie hast du geschlafen?', '🌅 Morgen! Gut geschlafen?', '☕ Guten Morgen! Schon Kaffee oder Tee gehabt?'],
    greet_day: ['🌞 Guten Tag! Wie läuft dein Tag?', '😊 Guten Tag! Wie geht es dir?', '🌿 Hallo! Wie ist dein Tag bisher?'],
    greet_evening: ['🌆 Guten Abend! Wie war dein Tag?', '🌙 Guten Abend! Müde vom Tag?', '✨ Guten Abend! Erzähl, wie war dein Tag?'],
    greet_night: ['🌙 Hallo, Nachteule! Kannst du nicht schlafen?', '✨ Hallo! Hält dich etwas wach?', '🦉 Ein nächtlicher Besuch! Alles in Ordnung?'],
    greet_back: ['🤗 Willkommen zurück! Wie war es?', '😊 Du bist wieder da! Wie lief es?', '🏡 Schön, dass du wieder hier bist!'],
    greet_long: ['🥹 Schön, dich wiederzusehen! Was gibt es Neues?', '🤗 Lange nicht gesehen! Erzähl mir alles.', '💛 Ich habe dich vermisst! Was hast du so gemacht?'],
    bye: ['👋 Tschüss! Komm jederzeit wieder.', '😊 Bis bald! Pass auf dich auf 💛', '🌟 Auf Wiedersehen! Hab einen schönen Tag.'],
    mood_great: ['🥳 Wie schön! Was ist passiert?', '🌟 Das freut mich! Magst du die guten Neuigkeiten teilen?'],
    mood_bad: ['🫂 Das tut mir leid. Was ist passiert? Ich höre zu.', '💛 Schade, dass es dir nicht gut geht. Magst du erzählen?'],
    mood_bored: ['🎨 Wie wäre es mit einem Witz, einem Rätsel oder einer kleinen Geschichte? Sag einfach „Witz“ oder „Märchen“.'],
    mood_tired: ['🛋️ Klingt nach einer Pause: ein Glas Wasser, ein paar tiefe Atemzüge.', '😴 Gönn dir etwas Ruhe — du hast sie verdient.'],
    goodnight: ['🌙 Gute Nacht! Schlaf gut und träum etwas Schönes.', '✨ Gute Nacht! Bis morgen.', '😴 Schlaf schön! Ich bin morgen wieder da.'],
    howdy: ['😊 Ruhig und gut gelaunt — ich laufe offline! Und dir?', '💫 Alles gut, danke der Nachfrage! Und dir?', '🌿 Prima, besonders jetzt, wo du da bist. Wie geht es dir?'],
    thanks: ['😊 Gern geschehen!', '💛 Ich helfe gern!', '🌟 Jederzeit!'],
    sorry: ['🤗 Alles gut, kein Problem!', '💛 Mach dir keine Sorgen.', '🤗 Schon in Ordnung!'],
    ok_ack: ['👍 Super!', '👌 Abgemacht.', '👍 Prima!'],
    ctx_no: ['👌 Okay, wie du möchtest! Ich bin da.', '🙂 In Ordnung! Wir können auch einfach plaudern.'],
    who_are_you: ['✨ Ich bin EITI, deine Hilfe für Notizen, Dateien und Gespräche. Gerade bin ich offline; mit einem KI-Schlüssel in den Einstellungen kann ich viel mehr.'],
    who_made_you: ['🛠️ Ich bin Teil des Projekts Velantrim EITI — einer Web-App, die direkt in deinem Browser läuft.'],
    love_me: ['💛 Du bedeutest mir viel! Ich bin ein Programm, aber ich unterhalte mich sehr gern mit dir.', '🥰 Danke! Ich schätze jedes Gespräch mit dir.'],
    app_what_can: ['🧰 Offline kann ich: Notizen („Notiz: …“), Dateien, Rechnen („was ist 15 mal 7“), Fragen zu deinen Notizen („wie viele Notizen habe ich“, „finde in meinen Notizen …“), Witze, Märchen und Plaudern. Mit einem KI-Schlüssel in den Einstellungen kann ich viel mehr.'],
    app_notes: ['📝 Öffne den Tab „Notizen“ und tippe auf ➕. Suche im Chat: „finde in meinen Notizen …“.'],
    app_key: ['🔑 Einstellungen → API: Anbieter wählen (DeepSeek, ChatGPT, Gemini, OpenRouter …) und Schlüssel einfügen.'],
    app_offline_mode: ['✈️ Offline beantworte ich Fragen zu Notizen und Dateien, rechne und plaudere aus einer eingebauten Wissensbasis. Den Offline-Modus schaltest du in den Einstellungen um.'],
    app_lang: ['🌐 Die Sprache änderst du in den Einstellungen. Offline verstehe ich Russisch und Englisch gut und Deutsch in Grundzügen; vieles beantworte ich auf Englisch.'],
    app_version: ['ℹ️ Die Version steht unten in den Einstellungen.'],
    app_install: ['📲 iPhone: Safari → Teilen → „Zum Home-Bildschirm“. Android: Browsermenü → „App installieren“.'],
    app_privacy: ['🔒 Notizen, Dateien und Gedächtnis bleiben lokal in deinem Browser. Text geht nur online, wenn du die KI mit einem verbundenen Schlüssel fragst.']
  };
  var FOOT = ['🔌 Übrigens: Die KI ist gerade nicht verbunden — ich antworte offline. Mit einem Schlüssel in den Einstellungen antworte ich ausführlicher 🌐', '✈️ Ich bin gerade offline. Mit einem Schlüssel in den Einstellungen werde ich klüger ✨'];
  var EN_NOTE = '🇬🇧 (Diese Antwort gibt es offline nur auf Englisch.)';
  var NOKEY = '⚠️ Offline habe ich darauf keine Antwort. Richte einen KI-Schlüssel ein: Einstellungen → 🤖 KI.';
  var seq = 0;
  function localize(intentId, enText) {
    var arr = TPL[intentId];
    if (!arr) return null;
    var keep = (String(enText || '').match(/\n\n[\s\S]*$/) || [''])[0];
    var out = arr[(seq++) % arr.length];
    // хвосты движка («Anything else? 😊») — тоже по-немецки
    if (/Anything else/.test(keep)) out += '\n\nSonst noch etwas? 😊';
    else if (/Hope that helps/.test(keep)) out += '\n\nIch hoffe, das hilft 💛';
    return out;
  }
  return { isGerman: isGerman, isEnglish: isEnglish, toEn: toEn, localize: localize, TPL: TPL, FOOT: FOOT, EN_NOTE: EN_NOTE, NOKEY: NOKEY, version: '14.4.0' };
});
