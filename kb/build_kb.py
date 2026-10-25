#!/usr/bin/env python3
"""Build the EITI KB library from kb/src/*.txt.

Line format:  trigger1; trigger2 || RU answer [|| EN answer]
First line:   # Title RU | Title EN
Files whose second line starts with '# @generated' (w_*.txt, from kb/gen/gen_kb.py) may repeat a trigger
already used by a hand-written entry: the hand-written one wins and the repeat is dropped silently.
In hand-written files any duplicate is a warning (--strict → exit 1).

Output (v2, sharded — nothing of it loads at app start):
  kb/index.json             manifest: domains, counts, shard + pack file names (small)
  kb/idx/<domain>.json      search shard: {"d": domain, "e": [[hash, triggers, keys, part], ...]}
  kb/packs/kb_<domain>[_<part>].json   full answers, ≤ PART entries per file
"""
import glob, gzip, hashlib, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
PART = 400
PACK_GZ_SOFT = 38000   # a domain whose packs would exceed this gets smaller parts (pp in the v3 shard)

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zа-я0-9+#²³ ]+', ' ', s.lower().replace('ё', 'е'))).strip()

def keys(ans, n):
    a = re.sub(r'\s+', ' ', ans)
    return a[:n].rsplit(' ', 1)[0] if len(a) > n else a

def compact_row(hh, r, k, px):
    """[hash, triggers, keys]: trigger «<prefix><first>» → «~N» (px[N] + first); keys keep only words not in triggers."""
    first, out = r['q'][0], [r['q'][0]]
    for t in r['q'][1:]:
        if len(t) > len(first) and t.endswith(first):
            pre = t[:-len(first)]
            if pre not in px: px[pre] = len(px)
            out.append('~%d' % px[pre])
        else: out.append(t)
    tw = set(norm(' '.join(r['q'])).split())
    return [hh, '|'.join(out), ' '.join(w for w in norm(k).split() if w not in tw)]

def gz(b): return len(gzip.compress(b, 9))

def dump(path, obj):
    b = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(b); return b

