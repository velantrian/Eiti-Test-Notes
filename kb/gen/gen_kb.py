#!/usr/bin/env python3
"""Generate kb/src/w_*.txt from Wikidata (CC0) — stable, structured facts only.
Each item: Russian label + Russian description + a few unambiguous properties.
Multi-valued years are skipped, numbers are only used where stable (atomic number, peak elevation).
Run: python3 kb/gen/gen_kb.py   (cached in kb/gen/cache/, not committed)
"""
import os, re, sys
from wd import sparql
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')

def q_items(cls, minsl, props, extra='', limit=6000, tag=None, cls_path='wdt:P31', en=False):
    sel, body = [], []
    for name, p, kind in props:
        if kind == 'label':
            body.append('OPTIONAL { ?x %s ?%s_ . ?%s_ rdfs:label ?%s FILTER(LANG(?%s)="ru") }' % (p, name, name, name, name))
        elif kind == 'year':
            body.append('OPTIONAL { ?x %s ?%s_ . BIND(YEAR(?%s_) AS ?%s) }' % (p, name, name, name))
        else:
            body.append('OPTIONAL { ?x %s ?%s }' % (p, name))
        sel.append('(GROUP_CONCAT(DISTINCT STR(?%s); SEPARATOR="|") AS ?%ss)' % (name, name))
    if ' ' in cls: cls_stmt = 'VALUES ?cls { %s } ?x %s ?cls .' % (cls, cls_path)
    else: cls_stmt = '?x %s %s .' % (cls_path, cls)
    q = ('SELECT ?x ?l ?d ?sl %s WHERE { %s ?x wikibase:sitelinks ?sl . FILTER(?sl >= %d) '
         + ('OPTIONAL { ?x rdfs:label ?lr FILTER(LANG(?lr)="ru") } OPTIONAL { ?x rdfs:label ?le FILTER(LANG(?le)="en") } BIND(COALESCE(?lr, ?le) AS ?l) FILTER(BOUND(?l)) ' if en else '?x rdfs:label ?l FILTER(LANG(?l)="ru") ') + 'OPTIONAL { ?x schema:description ?d FILTER(LANG(?d)="ru") } %s %s } '
         'GROUP BY ?x ?l ?d ?sl ORDER BY DESC(?sl) LIMIT %d') % (' '.join(sel), cls_stmt, minsl, extra, ' '.join(body), limit)
    rows = sparql(q, tag or ('it_' + __import__('hashlib').sha1(q.encode()).hexdigest()[:12]))
    out, seen = [], set()
    for r in rows:
        qid = r['x'].rsplit('/', 1)[1]
        if qid in seen: continue
        seen.add(qid)
        it = {'qid': qid, 'l': clean(r['l']), 'd': clean(r.get('d', '')), 'sl': int(r['sl'])}
        for name, _, _ in props:
            v = [clean(x) for x in (r.get(name + 's') or '').split('|') if x.strip()]
            it[name] = [x for x in v if x and not re.match(r'^Q\d+$', x) and not x.startswith('http')]
        out.append(it)
    return out

def clean(s):
    s = re.sub(r'\s+', ' ', str(s or '')).replace('|', '/').replace(';', ',').strip()
    return s

def one(v):
    return v[0] if len(v) == 1 else ''

def few(v, n=3):
    return ', '.join(v[:n]) if 0 < len(v) <= n else ''

def yr(v):
    """single unambiguous year (all values agree)."""
    ys = set(x for x in v if re.match(r'^-?\d{1,4}$', x))
    if len(ys) != 1: return ''
    y = int(ys.pop())
    return ('%d до н. э.' % (-y + 1)) if y <= 0 else str(y)

BAD_LABEL = re.compile(r'^(Q\d+|.*[a-z]{2,}.*\(.*\))$')
def ok_label(l):
    return l and len(l) <= 60 and not BAD_LABEL.match(l) and re.search(r'[A-Za-zА-Яа-яЁё]', l)

