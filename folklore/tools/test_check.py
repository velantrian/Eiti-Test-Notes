"""Regression tests for folklore/tools/check.py with isolated fixtures."""
import json
import tempfile
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check import check_root

COLLECTIONS = ("americas", "ancient", "caucasus", "ussr")


class CheckerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.entries = {}
        for category in COLLECTIONS:
            data = dict(group="sample", people="culture", type="myth",
                        title=f"Текст {category}", summary="Краткое содержание " + category,
                        moral="Авторское толкование", title_en=f"Story {category}",
                        summary_en="English summary " + category,
                        moral_en="Editorial moral", sources=["https://example.com/text"])
            if category in COLLECTIONS[:2]:
                data["verified"] = True
            self.entries[category] = data
            directory = self.root / category
            directory.mkdir()
            self.write(directory / "tales_sample.json", json.dumps([data], ensure_ascii=False))
            self.write(directory / f"{category}.json", json.dumps([data], ensure_ascii=False))
            self.write(directory / "tales_sample.md", (
                "# Group\n\n## 1. " + data['title'] + "\n\n*" + data['people'] +
                " — " + data['type'] + "*\n\n" + data['summary'] +
                "\n\n**Мораль:** " + data['moral'] + "\n\n### " + data['title_en'] +
                "\n\n" + data['summary_en'] + "\n\n**Moral:** " + data['moral_en'] +
                "\n\nИсточники / Sources: " + data['sources'][0] + "\n"))
            self.write(directory / "index.md", (
                "# Index\n\n- [Sample](tales_sample.md): 1\n\n" +
                f"- {data['title']} / {data['title_en']} ({data['people']})\n\n" +
                "Всего / Total: 1\n"))
        r = "| Collection | Count |\n|---|---|\n"
        for c in COLLECTIONS:
            r += f"| [{c.title()}]({c}/index.md) | 1 |\n"
        r += "| **Всего / Total** | **4** |\n"
        self.write(self.root / "README.md", r)
        ledger = "# Verification\n\n- Пересказы (перепроверено) — 2\n- не проверено — **2**\n- not verified — **2**\n| # | Cat | Title | URL | Status | Rights |\n|---|---|---|---|---|---|\n"
        for idx, c in enumerate(COLLECTIONS):
            r = self.entries[c]
            status = "yes — checked" if idx < 2 else "no"
            ledger += f"| 1 | {c} | {r['title']} / {r['title_en']} | OK | {status} | — |\n"
        self.write(self.root / "VERIFICATION.md", ledger)

    def write(self, path, value):
        path.write_text(value, encoding="utf-8")

    def validate(self):
        return check_root(self.root)

    def test_valid_data_passes(self):
        errors, warnings, result = self.validate()
        self.assertEqual([], errors)
        self.assertEqual(4, result["records"])
        self.assertEqual(2, result["reviewed"])
        self.assertEqual(2, result["not_verified"])

    def test_changed_group_in_aggregate_fails(self):
        path = self.root / "caucasus" / "caucasus.json"
        data = json.loads(path.read_text())
        data[0]["group"] = "another"
        self.write(path, json.dumps(data, ensure_ascii=False))
        self.assertTrue(any("combined JSON differs" in e for e in self.validate()[0]))

    def test_changed_markdown_translation_fails(self):
        path = self.root / "ancient" / "tales_sample.md"
        self.write(path, path.read_text().replace("English summary ancient", "English different"))
        self.assertTrue(any("summary_en absent/changed" in e for e in self.validate()[0]))

    def test_missing_field_fails_gracefully(self):
        path = self.root / "caucasus" / "tales_sample.json"
        data = json.loads(path.read_text())
        data[0].pop("moral_en")
        self.write(path, json.dumps(data, ensure_ascii=False))
        errors, _, _ = self.validate()
        self.assertTrue(any("missing/non-string moral_en" in e for e in errors))

    def test_bad_source_fails(self):
        path = self.root / "ussr" / "tales_sample.json"
        data = json.loads(path.read_text())
        data[0]["sources"].append("ftp://example.com/not-allowed")
        self.write(path, json.dumps(data, ensure_ascii=False))
        self.assertTrue(any("invalid URL" in e for e in self.validate()[0]))

    def test_stale_verification_fails(self):
        path = self.root / "VERIFICATION.md"
        self.write(path, path.read_text().replace("Story ancient", "Other ancient"))
        self.assertTrue(any("rows differ from JSON" in e for e in self.validate()[0]))

    def set_flag(self, category, value):
        for name in ("tales_sample.json", f"{category}.json"):
            path = self.root / category / name
            data = json.loads(path.read_text())
            if value is None:
                data[0].pop("verified", None)
            else:
                data[0]["verified"] = value
            self.write(path, json.dumps(data, ensure_ascii=False))

    def test_missing_flag_on_verified_row_fails(self):
        self.set_flag("americas", None)
        self.assertTrue(any("verified flag False" in e for e in self.validate()[0]))

    def test_flag_on_unverified_row_fails(self):
        self.set_flag("ussr", True)
        self.assertTrue(any("verified flag True" in e for e in self.validate()[0]))

    def test_non_true_flag_fails(self):
        self.set_flag("caucasus", False)
        self.assertTrue(any("verified must be true" in e for e in self.validate()[0]))

    def test_stale_readme_count_fails(self):
        path = self.root / "README.md"
        self.write(path, path.read_text().replace("**4**", "**5**"))
        self.assertTrue(any("README.md: total" in e for e in self.validate()[0]))


if __name__ == "__main__":
    unittest.main()