def build():
    for d in ('packs', 'idx'):
        for f in glob.glob(os.path.join(HERE, d, '*.json')): os.remove(f)
    domains, seen_t, seen_a, seen_id, errors, dropped, total = {}, {}, {}, set(), [], 0, 0
    files = sorted(os.listdir(SRC), key=lambda f: (f.startswith('w_'), f))   # hand-written first
    for fn in files:
        if not fn.endswith('.txt'): continue
        dom = fn[:-4]
        lines = open(os.path.join(SRC, fn), encoding='utf-8').read().splitlines()
        title = lines[0].lstrip('# ').split('|')
        gen = len(lines) > 1 and lines[1].startswith('# @generated')
        if gen and dom.startswith('w_'): dom = dom[2:]
        recs = []
        for ln, line in enumerate(lines[1:], 2):
            if not line.strip() or line.startswith('#'): continue
            parts = [p.strip() for p in line.split('||')]
            if len(parts) < 2 or not parts[1]:
                errors.append('%s:%d bad line' % (fn, ln)); continue
            uniq = []
            for t in [t.strip() for t in parts[0].split(';') if t.strip()]:
                nt = norm(t)
                if not nt: continue
                if nt in seen_t:
                    if not gen: errors.append('%s:%d duplicate trigger %r (also %s)' % (fn, ln, t, seen_t[nt]))
                    continue
                seen_t[nt] = '%s:%d' % (fn, ln); uniq.append(t)
            na = norm(parts[1])
            if na in seen_a:
                if not gen: errors.append('%s:%d duplicate answer (also %s)' % (fn, ln, seen_a[na]))
                dropped += 1; continue
            if not uniq:
                dropped += 1; continue
            seen_a[na] = '%s:%d' % (fn, ln)
            h = hashlib.sha1(norm(uniq[0]).encode()).hexdigest()
            n = 6
            while 'kbl_%s_%s' % (dom, h[:n]) in seen_id: n += 2
            eid = 'kbl_%s_%s' % (dom, h[:n]); seen_id.add(eid)
            rec = {'q': uniq, 'a': parts[1]}
            if len(parts) > 2 and parts[2]: rec['en'] = parts[2]
            recs.append((eid, h[:n], rec))
        if not recs: continue
        part = PART
        while part > 100 and any(gz(json.dumps({'v': 2, 'domain': dom, 'part': 0, 'entries': {e: r for e, _, r in recs[k:k + part]}}, ensure_ascii=False, separators=(',', ':')).encode()) > PACK_GZ_SOFT
                                 for k in range(0, len(recs), part)):
            part -= 50
        nparts = (len(recs) + part - 1) // part
        pfiles, pgz, pbytes, shard, px = [], [], 0, [], {}
        for pi in range(nparts):
            chunk = recs[pi * part:(pi + 1) * part]
            f = 'packs/kb_%s.json' % dom if nparts == 1 else 'packs/kb_%s_%d.json' % (dom, pi)
            b = dump(os.path.join(HERE, f), {'v': 2, 'domain': dom, 'part': pi, 'entries': {e: r for e, _, r in chunk}})
            pfiles.append(f); pgz.append(gz(b)); pbytes += len(b)
            kn = 40 if gen else 110
            for _, hh, r in chunk:
                if gen: shard.append(compact_row(hh, r, keys(r['a'], kn), px))
                else: shard.append([hh, '|'.join(r['q']), keys(r['a'], kn), pi])
        sf = 'idx/%s.json' % dom
        if gen:   # v3 compact: prefix table «кто такой », part implied by position (PART), keys without trigger words
            sb = dump(os.path.join(HERE, sf), {'v': 3, 'd': dom, 'g': 1, 'pp': part, 'px': [k for k, _ in sorted(px.items(), key=lambda x: x[1])], 'e': shard})
        else:
            sb = dump(os.path.join(HERE, sf), {'v': 2, 'd': dom, 'e': shard})
        domains[dom] = {'title': title[0].strip(), 'title_en': (title[1].strip() if len(title) > 1 else dom), 'gen': gen,
                        'count': len(recs), 'shard': sf, 'shard_gz': gz(sb), 'shard_bytes': len(sb),
                        'packs': pfiles, 'pack_gz_max': max(pgz), 'pack_bytes': pbytes}
        total += len(recs)
    order = sorted(domains, key=lambda d: (domains[d]['gen'], d))   # hand-written shards load first
    idx = {'v': 2, 'format': 'eiti-kb-lib', 'count': total, 'order': order, 'domains': domains}
    dump(os.path.join(HERE, 'index.json'), idx)
    return idx, errors, dropped

def load_all(here=HERE):
    """Flat list of index entries (as the JS engine sees them) — for tests/tools."""
    idx = json.load(open(os.path.join(here, 'index.json'), encoding='utf-8'))
    out = []
    for d in idx['order']:
        sh = json.load(open(os.path.join(here, idx['domains'][d]['shard']), encoding='utf-8'))
        out += [{'i': 'kbl_%s_%s' % (d, e[0]), 'd': d, 't': e[1], 'k': e[2], 'p': e[3]} for e in sh['e']]
    return idx, out

if __name__ == '__main__':
    idx, errors, dropped = build()
    for e in errors: print('WARN', e)
    man = open(os.path.join(HERE, 'index.json'), 'rb').read()
    sg = sum(m['shard_gz'] for m in idx['domains'].values()); sb = sum(m['shard_bytes'] for m in idx['domains'].values())
    print('entries', idx['count'], 'domains', len(idx['domains']), 'dropped-generated-dups', dropped)
    print('manifest', len(man), 'gz', gz(man), '| shards raw', sb, 'gz', sg)
    for d in idx['order']:
        m = idx['domains'][d]; print('  %-12s %5d shard_gz %6d packs %d max_pack_gz %6d' % (d, m['count'], m['shard_gz'], len(m['packs']), m['pack_gz_max']))
    sys.exit(1 if errors and '--strict' in sys.argv else 0)
