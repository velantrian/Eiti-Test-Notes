"""Release-boundary regression tests; separate from folklore content checks."""

import tempfile
import unittest
from pathlib import Path

from build_pages import REQUIRED_FILES, REQUIRED_PATTERNS, stage_site


class PagesBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'repo'
        self.root.mkdir()
        self.out = Path(self.tmp.name) / 'pages'
        for name in REQUIRED_FILES:
            self.put(name, b'normal runtime')
        for pattern in REQUIRED_PATTERNS:
            self.put(pattern.replace('*', 'fixture'), b'normal runtime')

    def put(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def test_build_excludes_unreviewed_folklore_and_repo_tooling(self):
        self.put('folklore/ancient/ancient.json', b'unverified')
        self.put('folklore/caucasus/tales_nakh.md', b'rights flagged')
        self.put('folklore/README.md', b'not cleared')
        self.put('kb/src/draft.txt', b'not for Pages')
        self.put('docs/internal.txt', b'not for Pages')
        self.put('local/build_typo_vocab.js', b'build helper')
        self.put('offline/build_tale_related.py', b'build helper')
        files = stage_site(self.root, self.out)
        self.assertEqual(len(files), len([path for path in self.out.rglob('*') if path.is_file()]))
        for name in REQUIRED_FILES:
            self.assertTrue((self.out / name).exists(), name)
        for name in (
            'folklore/ancient/ancient.json',
            'folklore/caucasus/tales_nakh.md',
            'folklore/README.md',
            'kb/src/draft.txt',
            'docs/internal.txt',
            'local/build_typo_vocab.js',
            'offline/build_tale_related.py',
        ):
            self.assertFalse((self.out / name).exists(), name)

    def test_missing_core_file_fails_closed(self):
        (self.root / 'index.html').unlink()
        with self.assertRaises(FileNotFoundError):
            stage_site(self.root, self.out)
        self.assertFalse(self.out.exists())

    def test_symlink_in_runtime_glob_fails_closed(self):
        target = self.put('folklore/private.js', b'unreviewed')
        (self.root / 'local' / 'eiti_forbidden.js').symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            stage_site(self.root, self.out)
        self.assertFalse(self.out.exists())

    def test_stale_output_rejected(self):
        self.out.mkdir()
        (self.out / 'folklore.txt').write_text('stale')
        with self.assertRaisesRegex(ValueError, 'not empty'):
            stage_site(self.root, self.out)

    def test_output_inside_repo_rejected(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            stage_site(self.root, self.root / 'dist')

    def test_real_checkout_asset_inventory_and_runtime_references(self):
        """Stage the real repo and verify PWA, KB, and legacy tale paths."""
        import json
        import re

        repo = Path(__file__).resolve().parents[1]
        staged = Path(self.tmp.name) / 'real-pages'
        included = {p.as_posix() for p in stage_site(repo, staged)}
        actual = {p.relative_to(staged).as_posix()
                  for p in staged.rglob('*') if p.is_file()}
        self.assertEqual(included, actual)
        self.assertIn('index.html', actual)
        self.assertIn('offline/core.json', actual)
        self.assertIn('kb/index.json', actual)
        self.assertFalse(any('folklore' in Path(p).parts for p in actual))
        self.assertFalse(any(p.startswith(('.github/', 'scripts/', 'docs/'))
                             for p in actual))
        self.assertNotIn('folklore/ancient/ancient.json', actual)
        self.assertTrue(any(p.startswith('offline/packs/tales_') for p in actual))

        sw = (staged / 'sw.js').read_text(encoding='utf-8')
        for heading in ('var CORE = [', 'var HEAVY = ['):
            block = sw.split(heading, 1)[1].split('];', 1)[0]
            for asset in re.findall(r"BASE\s*\+\s*'([^']+)'", block):
                self.assertIn(asset, actual, 'SW precache asset: ' + asset)

        manifest = json.loads((staged / 'manifest.json').read_text(encoding='utf-8'))
        for icon in manifest['icons']:
            self.assertIn(icon['src'], actual, 'PWA manifest icon')

        kb = json.loads((staged / 'kb/index.json').read_text(encoding='utf-8'))
        self.assertGreater(len(kb['domains']), 0)
        for domain in kb['domains'].values():
            self.assertIn('kb/' + domain['shard'], actual, 'KB index shard')
            for pack in domain.get('packs', []):
                self.assertIn('kb/' + pack, actual, 'KB answer pack')

        offline = json.loads((staged / 'offline/core.json').read_text(encoding='utf-8'))
        for section in ('packs', 'intentPacks'):
            for pack in offline.get(section, {}).values():
                self.assertIn('offline/' + pack['file'], actual, 'Offline ' + section)
        for tale_group in offline['tales']['groups'].values():
            self.assertIn('offline/' + tale_group['file'], actual, 'Existing tale pack')


if __name__ == '__main__':
    unittest.main()
