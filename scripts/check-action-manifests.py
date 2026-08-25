#!/usr/bin/env python3
"""Catch the flow-mapping comma that a YAML parser accepts and Actions rejects.

`inputs: { description: a thing, and another, required: true }` is valid YAML.
The commas split the flow mapping, so `and another` becomes a key, and the
runner refuses the manifest with "Unexpected value" - after the workflow has
started, in a job that then fails. A local yaml.safe_load will not tell you:
it parses happily, which is how this reached a run twice.

So the check is on the keys, not on the syntax. Anything other than the keys
Actions defines means a comma has done this.
"""
import sys, yaml, pathlib

INPUT_KEYS = {"description", "required", "default", "deprecationMessage"}
OUTPUT_KEYS = {"description", "value"}
TOP_KEYS = {"name", "description", "author", "inputs", "outputs", "runs", "branding"}

problems = []
for path in sorted(pathlib.Path(".github/actions").glob("*/action.yml")):
    doc = yaml.safe_load(path.read_text())
    for key in sorted(set(doc) - TOP_KEYS):
        problems.append(f"{path}: unexpected top-level key {key!r} - a comma in an unquoted value split a mapping")
    for section, allowed in (("inputs", INPUT_KEYS), ("outputs", OUTPUT_KEYS)):
        for name, spec in (doc.get(section) or {}).items():
            if not isinstance(spec, dict):
                problems.append(f"{path}: {section}.{name} is not a mapping")
                continue
            for key in sorted(set(spec) - allowed):
                problems.append(
                    f"{path}: {section}.{name} has unexpected key {key!r} - "
                    f"a comma in an unquoted value split the mapping; quote it or use block style")

for p in problems:
    print(f"::error::{p}" if len(sys.argv) > 1 else p)
print(f"{len(list(pathlib.Path('.github/actions').glob('*/action.yml')))} manifests checked, {len(problems)} problem(s)")
sys.exit(1 if problems else 0)
