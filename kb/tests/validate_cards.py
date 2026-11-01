#!/usr/bin/env python3
"""v14.14.0: validate concept cards kb/src/kn_*.txt (EITI Frames, part B).

Checks: header, line schema (triggers || definition || @fields), known non-empty fields, Russian text
(Cyrillic share), lengths (detail up to 1200 chars; other fields up to 360), no renderer markers/markup, duplicate triggers
(within cards and against every hand-written file — the strict build would fail), duplicate definitions,
first trigger = the concept name (not a question).  Exit 1 on any error.   python3 kb/tests/validate_cards.py
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from build_kb import FIELDS, SRC, norm, parse_fields   # noqa: E402

CYR = re.compile('[а-яё]', re.I)
LAT = re.compile('[a-z]', re.I)
BAD = re.compile(r'⟦|⟧|\|\||[\ue000-\uf8ff]|<|>|\*\*|`')
QWORD = re.compile(r'^(что|кто|как|где|когда|зачем|почему|сколько|расскажи|объясни)\b', re.I)


def ru_ok(s):
    c, l = len(CYR.findall(s)), len(LAT.findall(s))
    return c >= 8 and c >= 3 * l


def ru_field(k, s):
    # примеры (ex) и числа (count) могут быть списком имён собственных латиницей («Linux, Firefox»); остальные поля — русский текст
    if k in ('ex', 'count'): return True
    c, l = len(CYR.findall(s)), len(LAT.findall(s))
    return c >= 5 and c >= 2 * l


def field_max(k):
    return 1200 if k == 'detail' else 360


def main():
    errs, cards, trig, defs, enriched = [], 0, {}, {}, 0
    files = sorted(os.listdir(SRC))
    for fn in files:   # hand-written (non-generated) triggers: a card may not shadow them
        if fn.startswith('kn_') or not fn.endswith('.txt'): continue
        lines = open(os.path.join(SRC, fn), encoding='utf-8').read().splitlines()
        if len(lines) > 1 and lines[1].startswith('# @generated'): continue
        for ln, line in enumerate(lines[1:], 2):
            if not line.strip() or line.startswith('#'): continue
            for t in line.split('||')[0].split(';'):
                if norm(t): trig.setdefault(norm(t), '%s:%d' % (fn, ln))
            seg = line.split('||')[-1].strip()
            if seg.startswith('@'):   # a hand-written entry enriched with card fields
                f, ferr = parse_fields(seg); at = '%s:%d' % (fn, ln)
                errs.extend(at + ' ' + e for e in ferr)
                for k, v in f.items():
                    if not (8 <= len(v) <= field_max(k)) or not ru_field(k, v) or BAD.search(v): errs.append(at + ' bad field %s' % k)
                enriched += 1
    per = {}
    for fn in files:
        if not (fn.startswith('kn_') and fn.endswith('.txt')): continue
        lines = open(os.path.join(SRC, fn), encoding='utf-8').read().splitlines()
        if not re.match(r'^# Понятия: .+ \| Concepts: .+', lines[0]): errs.append('%s:1 bad header' % fn)
        n = 0
        for ln, line in enumerate(lines[1:], 2):
            if not line.strip() or line.startswith('#'): continue
            at = '%s:%d' % (fn, ln)
            parts = [p.strip() for p in line.split('||')]
            if len(parts) != 3 or not parts[2].startswith('@'):
                errs.append(at + ' schema: expected «triggers || definition || @fields»'); continue
            ts = [t.strip() for t in parts[0].split(';')]
            if not ts or any(not t for t in ts): errs.append(at + ' empty trigger')
            if ts and QWORD.match(ts[0]): errs.append(at + ' first trigger must be the concept name, got %r' % ts[0])
            for t in ts:
                nt = norm(t)
                if not nt: continue
                if nt in trig: errs.append(at + ' duplicate trigger %r (also %s)' % (t, trig[nt]))
                else: trig[nt] = at
            d = parts[1]
            if not (40 <= len(d) <= 420): errs.append(at + ' definition length %d' % len(d))
            if not ru_ok(d): errs.append(at + ' definition is not Russian text')
            if BAD.search(d): errs.append(at + ' forbidden markup in definition')
            if not re.match('^[А-ЯЁA-Z0-9«(]', d): errs.append(at + ' definition must start with a capital')
            nd = norm(d)
            if nd in defs: errs.append(at + ' duplicate definition (also %s)' % defs[nd])
            defs[nd] = at
            f, ferr = parse_fields(parts[2])
            errs.extend(at + ' ' + e for e in ferr)
            if len(f) < 2: errs.append(at + ' needs at least 2 aspect fields')
            for k, v in f.items():
                if not v.strip(): errs.append(at + ' empty field %s' % k)
                elif not (8 <= len(v) <= field_max(k)): errs.append(at + ' field %s length %d (max %d)' % (k, len(v), field_max(k)))
                elif not ru_field(k, v): errs.append(at + ' field %s is not Russian text' % k)
                if BAD.search(v): errs.append(at + ' forbidden markup in field %s' % k)
            n += 1
        per[fn] = n; cards += n
    for e in errs: print(e)
    print('concept cards: %d in %d files + %d hand-written entries with card fields = %d; errors: %d' % (cards, len(per), enriched, cards + enriched, len(errs)))
    for fn, n in per.items(): print('  %-22s %d' % (fn, n))
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())
