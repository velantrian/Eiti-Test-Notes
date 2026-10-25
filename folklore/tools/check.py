#!/usr/bin/env python3
"""Validate folklore data structure, not the historicity of its stories.

Usage: python3 folklore/tools/check.py [--root folklore/]

Fails on JSON/Markdown/index/verification inconsistencies, invalid field
shapes, and identical full summaries. A record's optional "verified": true must
match a "yes" row in VERIFICATION.md, and vice versa. Repeated titles are warnings because
different cultures may have different stories with the same title.
Does NOT establish HTTP reachability, fidelity, translation accuracy, rights,
or historical authenticity.
"""

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

COLLECTIONS = ("americas", "ancient", "caucasus", "ussr")
FIELDS = ("group", "people", "type", "title", "summary", "moral",
          "title_en", "summary_en", "moral_en")
ENTRY_RE = re.compile(r"(?m)^## (\d+)\. ([^\n]+)$")
INDEX_RE = re.compile(r"\]\(tales_([a-z0-9_]+)\.md\)\s*(?:—|:)\s*(\d+)")


def normalize(value):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", value)).strip()


def number(value):
    try:
        return int(re.sub(r"[\s,]", "", value))
    except ValueError:
        return None


def json_file(path, errors):
    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, list):
            errors.append(f"{path}: expected a JSON array")
            return None
        return data
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        errors.append(f"{path}: cannot read JSON ({exc})")
        return None


def text_file(path, errors):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        errors.append(f"{path}: cannot read file ({exc})")
        return ""


def validate_record(record, where, expected_group, errors):
    if not isinstance(record, dict):
        errors.append(f"{where}: expected an object")
        return False
    good = True
    for name in FIELDS:
        value = record.get(name)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{where}: missing/non-string {name}")
            good = False
    if record.get("group") != expected_group:
        errors.append(f"{where}: group {record.get('group')!r} != {expected_group!r}")
        good = False
    sources = record.get("sources")
    if not isinstance(sources, list) or not sources:
        errors.append(f"{where}: sources must be a nonempty list")
        good = False
    else:
        for idx, url in enumerate(sources, 1):
            if not isinstance(url, str) or re.search(r"\s", url):
                errors.append(f"{where}: invalid source #{idx}: {url!r}")
                good = False
                continue
            try:
                parsed = urlsplit(url)
                valid = parsed.scheme in ("http", "https") and bool(parsed.netloc)
            except ValueError:
                valid = False
            if not valid:
                errors.append(f"{where}: invalid URL #{idx}: {url!r}")
                good = False
    if "rights" in record and (not isinstance(record["rights"], str) or
                                not record["rights"].strip()):
        errors.append(f"{where}: rights must be a nonempty string if present")
        good = False
    if "verified" in record and record["verified"] is not True:
        errors.append(f"{where}: verified must be true if present (omit it otherwise)")
        good = False
    return good


def check_markdown(path, records, errors):
    if not path.is_file():
        errors.append(f"{path}: missing Markdown counterpart")
        return
    text = text_file(path, errors)
    headings = list(ENTRY_RE.finditer(text))
    if len(headings) != len(records):
        errors.append(f"{path}: {len(headings)} Markdown sections vs {len(records)} JSON records")
    for ix, (heading, record) in enumerate(zip(headings, records), 1):
        if not isinstance(record, dict):
            continue
        section = text[heading.end():headings[ix].start() if ix < len(headings) else len(text)]
        where = f"{path} item {ix}"
        if int(heading.group(1)) != ix:
            errors.append(f"{where}: wrong section number {heading.group(1)}")
        if isinstance(record.get("title"), str) and normalize(heading.group(2)) != normalize(record["title"]):
            errors.append(f"{where}: RU title differs from JSON")
        english = re.findall(r"(?m)^### (.+)$", section)
        if len(english) != 1 or not isinstance(record.get("title_en"), str) or normalize(english[0]) != normalize(record["title_en"]):
            errors.append(f"{where}: EN heading differs from JSON")
        people, genre = record.get("people"), record.get("type")
        if isinstance(people, str) and isinstance(genre, str):
            if normalize(f"*{people} — {genre}*") not in normalize(section):
                errors.append(f"{where}: people/type metadata differs from JSON")
        for name, label in (("summary", None), ("summary_en", None),
                            ("moral", "**Мораль:**"), ("moral_en", "**Moral:**")):
            value = record.get(name)
            if isinstance(value, str) and value.strip():
                expected = f"{label} {value}" if label else value
                if normalize(expected) not in normalize(section):
                    errors.append(f"{where}: {name} absent/changed")
        sources = record.get("sources")
        if isinstance(sources, list) and all(isinstance(u, str) for u in sources):
            expected = "Источники / Sources: " + ", ".join(sources)
            if normalize(expected) not in normalize(section):
                errors.append(f"{where}: sources differ from JSON")
        if isinstance(record.get("rights"), str) and normalize(record["rights"]) not in normalize(section):
            errors.append(f"{where}: rights note missing")


