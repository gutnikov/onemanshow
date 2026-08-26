#!/usr/bin/env python3
"""The two secret-reference files must declare the same names.

Kamal reads .kamal/secrets-common and .kamal/secrets, and this project has them
identical - the same list twice. Editing one and not the other is how a
declaration survives its own removal: POSTGRES_PASSWORD was taken out of one
file and the deploy still failed with "declared for the deploy tool but empty",
naming a credential nothing used any more.

The duplication should collapse to one file. Until it does, this makes the two
agree by force rather than by memory.
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

(a, sa), (b, sb) = names.items()
only_a, only_b = sorted(sa - sb), sorted(sb - sa)
if not only_a and not only_b:
    print(f"kamal secrets: both files declare the same {len(sa)} names")
    sys.exit(0)
for n in only_a:
    print(f"::error::{n} is declared in {a} and not in {b}" if len(sys.argv) > 1 else f"kamal secrets: {n} in {a} only")
for n in only_b:
    print(f"::error::{n} is declared in {b} and not in {a}" if len(sys.argv) > 1 else f"kamal secrets: {n} in {b} only")
sys.exit(1)
