#!/usr/bin/env python3
"""Build kb/index.json + kb/packs/kb_<domain>.json from kb/src/*.txt.
Line format:  trigger1; trigger2 || RU answer [|| EN answer]
First line:   # Title RU | Title EN
"""
import hashlib, json, os, re, sys, gzip
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src'); OUT = os.path.join(HERE, 'packs')

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zа-я0-9+#²³ ]+', ' ', s.lower().replace('ё', 'е'))).strip()

def keys(ans, n=110):
    a = re.sub(r'\s+', ' ', ans)
    return a[:n].rsplit(' ', 1)[0] if len(a) > n else a

def build():
    os.makedirs(OUT, exist_ok=True)
    entries, domains, seen_t, seen_a, errors = [], {}, {}, {}, []
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith('.txt'): continue
        dom = fn[:-4]; lines = open(os.path.join(SRC, fn), encoding='utf-8').read().splitlines()
        title = lines[0].lstrip('# ').split('|'); pack = {}
        for ln, line in enumerate(lines[1:], 2):
            if not line.strip() or line.startswith('#'): continue
            parts = [p.strip() for p in line.split('||')]
            if len(parts) < 2 or not parts[1]:
                errors.append('%s:%d bad line' % (fn, ln)); continue
            trig = [t.strip() for t in parts[0].split(';') if t.strip()]
            uniq = []
            for t in trig:
                nt = norm(t)
                if nt in seen_t:
                    errors.append('%s:%d duplicate trigger %r (also %s)' % (fn, ln, t, seen_t[nt])); continue
                seen_t[nt] = '%s:%d' % (fn, ln); uniq.append(t)
            na = norm(parts[1])
            if na in seen_a:
                errors.append('%s:%d duplicate answer (also %s)' % (fn, ln, seen_a[na])); continue
            seen_a[na] = '%s:%d' % (fn, ln)
            if not uniq: continue
            eid = 'kbl_%s_%s' % (dom, hashlib.sha1(norm(uniq[0]).encode()).hexdigest()[:6])
            rec = {'q': uniq, 'a': parts[1]}
            if len(parts) > 2 and parts[2]: rec['en'] = parts[2]
            pack[eid] = rec
            entries.append({'i': eid, 'd': dom, 't': '|'.join(uniq), 'k': keys(parts[1])})
        f = 'packs/kb_%s.json' % dom
        js = json.dumps({'v': 1, 'domain': dom, 'entries': pack}, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(HERE, f), 'w', encoding='utf-8').write(js)
        domains[dom] = {'file': f, 'title': title[0].strip(), 'title_en': (title[1].strip() if len(title) > 1 else dom),
                        'count': len(pack), 'bytes': len(js.encode()), 'gz': len(gzip.compress(js.encode(), 9))}
    idx = {'v': 1, 'format': 'eiti-kb-lib', 'count': len(entries), 'domains': domains, 'entries': entries}
    open(os.path.join(HERE, 'index.json'), 'w', encoding='utf-8').write(json.dumps(idx, ensure_ascii=False, separators=(',', ':')))
    return idx, errors

if __name__ == '__main__':
    idx, errors = build()
    for e in errors: print('WARN', e)
    raw = open(os.path.join(HERE, 'index.json'), 'rb').read()
    print('entries', idx['count'], 'index', len(raw), 'gz', len(gzip.compress(raw, 9)))
    for d, m in idx['domains'].items(): print(' ', d, m['count'], m['bytes'], m['gz'])
    sys.exit(1 if errors and '--strict' in sys.argv else 0)