def check_index(path, group_counts, total, records, errors):
    text = text_file(path, errors)
    mentioned = INDEX_RE.findall(text)
    seen = Counter(group for group, count in mentioned)
    if set(seen) != set(group_counts):
        errors.append(f"{path}: group links {sorted(seen)} != {sorted(group_counts)}")
    for group, count in mentioned:
        if seen[group] != 1 or number(count) != group_counts.get(group):
            errors.append(f"{path}: index count for {group} invalid ({count})")
    match = re.search(r"(?:Итого|Всего)\s*/\s*Total:\s*([\d ,]+)", text)
    if not match or number(match.group(1)) != total:
        errors.append(f"{path}: total does not match {total}")
    # Caucasus and USSR indexes enumerate individual titles; ancient/Americas
    # indexes currently contain only group links.
    if re.search(r"(?m)^- (?!\[)[^\n]+ / [^\n]+ \(", text):
        for record in records:
            if not isinstance(record, dict):
                continue
            label = f"- {record.get('title')} / {record.get('title_en')} ({record.get('people')})"
            if label not in text:
                errors.append(f"{path}: missing indexed item {record.get('title')!r}")


def readme_counts(text):
    result = {}
    for line in text.splitlines():
        match = re.match(r"\|\s*\[[^]]+\]\(([a-z]+)/index\.md\)\s*\|\s*([\d ,]+)\|", line)
        if match:
            result[match.group(1)] = number(match.group(2))
        if "**Всего / Total**" in line:
            match = re.search(r"\|\s*\*\*([\d ,]+)\*\*\s*\|", line)
            if match:
                result["_total"] = number(match.group(1))
    return result


def is_wikipedia_url(url):
    if not isinstance(url, str):
        return False
    try:
        host = urlsplit(url).hostname or ""
    except ValueError:
        return False
    return host == "wikipedia.org" or host.endswith(".wikipedia.org")


def check_verification(path, records, errors):
    if not path.is_file():
        errors.append(f"{path}: missing verification ledger")
        return {}
    text = text_file(path, errors)
    actual = Counter((collection, r.get("title"), r.get("title_en"))
                     for collection, r in records if isinstance(r, dict))
    listed = Counter()
    rows = {}
    statuses = Counter()
    rights_flags = 0
    invalid_rows = 0
    for line in text.splitlines():
        if not re.match(r"^\|\s*\d+\s*\|", line):
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if len(cells) != 6 or " / " not in cells[2]:
            errors.append(f"{path}: malformed record row: {line[:120]}")
            invalid_rows += 1
            continue
        collection, title, status = cells[1], cells[2], cells[4]
        key = (collection, *title.split(" / ", 1))
        listed[key] += 1
        rows[key] = status.startswith("yes")
        if status.startswith("yes"):
            statuses["reviewed"] += 1
        elif status.startswith("authored from read PD text"):
            statuses["prior_read"] += 1
        elif status.startswith("no"):
            statuses["not_verified"] += 1
        else:
            errors.append(f"{path}: unrecognized verification state for {title}: {status}")
        if "SECONDARY_ONLY (Wikipedia)" in status:
            statuses["wiki_unverified"] += 1
        if cells[5] != "—":
            rights_flags += 1
    if actual != listed:
        errors.append(f"{path}: rows differ from JSON (missing {sum((actual-listed).values())}, extra {sum((listed-actual).values())})")
    for collection, r in records:
        if not isinstance(r, dict):
            continue
        key = (collection, r.get("title"), r.get("title_en"))
        if key in rows and rows[key] != (r.get("verified") is True):
            errors.append(f"{path}: verified flag {r.get('verified') is True} in JSON but ledger says "
                          f"{'yes' if rows[key] else 'not yes'} for {r.get('title_en')!r}")
    if statuses["reviewed"] + statuses["prior_read"] + statuses["not_verified"] != len(records) or invalid_rows:
        errors.append(f"{path}: verification statuses do not cover all {len(records)} records")
    wikipedia = sum(bool(r.get("sources")) and all(is_wikipedia_url(u) for u in r["sources"])
                    for _, r in records if isinstance(r, dict) and isinstance(r.get("sources"), list))
    if statuses["wiki_unverified"] != wikipedia:
        errors.append(f"{path}: wiki-only flag count {statuses['wiki_unverified']} != JSON {wikipedia}")
    for needle, expected in ((r"перепроверено\)\s*—\s*(\d+)", statuses["reviewed"]),
                             (r"не проверено\s*—\s*\*\*(\d+)\*\*", statuses["not_verified"]),
                             (r"not verified\s*—\s*\*\*(\d+)\*\*", statuses["not_verified"])):
        match = re.search(needle, text)
        if not match or int(match.group(1)) != expected:
            errors.append(f"{path}: documented status totals do not equal table ({needle})")
    return {**statuses, "rights_flags": rights_flags, "wikipedia_only": wikipedia}


