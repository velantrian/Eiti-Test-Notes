#!/usr/bin/env python3
"""v14.3.0: new Wikidata (CC0) sections for the KB library. Run AFTER gen_kb.py:
   python3 kb/gen/gen_more.py [section ...]
Every item whose label is already a trigger anywhere in kb/src (hand-written or generated, incl. earlier
sections of this script) is skipped, so new sections add only new entities. Stable facts only:
no events/missions after 2019, diseases are reference-only (description + «справочно»).
"""
import os, re, sys, glob
from gen_kb import q_items, WORKS, plain_title, ok_label, desc, sent, cap, lab, yr, one, few, clean, SRC

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zа-я0-9+#²³ ]+', ' ', s.lower().replace('ё', 'е'))).strip()

SEEN = set()
HAND = []
PREF = re.compile(r'^(?:город|река|гора|остров|озеро|фильм|элемент|страна|столица|кто такой|кто такая|кто написал|блюдо|язык программирования|язык|что такое|планета|созвездие|звезда|спутник) ')
def known(n):
    if n in SEEN or PREF.sub('', n) in SEEN: return True
    if len(n) >= 4 and ' ' in n:   # многословное название внутри ручного триггера; одно слово («марс») — нет
        k = ' ' + n + ' '
        return any(k in h for h in HAND)
    return False
def load_seen(skip=()):
    SEEN.clear(); HAND.clear()
    for f in glob.glob(os.path.join(SRC, '*.txt')):
        if os.path.basename(f) in skip: continue
        for line in open(f, encoding='utf-8'):
            if line.startswith('#') or '||' not in line: continue
            for t in line.split('||')[0].split(';'):
                n = norm(t)
                if not n: continue
                SEEN.add(n); SEEN.add(PREF.sub('', n))
                if not os.path.basename(f).startswith('w_'): HAND.append(' ' + n + ' ')

BADL = re.compile(r'^\(|^S/|\d{3,}|:|^\d')
GENERIC = re.compile(r'^(Городской|Национальный|Исторический|Художественный|Государственный|Центральный|Краеведческий|Археологический|Морской) музей$|^Музей (современного искусства|изобразительных искусств|естественной истории|истории|искусств)$')
NOISE = re.compile(r'страница значений|Викимедиа|wikimedia|список |категория|шаблон|сезон|выпуск|эпизод|турнир 20|чемпионат 20|около \d{5} м', re.I)

class Sec:
    def __init__(self, dom, title, title_en):
        self.dom, self.title, self.title_en, self.lines, self.own = dom, title, title_en, [], set()
    def add(self, triggers, answer):
        main = norm(triggers[0])
        if main and known(main) and len(triggers) > 1:
            # омоним уже занятого названия (опера «Кармен», клуб «Барселона») — только с уточняющим префиксом
            triggers = triggers[1:]; main = norm(triggers[0])
        if not main or known(main) or main in self.own or len(answer) < 25 or NOISE.search(answer): return
        tt, ks = [], set()
        for t in triggers:
            t = clean(t).strip(' ,.'); k = norm(t)
            w = k.split()
            if len(w) > 1 and w[0] == w[1]: continue
            if t and k and not known(k) and k not in self.own and k not in ks and len(t) <= 80: ks.add(k); tt.append(t)
        if not tt: return
        self.own |= ks
        self.lines.append('%s || %s' % ('; '.join(tt), answer[:600]))
    def write(self):
        p = os.path.join(SRC, 'w_%s.txt' % self.dom)
        with open(p, 'w', encoding='utf-8') as f:
            f.write('# %s | %s\n# @generated from Wikidata (CC0) by kb/gen/gen_more.py — do not edit by hand\n' % (self.title, self.title_en))
            f.write('\n'.join(self.lines) + '\n')
        SEEN.update(self.own)
        print(self.dom, len(self.lines))

