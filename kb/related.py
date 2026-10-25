"""Related entries for the KB library (precomputed at build time, stored in packs as "r").

Same-section only. An entry's features are
  * facts  — «Метка: значение.» segments of the RU answer (Wikidata facts such as country, author, war, class),
             one feature per value (weight 3 × idf);
  * words  — content-word stems of the triggers and of the first sentence of the RU answer (weight idf).
Score(a, b) = Σ weights of shared features; features shared by too many entries (df > DF_MAX) are ignored.
Top-K entries with score ≥ MIN_SCORE, ties broken by id — fully deterministic. Nothing is invented: a related
link only says «these two entries share these facts / words».
"""
import math, re

K, MIN_SCORE, DF_MAX = 5, 2.5, 250
STOP = set('это быть который также один одна одно свой своя такой этот этого этой между более после около через '
           'является являлась являлся годы года году город река гора остров страна часть входит является кто такой что '
           'такое where what with from that this which also into than were have been their them'.split())
FACT = re.compile(r'(?:^|(?<=[.!?] ))([A-ZА-ЯЁ][^.:!?]{1,40}): ([^.!?]{1,120})(?=\.(?:\s|$))')

def _stem(w):
    return w[:6]

def features(rec):
    a = rec['a']
    f = {}
    for lab, val in FACT.findall(a):
        for v in val.split(', '):
            v = v.strip().lower()
            if v: f['f:%s=%s' % (lab.lower(), v)] = 3.0
    first = a.split('. ', 1)[0]
    text = ' '.join(rec['q']) + ' ' + first
    for w in re.findall(r'[a-zа-яё]{4,}', text.lower().replace('ё', 'е')):
        if w in STOP: continue
        f.setdefault('w:' + _stem(w), 1.0)
    return f

def related(recs):
    """recs: [(eid, short_hash, rec)] of one section → {short_hash: [short_hash, ...]}"""
    n = len(recs)
    if n < 2: return {}
    F = [features(r) for _, _, r in recs]
    post = {}
    for i, f in enumerate(F):
        for k in f: post.setdefault(k, []).append(i)
    idf = {k: math.log(1.0 + n / len(v)) for k, v in post.items()}
    out = {}
    for i, f in enumerate(F):
        acc = {}
        for k, w in f.items():
            p = post[k]
            if len(p) < 2 or len(p) > DF_MAX: continue
            s = w * idf[k]
            for j in p:
                if j != i: acc[j] = acc.get(j, 0.0) + s
        best = sorted((j for j, s in acc.items() if s >= MIN_SCORE), key=lambda j: (-round(acc[j], 6), recs[j][1]))[:K]
        if best: out[recs[i][1]] = [recs[j][1] for j in best]
    return out
