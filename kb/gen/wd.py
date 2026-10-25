"""Tiny cached SPARQL client for Wikidata (QLever mirror first; WDQS fallback, it is rate-limited)."""
import json, os, sys, time, urllib.request, urllib.parse
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache')
PFX = ('PREFIX wdt: <http://www.wikidata.org/prop/direct/> PREFIX wd: <http://www.wikidata.org/entity/> '
       'PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX schema: <http://schema.org/> '
       'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ')
QLEVER_DOWN = [0]
def sparql(q, tag):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, tag + '.json')
    if os.path.exists(f): return json.load(open(f, encoding='utf-8'))
    for att in range(4):
        try:
            if att < 2 and QLEVER_DOWN[0] < 3:
                req = urllib.request.Request('https://qlever.dev/api/wikidata?' + urllib.parse.urlencode({'query': PFX + q}),
                                             headers={'User-Agent': 'eiti-kb-builder/1.0', 'Accept': 'application/sparql-results+json'})
            else:   # fallback: official WDQS (POST; same SPARQL, same result shape)
                req = urllib.request.Request('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': PFX + q}).encode(),
                                             headers={'User-Agent': 'eiti-kb-builder/1.0 (https://github.com/velantrian/Eiti-Test-Notes)', 'Accept': 'application/sparql-results+json'})
            d = json.load(urllib.request.urlopen(req, timeout=300))
            rows = [{k: v['value'] for k, v in b.items()} for b in d['results']['bindings']]
            json.dump(rows, open(f, 'w', encoding='utf-8'), ensure_ascii=False); return rows
        except Exception as e:
            if att < 2: QLEVER_DOWN[0] += 1
            print('retry', tag, att, e, file=sys.stderr); time.sleep(5 * (att + 1))
    raise SystemExit('sparql failed ' + tag)
