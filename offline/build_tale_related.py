#!/usr/bin/env python3
"""«Похожие / Related / Ähnliche» for offline tales: precomputes `rel` in offline/packs/tales_*.json.

A tale's features (all taken from the record itself — nothing is invented):
  * shared characters — `who` keys and proper names from the RU text (weight 3 / 2 × idf);
  * culture `cu` (2), source/collection `src` (2), type `ty` (0.5);
  * tags `tg` (1.5 × idf) and motif words from the moral `m` and title `t` (1 × idf).
rel = up to K entries "<group>:<id>" with score ≥ MIN_SCORE, deterministic (ties by id).
Usage: python3 offline/build_tale_related.py [--check]   (--check exits 1 if the packs are stale)
"""
import glob, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
K, MIN_SCORE = 5, 3.0
STOP = set('этот было была были когда потом тогда только через после перед своей своего свою себя чтобы '
           'который которая которые очень всех всего всегда ничего никто такой такая также'.split())
NAME = re.compile(r'(?<![.!?«]\s)(?<=\s)([А-ЯЁ][а-яё]{3,})')

def _stems(text):
    return {w[:6] for w in re.findall(r'[а-яё]{4,}', (text or '').lower().replace('ё', 'е')) if w not in STOP}

def features(x):
    f = {}
    for w in x.get('who') or []: f['who:' + w.lower()] = 3.0
    body = ' '.join([x.get('s', '')] + list(x.get('p') or []))
    for n in set(NAME.findall(body)): f.setdefault('name:' + n.lower().replace('ё', 'е')[:7], 2.0)
    if x.get('cu'): f['cu:' + x['cu']] = 2.0
    if x.get('src'): f['src:' + x['src']] = 2.0
    if x.get('ty'): f['ty:' + x['ty']] = 0.5
    for t in x.get('tg') or []: f['tg:' + t] = 1.5
    for s in _stems(x.get('m')) | _stems(x.get('t')): f.setdefault('w:' + s, 1.0)
    return f

def related(tales):
    """tales: list of records (with g, id) → {id: ["g:id", ...]}"""
    n = len(tales)
    F = [features(x) for x in tales]
    post = {}
    for i, f in enumerate(F):
        for k in f: post.setdefault(k, []).append(i)
    out = {}
    for i, f in enumerate(F):
        acc = {}
        for k, w in f.items():
            p = post[k]
            if len(p) < 2 or len(p) > n // 3: continue
            s = w * math.log(1.0 + n / len(p))
            for j in p:
                if j != i: acc[j] = acc.get(j, 0.0) + s
        best = sorted((j for j, s in acc.items() if s >= MIN_SCORE), key=lambda j: (-round(acc[j], 6), tales[j]['id']))[:K]
        out[tales[i]['id']] = ['%s:%s' % (tales[j]['g'], tales[j]['id']) for j in best]
    return out

def files():
    return sorted(glob.glob(os.path.join(HERE, 'packs', 'tales_*.json')))

def build(write=True):
    packs = [(f, json.load(open(f, encoding='utf-8'))) for f in files()]
    allt = [x for _, d in packs for x in d['tales']]
    rel = related(allt)
    stale = []
    for f, d in packs:
        for x in d['tales']:
            r = rel.get(x['id']) or []
            if r: x['rel'] = r
            else: x.pop('rel', None)
        txt = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        if open(f, encoding='utf-8').read() != txt:
            stale.append(os.path.basename(f))
            if write: open(f, 'w', encoding='utf-8').write(txt)
    return stale, rel

if __name__ == '__main__':
    check = '--check' in sys.argv
    stale, rel = build(write=not check)
    print('tales %d, with rel %d, %s %s' % (len(rel), sum(1 for v in rel.values() if v), 'stale' if check else 'written', stale))
    sys.exit(1 if check and stale else 0)
