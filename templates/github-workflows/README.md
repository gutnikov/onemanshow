# Instance workflows

These are **yours**, not the template's. Copy them into `.github/workflows/` in
your own repo and replace every `REPLACE_ME`:

```
cp templates/github-workflows/on-*.yml .github/workflows/
grep -rn REPLACE_ME .github/workflows/
```

They are kept out of `.github/workflows/` here on purpose. Left there they run
in the template itself, where the placeholders are not real, so every push
produced a failed run. That red was permanent and therefore ignored — and it
hid the fact that these files had drifted out of step with the inputs the
reusable workflows require, which would have failed a new project's first
release. `scripts/check-instance-stubs.py` now checks that contract, and the
template's own CI runs it.

The rollback and backup workflows are wired the same way once you need them.
