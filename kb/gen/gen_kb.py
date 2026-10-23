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
    its = q_items('wd:Q5', 85, [('b', 'wdt:P569', 'year'), ('e', 'wdt:P570', 'year'), ('c', 'wdt:P27', 'label')], limit=6000)
    for it in its:
        l, d = it['l'], desc(it)
        if not ok_label(l) or not d: continue
        b, e = yr(it['b']), yr(it['e'])
        if not b: continue
        if not b.isdigit() or int(b) < 1500:   # древние даты приблизительны — не указываем
            b = e = ''
        life = ('(%s–%s)' % (b, e) if e else '(род. %s)' % b) if b else ''
        a = sent('%s — %s.' % (sent(l, life), d), ('Гражданство: %s.' % few(it['c'], 2)) if b and few(it['c'], 2) else '')
        o.add([l, 'кто такой ' + l] if ' ' in l else [l], a)
    o.write()

def gen_simple(dom, title, title_en, cls, minsl, props, fmt, trig=None, limit=6000, extra='', cls_path='wdt:P31', need_desc=True, en=False):
    o = Out(dom, title, title_en)
    for it in q_items(cls, minsl, props, extra=extra, limit=limit, cls_path=cls_path, en=en):
        l, d = it['l'], desc(it)
        if dom in ('events', 'wars') and (re.search(r'20[2-9]\d', l + d) or any(x.isdigit() and int(x) >= 2020 for k in ('y', 's', 'e') for x in it.get(k, []))):
            continue   # недавние/текущие события — нестабильные факты, пропускаем
        if not ok_label(l) or (need_desc and not d): continue
        a = fmt(it, l, d)
        if a: o.add((trig(it, l) if trig else [l]), a)
    o.write()

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
                   trig=lambda it, l: [l, 'столица ' + l, 'страна ' + l], extra='FILTER NOT EXISTS { ?x wdt:P576 ?end }', need_desc=False)
    if want('cities'):
        gen_simple('cities', 'Города мира', 'Cities', 'wd:Q515', 70, [('c', 'wdt:P17', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Страна: ', it['c'], 1)),
                   trig=lambda it, l: [l, 'город ' + l], cls_path='wdt:P31/wdt:P279*')
    if want('elements'):
        gen_simple('elements', 'Химические элементы', 'Chemical elements', 'wd:Q11344', 1, [('sym', 'wdt:P246', 'v'), ('n', 'wdt:P1086', 'v')],
                   lambda it, l, d: sent('%s — химический элемент.' % l, ('Символ — %s, атомный номер %s.' % (one(it['sym']), one(it['n']))) if one(it['sym']) and one(it['n']) else '', cap(d) + '.' if d and 'элемент' not in d else ''),
                   trig=lambda it, l: [l, 'элемент ' + l, 'атомный номер ' + l] + (['символ ' + one(it['sym'])] if one(it['sym']) else []), need_desc=False,
                   extra='?x wdt:P1086 ?an . FILTER(xsd:integer(?an) >= 1 && xsd:integer(?an) <= 118)')
    if want('rivers'):
        gen_simple('rivers', 'Реки', 'Rivers', 'wd:Q4022', 30, [('c', 'wdt:P17', 'label'), ('m', 'wdt:P403', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Протекает по странам: ', it['c'], 4), lab('Впадает в: ', it['m'], 1)),
                   trig=lambda it, l: ['река ' + l, l])
    if want('mountains'):
        gen_simple('mountains', 'Горы и вершины', 'Mountains', 'wd:Q8502', 30, [('c', 'wdt:P17', 'label'), ('h', 'wdt:P2044', 'v')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), ('Высота — около %d м.' % round(float(one(it['h'])))) if one(it['h']) else '', lab('Страна: ', it['c'], 3)),
                   trig=lambda it, l: ['гора ' + l, l], cls_path='wdt:P31/wdt:P279*')
    if want('lakes'):
        gen_simple('lakes', 'Озёра, моря и острова', 'Lakes, seas, islands', 'wd:Q23397', 25, [('c', 'wdt:P17', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Страна: ', it['c'], 4)), trig=lambda it, l: ['озеро ' + l, l])
    if want('islands'):
        gen_simple('islands', 'Острова', 'Islands', 'wd:Q23442', 40, [('c', 'wdt:P17', 'label')],
                   lambda it, l, d: sent('%s — %s.' % (l, d), lab('Государство: ', it['c'], 2)), trig=lambda it, l: ['остров ' + l, l])
    if want('species'):
        gen_simple('species', 'Животные и растения', 'Animals and plants', 'wd:Q16521', 60, [('lat', 'wdt:P225', 'v'), ('par', 'wdt:P171', 'label')],
                   lambda it, l, d: sent('%s%s — %s.' % (l, (' (лат. %s)' % one(it['lat'])) if one(it['lat']) and one(it['lat']).lower() != l.lower() else '', d),
                                         lab('Входит в таксон: ', it['par'], 1)),
                   trig=lambda it, l: [l] + ([one(it['lat'])] if one(it['lat']) else []))
    if want('books'):
        gen_simple('books', 'Литература', 'Literature', 'wd:Q7725634 wd:Q47461344 wd:Q25379 wd:Q8261 wd:Q5185279', 30, [('a', 'wdt:P50', 'label'), ('y', 'wdt:P577', 'year')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Автор: ', it['a'], 2), ('Опубликовано: %s.' % yr(it['y'])) if yr(it['y']) else ''),
                   trig=lambda it, l: [l, 'кто написал ' + l])
    if want('paintings'):
        gen_simple('paintings', 'Живопись', 'Paintings', 'wd:Q3305213', 20, [('a', 'wdt:P170', 'label'), ('y', 'wdt:P571', 'year'), ('m', 'wdt:P195', 'label')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Автор: ', it['a'], 1), ('Создана: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Собрание: ', it['m'], 1)),
                   trig=lambda it, l: [l, 'картина ' + l])
    if want('music'):
        gen_simple('music', 'Музыкальные произведения', 'Music', 'wd:Q105543609', 30, [('a', 'wdt:P86', 'label'), ('p', 'wdt:P175', 'label'), ('y', 'wdt:P577', 'year')],
                   lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Композитор: ', it['a'], 2), lab('Исполнитель: ', it['p'], 2), ('Год: %s.' % yr(it['y'])) if yr(it['y']) else ''),
                   trig=lambda it, l: [l, 'произведение ' + l])
    if want('films'):
        gen_simple('films', 'Кино', 'Films', 'wd:Q11424', 60, [('a', 'wdt:P57', 'label'), ('y', 'wdt:P577', 'year')],
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
