#!/usr/bin/env python3
"""Consistency checker for folklore/ collections (run: python3 folklore/tools/check.py).

Checks, per collection directory folklore/<c>/:
  * every group file tales_*.json has a matching tales_*.md with the same records in the
    same order (numbered "## N. title" sections containing "### title_en", the RU and EN
    summaries and every source URL);
  * required RU/EN fields are non-empty and every record has at least one http(s) source;
  * the combined <c>.json holds exactly the union of the group files;
  * group and total counts in <c>/index.md and folklore/README.md match the JSON;
  * optional 'rights' notes are mirrored in Markdown and the combined file;
  * duplicate titles (RU or EN) and duplicate RU summaries inside a collection.
Exit status 1 if any ERROR is found; WARN lines are reported but do not fail.
"""
import glob, json, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQ = ['people', 'type', 'sources', 'title', 'summary', 'moral', 'title_en', 'summary_en', 'moral_en']
errors, warns = [], []
def err(m): errors.append(m)
def warn(m): warns.append(m)
def norm(s): return re.sub(r'\s+', ' ', s).strip()
def key(r): return json.dumps({k: r.get(k) for k in REQ + ['rights']}, ensure_ascii=False, sort_keys=True)

def check_md(jpath, recs):
    mpath = jpath[:-5] + '.md'
    if not os.path.exists(mpath):
        return err(f'{mpath}: missing Markdown file')
    secs = re.split(r'(?m)^(?=## \d+\. )', open(mpath, encoding='utf-8').read())[1:]
    if len(secs) != len(recs):
        err(f'{mpath}: {len(secs)} sections vs {len(recs)} JSON records')
    for i, (s, r) in enumerate(zip(secs, recs), 1):
        m = re.match(r'## (\d+)\. (.*)', s)
        where = f'{os.path.relpath(mpath, ROOT)} #{i}'
        if int(m.group(1)) != i: err(f'{where}: numbered {m.group(1)}')
        if norm(m.group(2)) != norm(r['title']): err(f'{where}: title "{m.group(2)}" != JSON "{r["title"]}"')
        ns = norm(s)
        if f'### {norm(r["title_en"])}' not in ns: err(f'{where}: EN heading missing')
        for f in ('summary', 'summary_en', 'moral', 'moral_en'):
            if norm(r[f]) not in ns: err(f'{where}: {f} differs from JSON')
        if r.get('rights') and norm(r['rights']) not in ns: err(f'{where}: rights note missing in Markdown')
        for u in r['sources']:
            if u not in s: err(f'{where}: source {u} missing in Markdown')

def readme_counts():
    p = os.path.join(ROOT, 'README.md'); out = {}
    for line in open(p, encoding='utf-8'):
        m = re.match(r'\|\s*\[.*\]\((\w+)/index\.md\)\s*\|\s*([\d\s ]+)\|', line)
        if m: out[m.group(1)] = int(re.sub(r'\D', '', m.group(2)))
        m = re.match(r'\|\s*\*\*Всего.*\|\s*\*\*([\d\s ]+)\*\*', line)
        if m: out['_total'] = int(re.sub(r'\D', '', m.group(1)))
    return out

total = 0; per = {}
for cdir in sorted(d for d in glob.glob(os.path.join(ROOT, '*')) if os.path.isdir(d) and os.path.exists(os.path.join(d, 'index.md'))):
    c = os.path.basename(cdir); union = []; gcount = {}
    for jp in sorted(glob.glob(os.path.join(cdir, 'tales_*.json'))):
        recs = json.load(open(jp, encoding='utf-8')); gcount[os.path.basename(jp)[:-5]] = len(recs)
        for i, r in enumerate(recs, 1):
            for f in REQ:
                if not r.get(f): err(f'{c}/{os.path.basename(jp)} #{i}: empty field {f}')
            if not any(str(u).startswith(('http://', 'https://')) for u in r.get('sources', [])):
                err(f'{c}/{os.path.basename(jp)} #{i}: no http(s) source')
        check_md(jp, recs); union += recs
    cp = os.path.join(cdir, c + '.json')
    if os.path.exists(cp):
        comb = json.load(open(cp, encoding='utf-8'))
        if Counter(map(key, comb)) != Counter(map(key, union)):
            a, b = Counter(map(key, comb)), Counter(map(key, union))
            err(f'{c}/{c}.json: combined differs from groups ({sum((a-b).values())} extra, {sum((b-a).values())} missing)')
    else: err(f'{c}: combined {c}.json missing')
    idx = open(os.path.join(cdir, 'index.md'), encoding='utf-8').read()
    for g, n in gcount.items():
        m = re.search(rf'\]\({g}\.md\)(?: — |: )(\d+)', idx)
        if not m: err(f'{c}/index.md: no count for {g}')
        elif int(m.group(1)) != n: err(f'{c}/index.md: {g} says {m.group(1)}, JSON has {n}')
    m = re.search(r'(?:Итого|Всего) / Total:\s*(\d+)', idx)
    if not m or int(m.group(1)) != len(union): err(f'{c}/index.md: total {m and m.group(1)} != {len(union)}')
    for f in ('title', 'title_en', 'summary'):
        for v, k in Counter(norm(r[f]).lower() for r in union).items():
            if k > 1: (err if f == 'summary' else warn)(f'{c}: duplicate {f} x{k}: {v[:80]}')
    per[c] = len(union); total += len(union)

rc = readme_counts()
for c, n in per.items():
    if rc.get(c) != n: err(f'README.md: {c} count {rc.get(c)} != {n}')
if rc.get('_total') != total: err(f'README.md: total {rc.get("_total")} != {total}')
for w in warns: print('WARN ', w)
for e in errors: print('ERROR', e)
print(f'records: {total} ' + ' '.join(f'{c}={n}' for c, n in per.items()) + f' | errors: {len(errors)} warnings: {len(warns)}')
sys.exit(1 if errors else 0)
