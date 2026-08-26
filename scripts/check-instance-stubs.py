#!/usr/bin/env python3
"""Check the instance stubs still match the reusable workflows they call.

The stubs are the first thing a new project runs and the last thing anyone
looks at. When they drifted, nothing noticed: their runs in this repo failed at
startup for an unrelated reason, so a real mismatch looked like the usual red.
"""
import sys, yaml, pathlib

PAIRS = [
    ("templates/github-workflows/on-main.yml", ".github/workflows/release.yml"),
    ("templates/github-workflows/on-pr.yml", ".github/workflows/pr.yml"),
    ("templates/github-workflows/on-staging.yml", ".github/workflows/staging.yml"),
    ("templates/github-workflows/on-rollback.yml", ".github/workflows/rollback.yml"),
    ("templates/github-workflows/on-backup.yml", ".github/workflows/backup.yml"),
    ("templates/github-workflows/on-pr-closed.yml", ".github/workflows/abandon.yml"),
    ("templates/github-workflows/on-ready-to-release.yml", ".github/workflows/merge.yml"),
    ("templates/github-workflows/on-schedule.yml", ".github/workflows/window.yml"),
    ("templates/github-workflows/on-liveness.yml", ".github/workflows/liveness.yml"),
    ("templates/github-workflows/on-secrets.yml", ".github/workflows/reconfigure.yml"),
]

def triggers(doc):
    # PyYAML reads the key `on` as the boolean True.
    return doc[True] if True in doc else doc["on"]

problems = []
for stub_path, target_path in PAIRS:
    stub = yaml.safe_load(pathlib.Path(stub_path).read_text())
    target = yaml.safe_load(pathlib.Path(target_path).read_text())
    job = next(iter(stub["jobs"].values()))
    given = set((job.get("with") or {}).keys())
    declared = triggers(target)["workflow_call"].get("inputs") or {}
    required = {k for k, v in declared.items() if v.get("required")}

    for name in sorted(required - given):
        problems.append(f"{stub_path}: does not pass required input '{name}'")
    for name in sorted(given - set(declared)):
        problems.append(f"{stub_path}: passes '{name}', which {target_path} does not declare")
    if job.get("uses", "").split("@")[0] != target_path.replace(
            ".github/workflows/", "gutnikov/onemanshow/.github/workflows/"):
        problems.append(f"{stub_path}: calls {job.get('uses')}, expected {target_path}")

# The registry host belongs to the deploy tool's own config; passing it here
# produced docker.io/docker.io/... and a deploy that could not pull.
for stub_path, _ in PAIRS:
    text = pathlib.Path(stub_path).read_text()
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("image:") and ("docker.io/" in s or "ghcr.io/" in s):
            problems.append(f"{stub_path}: image carries a registry host: {s}")

for p in problems:
    print(f"::error::{p}" if len(sys.argv) > 1 else p)
print(f"{len(PAIRS)} stubs checked, {len(problems)} problem(s)")
sys.exit(1 if problems else 0)
