#!/usr/bin/env python3
"""EN pass for generated KB sections (Wikidata, CC0). Run AFTER gen_kb.py / gen_more.py:
   python3 kb/gen/gen_en.py [domain ...]
For every RU-only line of kb/src/w_<domain>.txt the Wikidata item is re-identified strictly: an item whose
Russian label equals the answer head AND whose Russian description occurs verbatim in the RU answer (exactly one
such item, otherwise the line is left RU-only). The EN answer is built only from that item's English label and
description plus the same kind of facts the RU answer carries (English labels / years / codes from Wikidata);
a fact is added only when its value is unambiguous and every value has an English label. RU text is untouched.
English labels are NOT added as triggers here (EN_TRIGGERS): ~30k extra triggers would push the search shards over the
700 KB gzip budget. The KB search still finds entries by their RU triggers; the EN answer is shown in EN mode.
"""
import os, re, sys, glob, hashlib
from wd import sparql
from gen_kb import SRC, clean

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zа-я0-9+#²³ ]+', ' ', s.lower().replace('ё', 'е'))).strip()

I = lambda p, n, pe: ('item', p, n, pe)
Y = lambda p, pe: ('year', p, 1, pe)
V = lambda p, pe: ('str', p, 1, pe)
PERSON = [Y('P569', None), Y('P570', None), I('P27', 2, 'Citizenship')]
FACTS = {
    'people': PERSON, 'writers': PERSON, 'composers': PERSON, 'painters': PERSON, 'philosophers': PERSON,
    'scientists': PERSON, 'athletes': PERSON, 'nobel': PERSON,
    'countries': [I('P36', 1, 'Capital'), I('P30', 2, 'Continent'), I('P37', 3, 'Official language'), I('P38', 2, 'Currency')],
    'cities': [I('P17', 1, 'Country')], 'rivers': [I('P17', 4, 'Countries'), I('P403', 1, 'Mouth')],
    'mountains': [I('P17', 3, 'Country')], 'lakes': [I('P17', 4, 'Country')], 'islands': [I('P17', 2, 'Country')],
    'species': [V('P225', 'Scientific name'), I('P171', 1, 'Parent taxon')],
    'books': [I('P50', 2, 'Author'), Y('P577', 'Published')], 'paintings': [I('P170', 1, 'Artist'), Y('P571', 'Created'), I('P195', 1, 'Collection')],
    'music': [I('P86', 2, 'Composer'), I('P175', 2, 'Performer'), Y('P577', 'Year')], 'films': [I('P57', 2, 'Director'), Y('P577', 'Released')],
    'events': [I('P361', 1, 'Part of')], 'wars': [Y('P580', 'Began'), Y('P582', 'Ended')], 'dishes': [I('P495', 2, 'Origin')],
    'proglang': [Y('P571', 'Appeared'), I('P287', 3, 'Designed by')], 'elements': [V('P246', 'Symbol'), V('P1086', 'Atomic number')],
    'space': [I('P397', 1, 'Orbits'), I('P59', 1, 'Constellation')], 'missions': [Y('P619', 'Launched'), I('P137', 2, 'Operator')],
    'minerals': [V('P274', 'Formula')], 'dinosaurs': [V('P225', 'Scientific name')],
    'companies': [Y('P571', 'Founded'), I('P112', 3, 'Founders'), I('P17', 1, 'Country')],
    'landmarks': [I('P131', 1, 'Location'), I('P17', 1, 'Country')], 'museums': [I('P131', 1, 'Location'), I('P17', 1, 'Country')],
    'universities': [Y('P571', 'Founded'), I('P131', 1, 'Location'), I('P17', 1, 'Country')],
    'deserts': [I('P17', 3, 'Country')], 'games': [Y('P577', 'Released'), I('P178', 2, 'Developer')], 'stage': [I('P86', 2, 'Composer')],
    'airports': [V('P238', 'IATA code'), I('P931', 2, 'Serves'), I('P17', 1, 'Country')], 'sports': [I('P131', 1, 'City')],
}
EN_TRIGGERS = False
SKIP = {'compounds', 'particles', 'mathematics', 'drugs', 'biomolecules', 'formats', 'states', 'battles'}   # already RU||EN (gen_more rich)