def run(dom, title, title_en, specs):
    """specs: list of (cls, minsl, props, fmt, trig, opts)."""
    # только ручные, разделы gen_kb.py и более ранние разделы этого скрипта — порядок ORDER детерминирован
    later = ORDER[ORDER.index(dom):] if dom in ORDER else [dom]
    load_seen(skip={'w_%s.txt' % k for k in later})
    o = Sec(dom, title, title_en)
    for cls, minsl, props, fmt, trig, opts in specs:
        its = q_items(cls, minsl, props, limit=opts.get('limit', 3000), extra=opts.get('extra', ''), cls_path=opts.get('path', 'wdt:P31'))
        cnt = {}
        for it in its: cnt[norm(it['l'])] = cnt.get(norm(it['l']), 0) + 1
        for it in its:
            if cnt[norm(it['l'])] > 1: continue   # неоднозначное название — пропускаем
            if GENERIC.search(it['l']) or re.search(r'МКС-(6[2-9]|[7-9]\d)', it['l']): continue
            if it['d'].lower().startswith(it['l'].lower()): it['d'] = re.sub(r'^[\s\-—–]*(это\s+)?', '', it['d'][len(it['l']):])
            l, d = it['l'], desc(it)
            if not ok_label(l) or not d: continue
            if BADL.search(l): continue
            if opts.get('dre') and not re.search(opts['dre'], d, re.I): continue
            if opts.get('dno') and re.search(opts['dno'], d, re.I): continue
            if opts.get('maxyear') and any(x.lstrip('-').isdigit() and int(x) > opts['maxyear'] for k in ('y', 's') for x in it.get(k, [])): continue
            if opts.get('maxyear') and re.search(r'20[2-9]\d', l + ' ' + d): continue
            a = fmt(it, l, d)
            if not a: continue
            tt = trig(it, l)
            if dom in WORKS and plain_title(l) and len(tt) > 1: tt = tt[1:]
            o.add(tt, a)
    o.write()

def S(cls, minsl, props, fmt, trig, **opts): return (cls, minsl, props, fmt, trig, opts)
def basic(prefix=None, extra_lab=None):
    def f(it, l, d): return sent('%s — %s.' % (cap(l), d), *(lab(p, it[k], n) for k, p, n in (extra_lab or [])))
    def t(it, l): return [l] + ([prefix % l] if prefix else [])
    return f, t
P = 'wdt:P31/wdt:P279*'
PS = '(wdt:P31|wdt:P279)/wdt:P279*'   # и экземпляры, и подклассы (болезни и органы в Wikidata часто подклассы)

def person_fmt(it, l, d):
    b, e = yr(it['b']), yr(it['e'])
    if b.isdigit() and int(b) >= 2005: return ''   # дети/подростки — не публикуем
    if not b or not b.isdigit() or int(b) < 1500: b = e = ''
    life = ('(%s–%s)' % (b, e) if e else '(род. %s)' % b) if b else ''
    return sent('%s — %s.' % (sent(l, life), d), ('Гражданство: %s.' % few(it['c'], 2)) if b and few(it['c'], 2) else '')
PP = [('b', 'wdt:P569', 'year'), ('e', 'wdt:P570', 'year'), ('c', 'wdt:P27', 'label')]
def occ(q): return '?x wdt:P106 ?oc . ?oc wdt:P279* %s .' % q
def ptrig(it, l): return [l, 'кто такой ' + l] if ' ' in l else [l]

SECTIONS = {}
def sec(name):
    def deco(fn): SECTIONS[name] = fn; return fn
    return deco