def desc(it):
    d = it['d']
    if not d or len(d) < 4 or re.search(r'страница значений|Викимедиа|wikimedia|категория', d, re.I): return ''
    if re.search(r'["!?]|похвал|https?:', d): return ''   # вандализм/мусор в описаниях
    return d

def sent(*parts):
    s = ' '.join(p.strip() for p in parts if p and p.strip())
    return re.sub(r'\s+', ' ', s).strip()

def cap(s): return s[:1].upper() + s[1:] if s else s

class Out:
    def __init__(self, dom, title, title_en):
        self.dom, self.title, self.title_en, self.lines, self.trig = dom, title, title_en, [], set()
    def add(self, triggers, answer):
        tt = []
        for t in triggers:
            t = clean(t).strip(' ,.')
            k = t.lower().replace('ё', 'е')
            if t and k not in self.trig and len(t) <= 80: self.trig.add(k); tt.append(t)
        if not tt or len(answer) < 20: return
        self.lines.append('%s || %s' % ('; '.join(tt), answer[:600]))
    def write(self):
        p = os.path.join(SRC, 'w_%s.txt' % self.dom)
        with open(p, 'w', encoding='utf-8') as f:
            f.write('# %s | %s\n# @generated from Wikidata (CC0) by kb/gen/gen_kb.py — do not edit by hand\n' % (self.title, self.title_en))
            f.write('\n'.join(self.lines) + '\n')
        print(self.dom, len(self.lines))

def gen_people():
    o = Out('people', 'Личности', 'People')
    its = q_items('wd:Q5', 62, [('b', 'wdt:P569', 'year'), ('e', 'wdt:P570', 'year'), ('c', 'wdt:P27', 'label')], limit=6000)
    last = {}
    for it in its:
        w = it['l'].split()
        if len(w) > 1: last[w[-1].lower()] = last.get(w[-1].lower(), 0) + 1
    for rank, it in enumerate(its):
        l, d = it['l'], desc(it)
        if not ok_label(l) or not d: continue
        w = l.split()
        # самые известные (верхние 1500 по числу статей) с уникальной фамилией: «кто такой Ленин» → Владимир Ильич Ленин
        it['alias'] = w[-1] if rank < 1500 and len(w) > 1 and len(w[-1]) >= 4 and last.get(w[-1].lower()) == 1 and w[-1].lower().replace('ё', 'е') not in other_labels() and re.match(r'^[А-ЯЁ][а-яё-]+$', w[-1]) else ''
        b, e = yr(it['b']), yr(it['e'])
        if not b or (b.isdigit() and int(b) >= 2005): continue   # без даты рождения и без детей/подростков
        if not b.isdigit() or int(b) < 1500:   # древние даты приблизительны — не указываем
            b = e = ''
        life = ('(%s–%s)' % (b, e) if e else '(род. %s)' % b) if b else ''
        a = sent('%s — %s.' % (sent(l, life), d), ('Гражданство: %s.' % few(it['c'], 2)) if b and few(it['c'], 2) else '')
        o.add(([l, 'кто такой ' + l] if ' ' in l else [l]) + (['кто такой ' + it['alias']] if it.get('alias') else []), a)
    o.write()

def gen_simple(dom, title, title_en, cls, minsl, props, fmt, trig=None, limit=6000, extra='', cls_path='wdt:P31', need_desc=True, en=False):
    o = Out(dom, title, title_en)
    for it in q_items(cls, minsl, props, extra=extra, limit=limit, cls_path=cls_path, en=en):
        l, d = it['l'], desc(it)
        if dom in ('events', 'wars') and (re.search(r'20[2-9]\d', l + d) or any(x.isdigit() and int(x) >= 2020 for k in ('y', 's', 'e') for x in it.get(k, []))):
            continue   # недавние/текущие события — нестабильные факты, пропускаем
        if not ok_label(l) or (need_desc and not d): continue
        a = fmt(it, l, d)
        if not a: continue
        tt = trig(it, l) if trig else [l]
        if dom in WORKS and plain_title(l) and len(tt) > 1: tt = tt[1:]   # «Собака», «Доброе утро» — только «картина/фильм/кто написал …»
        o.add(tt, a)
    o.write()