def check_root(root):
    root = Path(root)
    errors, warnings = [], []
    per_collection, all_records = {}, []
    collection_dirs = {p.name: p for p in root.iterdir() if p.is_dir() and (p / "index.md").is_file()} if root.is_dir() else {}
    if set(collection_dirs) != set(COLLECTIONS):
        errors.append(f"{root}: expected collections {COLLECTIONS}, found {sorted(collection_dirs)}")
    for collection, directory in sorted(collection_dirs.items()):
        union, groups = [], {}
        json_paths = sorted(directory.glob("tales_*.json"))
        if not json_paths:
            errors.append(f"{directory}: missing group JSON files")
        for json_path in json_paths:
            group = json_path.stem.removeprefix("tales_")
            records = json_file(json_path, errors)
            if records is None:
                continue
            groups[group] = len(records)
            for i, record in enumerate(records, 1):
                validate_record(record, f"{json_path} #{i}", group, errors)
            check_markdown(json_path.with_suffix(".md"), records, errors)
            union.extend(records)
        combined = json_file(directory / f"{collection}.json", errors)
        if combined is not None:
            a = Counter(json.dumps(r, ensure_ascii=False, sort_keys=True) for r in combined)
            b = Counter(json.dumps(r, ensure_ascii=False, sort_keys=True) for r in union)
            if a != b:
                errors.append(f"{directory}: combined JSON differs from group files ({sum((a-b).values())} extra, {sum((b-a).values())} missing)")
        check_index(directory / "index.md", groups, len(union), union, errors)
        for field in ("title", "title_en", "summary", "summary_en"):
            vals = [normalize(r[field]).casefold() for r in union
                    if isinstance(r, dict) and isinstance(r.get(field), str)]
            for value, count in Counter(vals).items():
                if count > 1:
                    issue = f"{collection}: repeated {field} ({count}x): {value[:80]}"
                    (errors if field in ("summary", "summary_en") else warnings).append(issue)
        per_collection[collection] = len(union)
        all_records.extend((collection, r) for r in union)
    readme = readme_counts(text_file(root / "README.md", errors))
    for collection, count in per_collection.items():
        if readme.get(collection) != count:
            errors.append(f"README.md: {collection} count {readme.get(collection)} != {count}")
    if readme.get("_total") != len(all_records):
        errors.append(f"README.md: total {readme.get('_total')} != {len(all_records)}")
    status = check_verification(root / "VERIFICATION.md", all_records, errors)
    return errors, warnings, {"records": len(all_records), "collections": per_collection, **status}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    errors, warnings, stats = check_root(args.root)
    for message in warnings:
        print("WARN:", message)
    for message in errors:
        print("ERROR:", message)
    print("\nfolklore records:", stats["records"], stats["collections"])
    print("status:", {k: v for k, v in stats.items() if k not in ("records", "collections")})
    print("errors:", len(errors), "warnings:", len(warnings))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