@sec('space')
def _():
    f, _ = basic()
    run('space', 'Космос: планеты, спутники, звёзды, созвездия', 'Space objects', [
        S('wd:Q634 wd:Q3504248 wd:Q2537 wd:Q1022867 wd:Q121750 wd:Q3504248', 8, [('p', 'wdt:P397', 'label')], lambda it, l, d: sent('%s — %s.' % (cap(l), d), lab('Обращается вокруг: ', it['p'], 1)), lambda it, l: [l, 'планета ' + l if 'планет' in it['d'] else 'спутник ' + l], dre=r'планет|спутник', dno=r'астероид|^объект|экзопланет', path=P),
        S('wd:Q8928', 1, [], f, lambda it, l: [l, 'созвездие ' + l], dre='созвезди'),
        S('wd:Q523', 25, [('cn', 'wdt:P59', 'label')], lambda it, l, d: sent('%s — %s.' % (cap(l), d), lab('Созвездие: ', it['cn'], 1)), lambda it, l: [l, 'звезда ' + l], path=P, dre=r'звезд', dno=r'астероид|галактик'),
        S('wd:Q318 wd:Q3863 wd:Q1931185 wd:Q204107', 25, [], f, lambda it, l: [l], path=P, dre=r'галактик|туманност|скоплени|комет'),
    ])

