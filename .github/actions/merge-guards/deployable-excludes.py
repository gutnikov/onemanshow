#!/usr/bin/env python3
"""Emit git pathspecs for the paths the release trigger ignores.

Read from the trigger rather than copied. gates.md says to keep the guard's
list and the trigger's list in step, and the way to keep two lists in step is
to have one. A copy would be wrong the moment a project excludes a path of its
own, and wrong quietly: the guard would compute a different "last deployable
commit" than the trigger acted on, and then either refuse every change or
accept one that never deployed.
"""
import sys, yaml

path = sys.argv[1]
doc = yaml.safe_load(open(path))
triggers = doc[True] if True in doc else doc["on"]
ignored = (triggers.get("push") or {}).get("paths-ignore") or []
if not ignored:
    sys.exit(f"::error::{path} has no paths-ignore, so every commit releases "
             f"and the last deployable commit is main's tip")
print(" ".join(":(exclude)" + p.rstrip("/*").rstrip("/") for p in ignored))