def head(ru):
    h = ru.split(' — ', 1)[0].strip()
    h = re.sub(r'\s*\([^)]*\)\s*$', '', h).strip().strip('«»')
    return h

def H(q): return hashlib.sha1(q.encode()).hexdigest()[:12]
def lit(s): return '"%s"@ru' % s.replace('\\', '\\\\').replace('"', '\\"')

def identify(heads):
    """{head: [(qid, ru_desc, en_label, en_desc)]}"""
    out = {}
    hs = sorted(set(heads))
    for k in range(0, len(hs), 250):
        b = hs[k:k + 250]
        vals = ' '.join(lit(h) for h in b)
        q = ('SELECT ?l ?x ?dr ?le ?de WHERE { VALUES ?l { %s } ?x rdfs:label ?l . ?x schema:description ?dr FILTER(LANG(?dr)="ru") '
             'OPTIONAL { ?x rdfs:label ?le FILTER(LANG(?le)="en") } OPTIONAL { ?x schema:description ?de FILTER(LANG(?de)="en") } }') % vals
        for r in sparql(q, 'id_' + H(q)):
            out.setdefault(r['l'], []).append((r['x'].rsplit('/', 1)[1], clean(r['dr']), clean(r.get('le', '')), clean(r.get('de', ''))))
    return out

def facts(qids, spec):
    F = {}
    qs = sorted(set(qids))
    for k in range(0, len(qs), 300):
        vals = ' '.join('wd:' + q for q in qs[k:k + 300])
        for kind, prop, n, pe in spec:
            if kind == 'item':
                q = 'SELECT ?x ?v ?ve WHERE { VALUES ?x { %s } ?x wdt:%s ?v . OPTIONAL { ?v rdfs:label ?ve FILTER(LANG(?ve)="en") } }' % (vals, prop)
            elif kind == 'year':
                q = 'SELECT ?x ?v WHERE { VALUES ?x { %s } ?x wdt:%s ?t . BIND(YEAR(?t) AS ?v) }' % (vals, prop)
            else:
                q = 'SELECT ?x ?v WHERE { VALUES ?x { %s } ?x wdt:%s ?v . }' % (vals, prop)
            for r in sparql(q, 'fe_%s_%s' % (prop, H(q))):
                x = r['x'].rsplit('/', 1)[1]; d = F.setdefault(x, {}).setdefault(prop, {})
                if 'v' not in r: continue
                key = r['v']
                d[key] = clean(r.get('ve', '')) if kind == 'item' else clean(r['v'])
    return F

def yfmt(v):
    y = int(float(v)); return ('%d BC' % (-y + 1)) if y <= 0 else str(y)

def en_answer(dom, it, F, ru):
    le, de = it[2], it[3]
    if not le or not de or re.search(r'wikimedia|disambiguation', de, re.I): return ''
    f = F.get(it[0], {})
    spec = FACTS.get(dom, [])
    life = ''
    if spec is PERSON:
        m = re.match(r'^[^—]*\((?:род\. )?(\d{4})(?:–(\d{4}))?\) —', ru)   # same years the RU answer shows
        if m:
            b, e = f.get('P569', {}), f.get('P570', {})
            if len(b) == 1 and yfmt(list(b.values())[0]) == m.group(1) and (not m.group(2) or (len(e) == 1 and yfmt(list(e.values())[0]) == m.group(2))):
                life = ' (%s–%s)' % (m.group(1), m.group(2)) if m.group(2) else ' (born %s)' % m.group(1)
    out = '%s%s — %s.' % (le[:1].upper() + le[1:], life, de.rstrip('.'))
    for kind, prop, n, pe in spec:
        if not pe: continue
        vs = f.get(prop, {})
        if not vs or len(vs) > n: continue
        if kind == 'item':
            if not all(vs.values()) or any(re.match(r'^Q\d+$', v) for v in vs.values()): continue
            txt = ', '.join(sorted(vs.values()))
        elif kind == 'year':
            if len(set(vs.values())) != 1: continue
            txt = yfmt(list(vs.values())[0])
        else:
            if len(vs) != 1: continue
            txt = list(vs.values())[0]
        x = '%s: %s.' % (pe, txt)
        if len(out) + 1 + len(x) <= 600: out += ' ' + x
    return out if len(out) <= 600 else ''