WORKS = {'books', 'films', 'paintings', 'music', 'games', 'stage'}
CHAT = set("""привет как дела|как дела|доброе утро|добрый день|добрый вечер|спокойной ночи|спасибо|пока|до свидания|я тебя люблю|люблю тебя|
я устал|мне грустно|мне скучно|мне одиноко|что делать|не знаю|давай поговорим|расскажи сказку|что нового|как тебя зовут|ты кто|кто ты|
скажи что-нибудь|всё хорошо|все хорошо|всё будет хорошо|все будет хорошо|я здесь|где ты|ты где|помоги мне|помогите|прости|извини|
с днём рождения|с днем рождения|с новым годом|ничего|почему|зачем|что это|кто я|я не знаю|давай|поехали|ну и что|и что|вот так|
мама|папа|собака|кошка|кот|лошадь|птица|рыба|человек|мир|война|мать|отец|дети|идиот|дурак|подарок|сюрприз|тишина|одиночество|дом|семья|друг|друзья|любовь|жизнь|счастье|сон|если|когда|утро|вечер|ночь|день|время|музыка|игра|работа|школа|дождь|снег|погода""".replace('\n', '').split('|'))
_COMMON = None
def common_words():
    """нарицательные слова, уже известные библиотеке (виды, блюда, понятия, ручные триггеры) — в нижнем регистре."""
    global _COMMON
    if _COMMON is None:
        _COMMON = set()
        for f in os.listdir(SRC):
            if not f.endswith('.txt') or f in ('w_books.txt', 'w_films.txt', 'w_paintings.txt', 'w_music.txt', 'w_games.txt', 'w_stage.txt'): continue
            for line in open(os.path.join(SRC, f), encoding='utf-8'):
                if '||' in line and not line.startswith('#'):
                    for t in line.split('||')[0].split(';'):
                        t = t.strip()
                        if t and t == t.lower(): _COMMON.add(t.replace('ё', 'е'))
    return _COMMON

_LABELS = None
def other_labels():
    """все триггеры других разделов (в нижнем регистре) — фамилия-псевдоним не должна их перекрывать («Марс», «Сатурн»)."""
    global _LABELS
    if _LABELS is None:
        _LABELS = set()
        for f in os.listdir(SRC):
            if not f.endswith('.txt') or f == 'w_people.txt': continue
            for line in open(os.path.join(SRC, f), encoding='utf-8'):
                if '||' in line and not line.startswith('#'):
                    for t in line.split('||')[0].split(';'):
                        t = t.strip().lower().replace('ё', 'е')
                        _LABELS.add(t)
                        for w in t.split(): _LABELS.add(w)
    return _LABELS

def plain_title(l):
    """название-реплика («Доброе утро») или одно обычное слово («Собака») — легко путается с репликой в чате."""
    n = re.sub(r'[^а-яёa-z0-9 -]+', ' ', l.lower()).split()
    k = ' '.join(n)
    return k in CHAT or k.startswith('язык программирования') or (len(n) == 1 and k.replace('ё', 'е') in common_words())

def lab(prefix, v, n=3):
    s = few(v, n)
    return (prefix + s + '.') if s else ''

