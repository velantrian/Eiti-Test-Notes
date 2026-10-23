"""Tiny cached SPARQL client for Wikidata (QLever mirror; WDQS is rate-limited)."""
import json, os, sys, time, urllib.request, urllib.parse
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache')
PFX = ('PREFIX wdt: <http://www.wikidata.org/prop/direct/> PREFIX wd: <http://www.wikidata.org/entity/> '
       'PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX schema: <http://schema.org/> '
       'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ')
def sparql(q, tag):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, tag + '.json')
    if os.path.exists(f): return json.load(open(f, encoding='utf-8'))
    for att in range(4):
        try:
            req = urllib.request.Request('https://qlever.dev/api/wikidata?' + urllib.parse.urlencode({'query': PFX + q}),
                                         headers={'User-Agent': 'eiti-kb-builder/1.0', 'Accept': 'application/sparql-results+json'})
            d = json.load(urllib.request.urlopen(req, timeout=300))
            rows = [{k: v['value'] for k, v in b.items()} for b in d['results']['bindings']]
            json.dump(rows, open(f, 'w', encoding='utf-8'), ensure_ascii=False); return rows
        except Exception as e:
            print('retry', tag, att, e, file=sys.stderr); time.sleep(5 * (att + 1))
    raise SystemExit('sparql failed ' + tag)
