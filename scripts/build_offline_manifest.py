#!/usr/bin/env python3
"""v14.14.0: offline_manifest.json — список пакетов офлайн-базы с хешами для кнопки
«🔄 Обновить базу офлайн-ответов» (Настройки). Приложение сравнивает хеши и скачивает
только изменившиеся файлы с того же origin (GitHub Pages).

Генерируется, не правится руками:  python3 scripts/build_offline_manifest.py
(kb/build_kb.py вызывает его сам после сборки KB). --check — только проверить актуальность.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'offline_manifest.json'
# только данные (JSON); код приезжает с обновлением приложения
FILES = ('local/eiti_frames.json', 'local/eiti_typo_vocab.json', 'kb/index.json', 'offline/core.json')
PATTERNS = ('kb/idx/*.json', 'kb/packs/*.json', 'offline/packs/*.json')


def file_list(root=ROOT):
    rels = set(FILES)
    for pat in PATTERNS:
        rels.update(p.relative_to(root).as_posix() for p in root.glob(pat))
    return sorted(rels)


def sha16(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def build(root=ROOT):
    files = {}
    for rel in file_list(root):
        b = (root / rel).read_bytes()
        files[rel] = {'h': sha16(b), 's': len(b)}
    ver = sha16(json.dumps(files, sort_keys=True).encode('utf-8'))
    return {'format': 'eiti-offline-manifest', 'v': 1, 'version': ver, 'files': files}


def dumps(m):
    return json.dumps(m, ensure_ascii=False, separators=(',', ':'), sort_keys=True) + '\n'


def main(argv):
    m = dumps(build())
    if '--check' in argv:
        cur = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        if cur != m:
            print('offline_manifest.json is stale: run python3 scripts/build_offline_manifest.py')
            return 1
        print('offline_manifest.json OK')
        return 0
    OUT.write_text(m, encoding='utf-8')
    print('offline_manifest.json', len(json.loads(m)['files']), 'files', len(m), 'bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
