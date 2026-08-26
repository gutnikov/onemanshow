#!/usr/bin/env python3
"""The migration journal must name the files that exist, and no others.

A renamed migration whose journal entry still names the old file is applied
twice or not at all, and neither failure appears until something runs the
migrations - by which time it is a deploy, not a check. This was created by
hand, committed, and pushed before anyone noticed, because nothing compared
the two.
"""
import json, os, pathlib, sys

DIR = pathlib.Path("db/migrations")
journal = DIR / "meta" / "_journal.json"
if not journal.exists():
    print("no migration journal; nothing to compare")
    sys.exit(0)

tags = {e["tag"] for e in json.loads(journal.read_text())["entries"]}
files = {p.stem for p in DIR.glob("*.sql")}

problems = []
for tag in sorted(tags - files):
    problems.append(f"the journal names '{tag}' and no such file exists")
for name in sorted(files - tags):
    problems.append(f"'{name}.sql' exists and the journal does not name it")

for p in problems:
    print(f"::error::{p}" if len(sys.argv) > 1 else f"migrations: {p}")
if problems:
    sys.exit(1)
print(f"migrations: {len(tags)} entries, each with its file")
