#!/usr/bin/env python3
"""The secret declarations, the examples, and each other.

Kamal reads .kamal/secrets-common and .kamal/secrets, and this project has them
identical - the same list twice. Editing one and not the other is how a
declaration survives its own removal: POSTGRES_PASSWORD was taken out of one
file and the deploy still failed with "declared for the deploy tool but empty",
naming a credential nothing used any more.

The duplication should collapse to one file. Until it does, this makes the two
agree by force rather than by memory.

It also compares the declaration with the example files, because nothing did and
three defects survived in them at once: two credentials that died with the
on-machine database, and a missing BETTER_AUTH_SECRET - the very secret whose
absence stopped a rollback booting the application, absent from the file that
documents the shape. An example is what a new project copies, so an example that
cannot work is a project that cannot deploy on its first try.
"""
import pathlib, re, sys

names = {}
for f in (".kamal/secrets-common", ".kamal/secrets"):
    p = pathlib.Path(f)
    if p.exists():
        names[f] = set(re.findall(r"^([A-Z_][A-Z0-9_]*)=", p.read_text(), re.M))

if len(names) < 2:
    print(f"kamal secrets: {len(names)} file(s), nothing to compare")
    sys.exit(0)

# The store calls the registry credential by its own name; the deploy tool has
# its own. One mapping, in one place.
STORE_NAME = {"KAMAL_REGISTRY_PASSWORD": "REGISTRY_TOKEN_RO"}

# staging deliberately has no DATABASE_URL: the stand's database is a branch
# created per validation, so a stored address is stale by construction.
ALLOWED_ABSENT = {"secrets/staging.example.yaml": {"DATABASE_URL"}}

problems = []
declared = set()
for v in names.values():
    declared |= v
expected = {STORE_NAME.get(n, n) for n in declared}

for f in ("secrets/prod.example.yaml", "secrets/staging.example.yaml"):
    p = pathlib.Path(f)
    if not p.exists():
        continue
    present = set(re.findall(r"^([A-Z_][A-Z0-9_]*):", p.read_text(), re.M))
    absent_ok = {STORE_NAME.get(n, n) for n in ALLOWED_ABSENT.get(f, set())}
    for n in sorted(expected - present - absent_ok):
        problems.append(f"{f} does not carry {n}, which the deploy tool declares - "
                        f"a project copying this example cannot deploy")
    for n in sorted(present - expected):
        problems.append(f"{f} carries {n}, which nothing declares any more - "
                        f"an example is how a dead credential gets copied into a new project")

for msg in problems:
    print(f"::error::{msg}" if len(sys.argv) > 1 else f"examples: {msg}")

(a, sa), (b, sb) = names.items()
only_a, only_b = sorted(sa - sb), sorted(sb - sa)
if not only_a and not only_b:
    print(f"kamal secrets: both files declare the same {len(sa)} names")
    print(f"examples: checked against the declaration, {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)
for n in only_a:
    print(f"::error::{n} is declared in {a} and not in {b}" if len(sys.argv) > 1 else f"kamal secrets: {n} in {a} only")
for n in only_b:
    print(f"::error::{n} is declared in {b} and not in {a}" if len(sys.argv) > 1 else f"kamal secrets: {n} in {b} only")
sys.exit(1)
