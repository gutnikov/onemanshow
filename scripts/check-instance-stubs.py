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
    ("templates/github-workflows/on-adopt-database.yml", ".github/workflows/adopt-database.yml"),
    ("templates/github-workflows/on-retire-database.yml", ".github/workflows/retire-database.yml"),
]

# Stages deliberately without a path a person can take, and the reason. This
# lives in code rather than in prose because "the reason is written down" is a
# requirement, and a requirement nothing asserts is a comment. Both directions
# are checked: these must NOT be dispatchable, everything else must be.
NO_MANUAL_PATH = {
    "templates/github-workflows/on-pr-closed.yml":
        "abandoning closes a ticket, which only a person may do - and what makes "
        "automation's closure legitimate is the person closing the pull request, "
        "which a dispatch does not carry",
    "templates/github-workflows/on-liveness.yml":
        "it records an observation made from outside; entering one by hand is "
        "fabricating evidence rather than operating the pipeline",
}


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
    # Event delivery belongs to the code host, and on 2026-08-26 it stopped for
    # over an hour. A stage reachable only by an event is a stage where a change
    # stops until the host recovers.
    dispatchable = "workflow_dispatch" in triggers(stub)
    if stub_path in NO_MANUAL_PATH and dispatchable:
        problems.append(
            f"{stub_path}: has workflow_dispatch, but it is listed as deliberately "
            f"without a manual path because {NO_MANUAL_PATH[stub_path]}")
    if stub_path not in NO_MANUAL_PATH and not dispatchable:
        problems.append(
            f"{stub_path}: no workflow_dispatch, so a person cannot enter this "
            f"stage when its event is not delivered - add one, or add it to "
            f"NO_MANUAL_PATH with the reason")

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