def all_triggers(skip_file):
    S = set()
    for fn in glob.glob(os.path.join(SRC, '*.txt')):
        if fn == skip_file: continue
        for line in open(fn, encoding='utf-8'):
            if '||' in line and not line.startswith('#'):
                for t in line.split('||')[0].split(';'): S.add(norm(t))
    return S

def run(dom):
    fn = os.path.join(SRC, 'w_%s.txt' % dom)
    lines = open(fn, encoding='utf-8').read().splitlines()
    hdr, body = lines[:2], lines[2:]
    rows = [l.split(' || ') for l in body]
    todo = [i for i, r in enumerate(rows) if len(r) == 2]
    heads = {}
    for i in todo:
        h = head(rows[i][1])
        heads[i] = [h] + ([h[:1].lower() + h[1:]] if h[:1].isupper() else [])
    ids = identify([h for v in heads.values() for h in v])
    pick = {}
    for i in todo:
        c = {x[0]: x for h in heads[i] for x in ids.get(h, []) if x[1] and x[1].rstrip('.') in rows[i][1]}
        if len(c) == 1: pick[i] = list(c.values())[0]
    if dom == 'elements':   # RU answer has no description; identify by the atomic number it states instead
        cand = {i: {x[0]: x for h in heads[i] for x in ids.get(h, [])} for i in todo if i not in pick}
        AN = facts([q for c in cand.values() for q in c], [V('P1086', None)])
        for i, c in cand.items():
            m = re.search(r'атомный номер (\d+)', rows[i][1])
            ok = [x for q, x in c.items() if m and list(AN.get(q, {}).get('P1086', {}).values()) == [m.group(1)]]
            if len(ok) == 1: pick[i] = ok[0]
    F = facts([x[0] for x in pick.values()], FACTS.get(dom, []))
    other = all_triggers(fn)
    used = set(norm(t) for r in rows for t in r[0].split(';'))
    n_en = 0
    for i, it in pick.items():
        en = en_answer(dom, it, F, rows[i][1])
        if len(en) < 10: continue
        n_en += 1
        rows[i].append(en)
        le = it[2]; k = norm(le)
        if EN_TRIGGERS and le and re.search(r'[A-Za-z]', le) and len(le) <= 60 and k and k not in other and k not in used and not re.search(r'[;|]', le):
            rows[i][0] += '; ' + le; used.add(k)
    with open(fn, 'w', encoding='utf-8') as f:
        f.write('\n'.join(hdr) + '\n' + '\n'.join(' || '.join(r) for r in rows) + '\n')
    tot = len(rows); have = sum(len(r) > 2 for r in rows)
    print('%-13s %5d lines, +%d EN, EN coverage %d/%d (%.0f%%)' % (dom, tot, n_en, have, tot, 100.0 * have / max(tot, 1)), flush=True)

if __name__ == '__main__':
    doms = sys.argv[1:] or sorted(os.path.basename(f)[2:-4] for f in glob.glob(os.path.join(SRC, 'w_*.txt')))
    for d in doms:
        if d in SKIP: continue
        try: run(d)
        except SystemExit as e: print('FAILED', d, e, flush=True)