def main():
    which = set(sys.argv[1:])
    def want(k): return not which or k in which
    if want('people'): gen_people()
    if want('concepts'): gen_concepts()
    if want('countries'):
        gen_simple('countries', 'Страны мира', 'Countries', 'wd:Q3624078', 1,
                   [('cap', 'wdt:P36', 'label'), ('cont', 'wdt:P30', 'label'), ('lang', 'wdt:P37', 'label'), ('cur', 'wdt:P38', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d or 'государство'), lab('Столица — ', it['cap'], 1), lab('Часть света: ', it['cont'], 2),
                                         lab('Официальный язык: ', it['lang'], 3), lab('Валюта: ', it['cur'], 2)),
                   trig=lambda it, l: [l, 'столица ' + l, 'страна ' + l] + (['валюта ' + l] if it['cur'] else []) + (['язык ' + l, 'официальный язык ' + l] if it['lang'] else []), extra='FILTER NOT EXISTS { ?x wdt:P576 ?end }', need_desc=False)
    if want('cities'):
        gen_simple('cities', 'Города мира', 'Cities', 'wd:Q515', 48, [('c', 'wdt:P17', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Страна: ', it['c'], 1)),
                   trig=lambda it, l: [l, 'город ' + l], cls_path='wdt:P31/wdt:P279*')
    if want('elements'):
        gen_simple('elements', 'Химические элементы', 'Chemical elements', 'wd:Q11344', 1, [('sym', 'wdt:P246', 'v'), ('n', 'wdt:P1086', 'v')],
                   lambda it, l, d: sent('%s — химический элемент.' % l, ('Символ — %s, атомный номер %s.' % (one(it['sym']), one(it['n']))) if one(it['sym']) and one(it['n']) else '', cap(d) + '.' if d and 'элемент' not in d else ''),
                   trig=lambda it, l: [l, 'элемент ' + l, 'атомный номер ' + l] + (['символ ' + one(it['sym'])] if one(it['sym']) else []), need_desc=False,
                   extra='?x wdt:P1086 ?an . FILTER(xsd:integer(?an) >= 1 && xsd:integer(?an) <= 118)')
    if want('rivers'):
        gen_simple('rivers', 'Реки', 'Rivers', 'wd:Q4022', 22, [('c', 'wdt:P17', 'label'), ('m', 'wdt:P403', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Протекает по странам: ', it['c'], 4), lab('Впадает в: ', it['m'], 1)),
                   trig=lambda it, l: ['река ' + l, l])
    if want('mountains'):
        gen_simple('mountains', 'Горы и вершины', 'Mountains', 'wd:Q8502', 22, [('c', 'wdt:P17', 'label'), ('h', 'wdt:P2044', 'v')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), ('Высота — около %d м.' % round(float(one(it['h'])))) if one(it['h']) else '', lab('Страна: ', it['c'], 3)),
                   trig=lambda it, l: ['гора ' + l, l], cls_path='wdt:P31/wdt:P279*')
    if want('lakes'):
        gen_simple('lakes', 'Озёра, моря и острова', 'Lakes, seas, islands', 'wd:Q23397', 25, [('c', 'wdt:P17', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Страна: ', it['c'], 4)), trig=lambda it, l: ['озеро ' + l, l])
    if want('islands'):
        gen_simple('islands', 'Острова', 'Islands', 'wd:Q23442', 28, [('c', 'wdt:P17', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Государство: ', it['c'], 2)), trig=lambda it, l: ['остров ' + l, l])
    if want('species'):
        gen_simple('species', 'Животные и растения', 'Animals and plants', 'wd:Q16521', 42, [('lat', 'wdt:P225', 'v'), ('par', 'wdt:P171', 'label')],
                   lambda it, l, d: sent('%s%s — %s.' % (l, (' (лат. %s)' % one(it['lat'])) if one(it['lat']) and one(it['lat']).lower() != l.lower() else '', d),
                                         lab('Входит в таксон: ', it['par'], 1)),
                   trig=lambda it, l: [l] + ([one(it['lat'])] if one(it['lat']) else []))
    if want('books'):
        gen_simple('books', 'Литература', 'Literature', 'wd:Q7725634 wd:Q47461344 wd:Q25379 wd:Q8261 wd:Q5185279', 22, [('a', 'wdt:P50', 'label'), ('y', 'wdt:P577', 'year')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Автор: ', it['a'], 2), ('Опубликовано: %s.' % yr(it['y'])) if yr(it['y']) else ''),
                   trig=lambda it, l: [l, 'кто написал ' + l])
    if want('paintings'):
        gen_simple('paintings', 'Живопись', 'Paintings', 'wd:Q3305213', 14, [('a', 'wdt:P170', 'label'), ('y', 'wdt:P571', 'year'), ('m', 'wdt:P195', 'label')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Автор: ', it['a'], 1), ('Создана: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Собрание: ', it['m'], 1)),
                   trig=lambda it, l: [l, 'картина ' + l])
    if want('music'):
        gen_simple('music', 'Музыкальные произведения', 'Music', 'wd:Q105543609', 30, [('a', 'wdt:P86', 'label'), ('p', 'wdt:P175', 'label'), ('y', 'wdt:P577', 'year')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Композитор: ', it['a'], 2), lab('Исполнитель: ', it['p'], 2), ('Год: %s.' % yr(it['y'])) if yr(it['y']) else ''),
                   trig=lambda it, l: [l, 'произведение ' + l])
    if want('films'):
        gen_simple('films', 'Кино', 'Films', 'wd:Q11424', 42, [('a', 'wdt:P57', 'label'), ('y', 'wdt:P577', 'year')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Режиссёр: ', it['a'], 2), ('Год выхода: %s.' % yr(it['y'])) if yr(it['y']) else ''),
                   trig=lambda it, l: [l, 'фильм ' + l])
    if want('battles'):
        gen_simple('events', 'Войны и сражения', 'Wars and battles', 'wd:Q178561', 30, [('y', 'wdt:P585', 'year'), ('s', 'wdt:P580', 'year'), ('e', 'wdt:P582', 'year'), ('pt', 'wdt:P361', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), ('Год: %s.' % (yr(it['y']) or yr(it['s']))) if (yr(it['y']) or yr(it['s'])) else '', lab('Часть: ', it['pt'], 1)),
                   trig=lambda it, l: [l])
    if want('wars'):
        gen_simple('wars', 'Войны', 'Wars', 'wd:Q198 wd:Q103495', 30, [('s', 'wdt:P580', 'year'), ('e', 'wdt:P582', 'year')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), ('Годы: %s–%s.' % (yr(it['s']), yr(it['e']))) if yr(it['s']) and yr(it['e']) else ''),
                   trig=lambda it, l: [l])
    if want('dishes'):
        gen_simple('dishes', 'Блюда и кухня', 'Dishes', 'wd:Q746549 wd:Q19861951', 40, [('c', 'wdt:P495', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Происхождение: ', it['c'], 2)), trig=lambda it, l: [l, 'блюдо ' + l])
    if want('languages'):
        gen_simple('languages', 'Языки мира', 'Languages', 'wd:Q34770', 40, [('f', 'wdt:P279', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (cap(l), d)), trig=lambda it, l: [l])
    if want('proglang'):
        gen_simple('proglang', 'Языки программирования', 'Programming languages', 'wd:Q9143', 12, [('y', 'wdt:P571', 'year'), ('a', 'wdt:P287', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d or 'язык программирования'), ('Появился: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Автор: ', it['a'], 3)),
                   trig=lambda it, l: [l, 'язык программирования ' + l], cls_path='wdt:P31/wdt:P279*', need_desc=False, en=True)

def gen_concepts():
    o = Out('concepts', 'Понятия: единицы, спорт, математика, инструменты', 'Concepts')
    for cls, sl, path, tpl in (('wd:Q47574', 25, 'wdt:P31/wdt:P279*', 'единица %s'), ('wd:Q31629', 25, 'wdt:P31', 'спорт %s'),
                               ('wd:Q24034552', 30, 'wdt:P31', 'термин %s'), ('wd:Q34379', 30, 'wdt:P31/wdt:P279*', 'инструмент %s'),
                               ('wd:Q151885', 60, 'wdt:P31', 'понятие %s')):
        for it in q_items(cls, sl, [], limit=1500, cls_path=path, tag='cc_%s_%d' % (cls[3:], sl)):
            l, d = it['l'], desc(it)
            if ok_label(l) and d: o.add([l, tpl % l], sent('%s — %s.' % (cap(l), d)))
    o.write()

if __name__ == '__main__':
    main()