@sec('missions')
def _():
    run('missions', 'Космические миссии', 'Space missions', [
        S('wd:Q2133344 wd:Q40218 wd:Q5916 wd:Q752783', 20, [('y', 'wdt:P619', 'year'), ('op', 'wdt:P137', 'label')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Запуск: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Оператор: ', it['op'], 2)),
          lambda it, l: [l, 'миссия ' + l], path=P, maxyear=2019, dre=r'косми|спутник|станци|зонд|корабл|аппарат|миссия|ракет|телескоп|программ|полёт|ровер|луноход|марсоход'),
    ])

@sec('minerals')
def _():
    run('minerals', 'Минералы и горные породы', 'Minerals and rocks', [
        S('wd:Q12089225 wd:Q7946', 15, [('f', 'wdt:P274', 'v')], lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Формула: %s.' % one(it['f'])) if one(it['f']) else ''), lambda it, l: [l, 'минерал ' + l], dre=r'минерал|камень|самоцвет'),
        S('wd:Q8063', 20, [], basic()[0], lambda it, l: [l, 'горная порода ' + l], path=P, dre=r'пород|камень|минерал'),
    ])

DINO = r'^(род|вид|семейство|клада|отряд|подотряд|инфраотряд|надсемейство|группа|класс|триба)\b|динозавр|ящер|вымерш'
@sec('dinosaurs')
def _():
    run('dinosaurs', 'Динозавры и древние животные', 'Dinosaurs and prehistoric animals', [
        S('wd:Q16521 wd:Q23038290', 7, [('lat', 'wdt:P225', 'v')], lambda it, l, d: sent('%s%s — %s.' % (cap(l), (' (лат. %s)' % one(it['lat'])) if one(it['lat']) and one(it['lat']).lower() != l.lower() else '', d)),
          lambda it, l: [l] + ([one(it['lat'])] if one(it['lat']) else []), extra='?x wdt:P171+ wd:Q430 . FILTER NOT EXISTS { ?x wdt:P171+ wd:Q5113 }', dre=DINO),
        S('wd:Q16521 wd:Q23038290', 12, [('lat', 'wdt:P225', 'v')], lambda it, l, d: sent('%s — %s.' % (cap(l), d)), lambda it, l: [l] + ([one(it['lat'])] if one(it['lat']) else []),
          extra='{ ?x wdt:P171+ wd:Q3238275 } UNION { ?x wdt:P171+ wd:Q216590 } UNION { ?x wdt:P171+ wd:Q19362 }', dre=DINO),
    ])

@sec('diseases')
def _():
    def f(it, l, d): return sent('%s — %s.' % (cap(l), d), 'Справочная информация, не заменяет консультацию врача.')
    run('diseases', 'Болезни (справочно)', 'Diseases (reference only)', [
        S('wd:Q12136 wd:Q18123741 wd:Q929833', 35, [], f, lambda it, l: [l, 'болезнь ' + l, 'что такое ' + l], path=PS, limit=2500, dre=r'болезн|заболеван|инфекц|синдром|расстройств|воспален|опухол|рак|недостаточност|патолог|диабет|грипп', dno=r'фильм|песн|альбом|групп'),
    ])

@sec('anatomy')
def _():
    f, _ = basic()
    run('anatomy', 'Анатомия человека', 'Human anatomy', [
        S('wd:Q712378 wd:Q265868 wd:Q4936952 wd:Q7884789 wd:Q103637', 30, [], f, lambda it, l: [l, 'орган ' + l, 'что такое ' + l], path=PS,
          extra='FILTER NOT EXISTS { ?x wdt:P31 wd:Q16521 }', limit=1500, dre=r'орган|кост|мышц|желез|часть|отдел|ткан|сосуд|артери|вен[аы]|нерв|систем|полост|сустав|клетк|мозг', dno=r'фильм|песн|альбом|групп|птиц|животн|насеком|растени|рыб|рак |опухол|болезн|заболеван|синдром|воспален'),
    ])

@sec('companies')
def _():
    run('companies', 'Компании и бренды', 'Companies and brands', [
        S('wd:Q783794 wd:Q4830453 wd:Q891723 wd:Q6881511 wd:Q167037 wd:Q270791 wd:Q46970 wd:Q22687 wd:Q210167', 35, [('y', 'wdt:P571', 'year'), ('c', 'wdt:P17', 'label'), ('fo', 'wdt:P112', 'label')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Основана: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Основатели: ', it['fo'], 3), lab('Страна: ', it['c'], 1)),
          lambda it, l: [l, 'компания ' + l], limit=2500, extra='FILTER NOT EXISTS { ?x wdt:P576 ?end }', dre=r'компани|корпораци|производител|концерн|предприяти|бренд|банк|авиакомпани|ритейл|разработчик|холдинг|автопроизводител|издател|торгов|сеть', dno=r'город|коммун|департамент|штат|организаци объединённых|деревн'),
    ])

@sec('science')
def _():
    f, _ = basic()
    run('science', 'Научные законы, теории и изобретения', 'Scientific laws, theories, inventions', [
        S('wd:Q408891 wd:Q7949 wd:Q17737 wd:Q65943 wd:Q1503859', 18, [], f, lambda it, l: [l, 'что такое ' + l], path=P, limit=1500, dre=r'закон|теори|принцип|уравнени|эффект|постулат|правил|гипотез|теорем|парадокс|модель', dno=r'идеолог|политич|орден|фильм|альбом|песн|заговор|конспиролог|антисемит|международных отношений|пропаганд'),
        S('wd:Q15401930 wd:Q39546 wd:Q11019', 45, [('inv', 'wdt:P61', 'label')], lambda it, l, d: sent('%s — %s.' % (cap(l), d), lab('Изобретатель: ', it['inv'], 2)),
          lambda it, l: [l, 'кто изобрел ' + l] if it['inv'] else [l], path=P, limit=1500, dre=r'изобрет|устройств|прибор|механизм|машин|двигател|аппарат|инструмент|оборудован|техник', dno=r'фильм|альбом|песн|древнее'),
    ])

@sec('holidays')
def _():
    f, _ = basic()
    run('holidays', 'Праздники и фестивали', 'Holidays and festivals', [
        S('wd:Q1445650 wd:Q132241 wd:Q2633344 wd:Q15275719', 25, [], f, lambda it, l: [l, 'праздник ' + l], path=P, maxyear=2019, limit=1500,
          extra='FILTER NOT EXISTS { ?x wdt:P585 ?pt }', dre=r'праздник|фестивал|торжеств|карнавал|памятн(ый|ая) дата|день |годовщин|обряд|традиц', dno=r'Олимпийск|кубок|чемпионат|регат|вики|спортивн|високосн'),
    ])

@sec('landmarks')
def _():
    run('landmarks', 'Памятники, здания и достопримечательности', 'Monuments and buildings', [
        S('wd:Q4989906 wd:Q16560 wd:Q12518 wd:Q2977 wd:Q23413 wd:Q44539 wd:Q11303 wd:Q12280 wd:Q57821 wd:Q1081138 wd:Q570116 wd:Q839954', 50,
          [('c', 'wdt:P17', 'label'), ('loc', 'wdt:P131', 'label'), ('y', 'wdt:P571', 'year')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), lab('Где: ', it['loc'], 1), lab('Страна: ', it['c'], 1)),
          lambda it, l: [l, 'где находится ' + l], path=P, limit=2500, dre=r'памятник|дворец|башн|собор|замок|храм|мечеть|мост|монумент|крепост|здани|небоскрёб|пирамид|статуя|церковь|монастыр|ворота|стадион|театр|достопримечат|сооружен|архитектур|кремль|арка'),
    ])

@sec('museums')
def _():
    run('museums', 'Музеи', 'Museums', [
        S('wd:Q33506', 30, [('loc', 'wdt:P131', 'label'), ('c', 'wdt:P17', 'label')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), lab('Где: ', it['loc'], 1), lab('Страна: ', it['c'], 1)), lambda it, l: [l, 'музей ' + l], path=P, limit=1500, dre=r'музе|галере|выставоч|собрани|коллекци'),
    ])

@sec('universities')
def _():
    run('universities', 'Университеты', 'Universities', [
        S('wd:Q3918 wd:Q875538 wd:Q38723 wd:Q902104', 28, [('loc', 'wdt:P131', 'label'), ('c', 'wdt:P17', 'label'), ('y', 'wdt:P571', 'year')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Основан: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Где: ', it['loc'], 1), lab('Страна: ', it['c'], 1)),
          lambda it, l: [l, 'университет ' + l], path=P, limit=1500, dre=r'университет|институт|колледж|академи|высш|учебн|школ'),
    ])

@sec('waters')
def _():
    f, _ = basic()
    run('waters', 'Моря, океаны, заливы и проливы', 'Seas, oceans, gulfs, straits', [
        S('wd:Q165 wd:Q9430 wd:Q1322134 wd:Q37901 wd:Q39594', 20, [], f, lambda it, l: [l], path=P, limit=1500, dre=r'мор[ея]|океан|залив|пролив|бухт|лагун'),
    ])

@sec('deserts')
def _():
    run('deserts', 'Пустыни, вулканы и природные объекты', 'Deserts, volcanoes, landforms', [
        S('wd:Q8514 wd:Q8072 wd:Q34038 wd:Q35666 wd:Q150784 wd:Q35509', 20, [('c', 'wdt:P17', 'label'), ('h', 'wdt:P2044', 'v')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Высота — около %d м.' % round(float(one(it['h'])))) if one(it['h']) and 'вулкан' in d else '', lab('Страна: ', it['c'], 3)),
          lambda it, l: [l] + (['вулкан ' + l] if 'вулкан' in it['d'] else ['пустыня ' + l] if 'пустын' in it['d'] else []), path=P, limit=1500, dre=r'пустын|вулкан|каньон|ледник|пещер|водопад|ущель|плато|кратер|гейзер|долин|равнин|нагорь'),
    ])

@sec('games')
def _():
    run('games', 'Видеоигры', 'Video games', [
        S('wd:Q7889', 35, [('y', 'wdt:P577', 'year'), ('dev', 'wdt:P178', 'label')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Год выхода: %s.' % yr(it['y'])) if yr(it['y']) else '', lab('Разработчик: ', it['dev'], 2)),
          lambda it, l: [l, 'игра ' + l], maxyear=2020, limit=1500, dre=r'игр'),
    ])

@sec('stage')
def _():
    run('stage', 'Оперы, балеты и мюзиклы', 'Operas, ballets, musicals', [
        S('wd:Q58483083 wd:Q15079786 wd:Q785522 wd:Q1344 wd:Q2743', 10, [('a', 'wdt:P86', 'label')],
          lambda it, l, d: sent('«%s» — %s.' % (l, d), lab('Композитор: ', it['a'], 2), ''),
          lambda it, l: [l, 'опера ' + l if 'опер' in it['d'].lower() else 'балет ' + l if 'балет' in it['d'].lower() else 'мюзикл ' + l, 'кто написал ' + l], limit=1500, dre=r'опер|балет|мюзикл'),
    ])

@sec('myths')
def _():
    f, _ = basic()
    run('myths', 'Мифология и легендарные персонажи', 'Mythology', [
        S('wd:Q178885 wd:Q4271324 wd:Q22989102 wd:Q15410431 wd:Q24334685', 25, [], f, lambda it, l: [l, 'кто такой ' + l], path=P, limit=2000, dre=r'миф|бог|богин|божеств|легенд|персонаж|демон|герой|титан|нимф|дух|чудовищ|существо|сказ|эпос|ангел|архангел', dno=r'поэт|писател|фильм|альбом|песн|компьютерн|комикс|игр'),
    ])

@sec('religions')
def _():
    f, _ = basic()
    run('religions', 'Религии и учения', 'Religions and belief systems', [
        S('wd:Q9174 wd:Q879146 wd:Q13414953 wd:Q12909644', 35, [], f, lambda it, l: [l, 'что такое ' + l], path=P, limit=1000, dre=r'религи|учени|вероучени|конфесси|течени|верован|культ|церк|деноминаци|ветвь'),
    ])

for key, title, title_en, q, sl, dre in (
        ('writers', 'Писатели и поэты', 'Writers and poets', 'wd:Q36180', 38, r'писател|поэт|прозаик|драматург|романист|литератор|сценарист|публицист|баснописец'),
        ('composers', 'Композиторы и музыканты', 'Composers and musicians', 'wd:Q639669', 45, r'композитор|музыкант|певе|певиц|пианист|скрипач|виолончел|гитарист|дирижёр|рэпер|исполнител|автор песен|барабанщ|вокалист|бас-гитарист|диджей'),
        ('painters', 'Художники, скульпторы и архитекторы', 'Artists and architects', 'wd:Q1028181 wd:Q1281618 wd:Q42973', 30, r'художни|живопис|скульптор|архитектор|график|иллюстратор|гравёр|акварел'),
        ('philosophers', 'Философы', 'Philosophers', 'wd:Q4964182', 30, r'философ|мыслител|богослов|теолог'),
        ('scientists', 'Учёные и изобретатели', 'Scientists and inventors', 'wd:Q901', 30, r'учён|физик|химик|математик|биолог|астроном|инженер|изобретател|географ|геолог|медик|врач|экономист|историк|лингвист|психолог|генетик|естествоиспыт|ботаник|зоолог|физиолог|археолог'),
        ('athletes', 'Спортсмены', 'Athletes', 'wd:Q2066131', 50, r'спортсмен|футболист|хоккеист|теннисист|шахматист|боксёр|баскетболист|гонщик|пловец|пловчих|лыжник|бегун|легкоатлет|гимнаст|борец|фигурист|велогонщик|волейболист|биатлонист|конькобеж|тренер|игрок|атлет|прыгун|тяжелоатлет|фехтовальщ|бейсболист|регбист|гольфист|боец|дзюдоист|каратист|альпинист|игрок в')):
    def mk(key=key, title=title, title_en=title_en, q=q, sl=sl, dre=dre):
        ex = '?x wdt:P106 ?oc . VALUES ?t { %s } ?oc wdt:P279* ?t .' % q
        run(key, title, title_en, [S('wd:Q5', sl, PP, person_fmt, ptrig, extra=ex, limit=2500, dre=dre)])
    SECTIONS[key] = mk

@sec('nobel')
def _():
    def f(it, l, d): return sent(person_fmt(it, l, d), 'Лауреат Нобелевской премии.')
    run('nobel', 'Нобелевские лауреаты', 'Nobel laureates', [
        S('wd:Q5', 20, PP, f, ptrig, extra='?x wdt:P166 ?pr . ?pr (wdt:P31|wdt:P279)* wd:Q7191 .', limit=2000),
    ])

@sec('airports')
def _():
    run('airports', 'Аэропорты', 'Airports', [
        S('wd:Q1248784 wd:Q644371', 30, [('city', 'wdt:P931', 'label'), ('iata', 'wdt:P238', 'v'), ('c', 'wdt:P17', 'label')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Код IATA: %s.' % one(it['iata'])) if one(it['iata']) else '', lab('Обслуживает: ', it['city'], 2), lab('Страна: ', it['c'], 1)),
          lambda it, l: [l, 'аэропорт ' + l] + (['аэропорт ' + one(it['iata'])] if one(it['iata']) else []), path=P, limit=1500, dre=r'аэропорт|аэродром'),
    ])

@sec('sports')
def _():
    run('sports', 'Спортивные клубы и соревнования', 'Sports clubs and competitions', [
        S('wd:Q476028 wd:Q847017 wd:Q13393265', 45, [('loc', 'wdt:P131', 'label'), ('c', 'wdt:P17', 'label'), ('y', 'wdt:P571', 'year')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), lab('Город: ', it['loc'], 1)), lambda it, l: [l, 'клуб ' + l], path=P, limit=1200, dre=r'клуб|команд'),
        S('wd:Q15991303 wd:Q500834 wd:Q1079023', 40, [], basic()[0], lambda it, l: [l], path=P, limit=600, extra='FILTER NOT EXISTS { ?x wdt:P585 ?pt } FILTER NOT EXISTS { ?x wdt:P580 ?st . FILTER(YEAR(?st) > 2019) }', dre=r'турнир|соревновани|чемпионат|кубок|лига|игры|гонк|марафон', dno=r'20[0-2]\d|19\d\d'),
    ])

ORDER = ['space', 'missions', 'minerals', 'dinosaurs', 'diseases', 'anatomy', 'companies', 'science', 'holidays', 'landmarks', 'museums',
         'universities', 'waters', 'deserts', 'games', 'stage', 'myths', 'religions', 'writers', 'composers', 'painters', 'philosophers',
         'scientists', 'nobel', 'athletes', 'sports', 'airports']

# ── content/kb-expansion: natural-science, medicine-reference, tech and history gaps ──
@sec('compounds')
def _():
    run('compounds', 'Химические вещества и соединения', 'Chemical compounds', [
        S('wd:Q11173', 30, [('f', 'wdt:P274', 'v')], lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Формула: %s.' % one(it['f'])) if one(it['f']) else ''),
          lambda it, l: [l, 'что такое ' + l] + (['формула ' + l] if one(it['f']) else []), path=PS, limit=2500, dre=r'соединени|вещество|кислот|оксид|соль|газ|спирт|углевод|кислота|амин|эфир|гидроксид|органическ|неорганическ|полимер|алкан|алкен|белок|гормон|витамин|жидкост|минерал', dno=r'фильм|альбом|песн|групп'),
    ])

@sec('particles')
def _():
    f, _ = basic()
    run('particles', 'Элементарные частицы и физические величины', 'Particles and physical quantities', [
        S('wd:Q43116 wd:Q173078', 12, [], f, lambda it, l: [l, 'что такое ' + l], path=P, limit=600, dre=r'частиц|бозон|фермион|лептон|кварк|адрон|мезон|барион|нейтрино|квазичастиц'),
        S('wd:Q107715', 20, [], f, lambda it, l: [l, 'что такое ' + l], path='(wdt:P31|wdt:P279)', limit=1000, dre=r'величин|характеристик|мера|параметр|отношени|скорост|энерги|сила|плотност|давлени|физическ'),
    ])

@sec('mathematics')
def _():
    f, _ = basic()
    run('mathematics', 'Математические понятия', 'Mathematical concepts', [
        S('wd:Q1936384 wd:Q173227', 20, [], f, lambda it, l: [l, 'что такое ' + l], path='wdt:P31', limit=1000, dre=r'математ|геометр|алгебр|функци|числ|множеств|фигур|многоугольник|многогранник|операци|матриц|уравнени|кривая|поверхност|пространств|последовательност|теори|интеграл|производн|вектор|топологи', dno=r'фильм|альбом|песн'),
    ])

@sec('drugs')
def _():
    def f(it, l, d): return sent('%s — %s.' % (cap(l), d), 'Справочная информация, не заменяет консультацию врача.')
    run('drugs', 'Лекарственные вещества (справочно)', 'Medicines (reference only)', [
        S('wd:Q12140', 40, [], f, lambda it, l: [l, 'что такое ' + l], path=PS, limit=1500, dre=r'лекарств|препарат|средств|антибиотик|анальгетик|гормон|витамин|вакцин|ингибитор|антагонист|агонист|противо|алкалоид|соединени|вещество', dno=r'фильм|альбом|песн|групп|наркотик'),
    ])

@sec('biomolecules')
def _():
    f, _ = basic()
    run('biomolecules', 'Клетки, ткани и биомолекулы', 'Cells, tissues, biomolecules', [
        S('wd:Q8054 wd:Q8047 wd:Q11364 wd:Q34956 wd:Q8066 wd:Q7187 wd:Q189094 wd:Q40397 wd:Q11367', 30, [], f, lambda it, l: [l, 'что такое ' + l], path=PS, limit=1500, dre=r'белок|фермент|гормон|витамин|аминокислот|ген\b|клетк|органелл|ткан|молекул|нуклеот|кислот|рецептор|липид|углевод', dno=r'фильм|альбом|песн|групп|болезн|синдром'),
    ])

@sec('formats')
def _():
    f, _ = basic()
    run('formats', 'Технологии, протоколы и форматы', 'Technologies, protocols, file formats', [
        S('wd:Q235557 wd:Q15836568 wd:Q1331793 wd:Q192776 wd:Q8366', 25, [], f, lambda it, l: [l, 'что такое ' + l], path=P, limit=1500, dre=r'формат|протокол|стандарт|алгоритм|технологи|интерфейс|спецификаци|кодек|сеть|шифр|кодировк', dno=r'фильм|альбом|песн|групп|компани'),
    ])

@sec('states')
def _():
    run('states', 'Исторические государства и империи', 'Historical states and empires', [
        S('wd:Q3024240 wd:Q48349 wd:Q1250464', 45, [('s', 'wdt:P571', 'year'), ('e', 'wdt:P576', 'year')],
          lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Существовало: %s–%s.' % (yr(it['s']), yr(it['e']))) if yr(it['s']) and yr(it['e']) and not re.search(r'\d', d) else ''),
          lambda it, l: [l, 'что такое ' + l], path=P, limit=1500, dre=r'государств|импери|царств|королевств|княжеств|ханств|султанат|халифат|республик|династи|держав|конфедераци|союз', dno=r'фильм|альбом|песн|групп'),
    ])

@sec('battles')
def _():
    run('battles', 'Сражения и исторические события', 'Battles', [
        S('wd:Q178561 wd:Q188055', 30, [('y', 'wdt:P585', 'year')], lambda it, l, d: sent('%s — %s.' % (cap(l), d), ('Год: %s.' % yr(it['y'])) if yr(it['y']) else ''),
          lambda it, l: [l, 'что такое ' + l], path=P, limit=1500, maxyear=2019, dre=r'сражени|битв|осад|бой|штурм|операци', dno=r'фильм|альбом|песн|игр'),
    ])

ORDER += ['compounds', 'particles', 'mathematics', 'drugs', 'biomolecules', 'formats', 'states', 'battles']

if __name__ == '__main__':
    want = sys.argv[1:] or ORDER
    for k in ORDER:
        if k in want:
            try: SECTIONS[k]()
            except SystemExit as e: print('FAILED', k, e)
