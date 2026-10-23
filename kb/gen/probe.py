from wd import sparql
import sys
cls, sl = sys.argv[1], sys.argv[2]
q = 'SELECT (COUNT(DISTINCT ?x) AS ?c) WHERE { ?x wdt:P31 %s . ?x wikibase:sitelinks ?sl . FILTER(?sl >= %s) ?x rdfs:label ?l FILTER(LANG(?l)="ru") }' % (cls, sl)
print(cls, sl, sparql(q, 'probe_%s_%s' % (cls.replace(':','_'), sl))[0]['c'])
