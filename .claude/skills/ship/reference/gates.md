# Gates

The states a change occupies, and what may move it between them.

Read this before performing any transition. The state itself is never stored —
it is read from the ticket and confirmed against the tools, so two actors can
attempt the same transition and the second finds nothing to do.

## The seven statuses of an open change

| Status | The change is | Who acts |
|---|---|---|
| `draft` | an idea being sharpened | you, with the person |
| `ready-for-dev` | approved, waiting for the segment | nobody — it waits |
| `dev` | being written; checks and build run | you |
| `staging` | deployed for a person to look at | the pipeline, then a person |
| `ready-to-release` | approved, waiting to merge | automation |
| `released` | in production, under observation | automation |
| `blocked` | stopped, needs a decision | you, once the cause is read |

Closing is a **separate axis**, not an eighth status: completed, or not planned.
A change can be `released` and not yet closed — that is the observation window.

`hotfix` and `paused` are **flags over** a status, never values of it. A paused
change must resume in the exact status it was interrupted in, which a status
value would have overwritten.

## Who may fire what

| Transition | Fired by |
|---|---|
| → `draft` | a person, or you on their behalf |
| `draft` → `ready-for-dev` | **a person only** |
| `ready-for-dev` → `dev` | you, when the segment is free |
| `dev` → `staging` | the pipeline, when checks and build pass |
| `staging` → `ready-to-release` | **a person only** — this is approval |
| `staging` → `dev` | a person's rejection, carried out by you |
| `ready-to-release` → `released` | automation, when the merge guards pass |
| `released` → closed completed | automation, when the window closes green |
| `released` → `blocked` | automation, on a failed smoke or a downtime signal |
| `blocked` → `dev` | you, after reading the cause |
| `dev`/`staging` → `draft` | a person or you, when the framing was wrong |
| → closed not planned | **a person only** |
| `hotfix` declared | **a person only** |

Three transitions need a person and no argument changes that: deciding a change
is worth doing, deciding it was done well, and abandoning it. A hotfix too —
if you could declare one, the exceptional path would become the ordinary one.

## Exclusivity

At most one change is **active** across `dev`, `staging`, `ready-to-release` and
`released` together. A `paused` change does not count as active.

```
count of open tickets with status in {dev, staging, ready-to-release, released}
  minus those flagged paused, must be <= 1
```

This is why attribution works: when production breaks, exactly one change can
have caused it. It is also why `ready-for-dev` is a queue rather than a
formality. If the segment is busy, say so **with the position** — a change that
is third in line looks identical to a change nobody picked up.

`draft` is outside the limit. Ideas may pile up; only work is serialised.

## Blocked

Reachable only from the exclusive segment, and always exits to `dev`. That gives
it a useful property: a blocked change is holding up everything, so it cannot be
quietly forgotten.

Its cause is recorded as a label, because the same status is reached for reasons
needing different work:

| Label | Then |
|---|---|
| `blocked:rollback` | production broke — `playbooks/rollback.md` |
| `blocked:e2e` | a test failure nobody could read — `playbooks/06-staging.md` |
| `blocked:decision` | a product or technical question is open |
| `blocked:external` | waiting on something outside |

Read the label. Do not infer the cause from the comments.

## The merge guards

`ready-to-release` → `released` requires all of:

- approval recorded
- the pipeline green **on the current commit**, not an earlier one
- the branch up to date with main, so the merge is a fast-forward
- production equal to the last **deployable** commit on main — no unresolved rollback
- no other change in `released` with an open observation window
- no active incident

All six are readable from the tools. Nothing else checks them: the pipeline
enforces none of the six, so they are guards only while whoever merges actually
reads them. Treat that as the current state, not the intent.

Two of them are easy to read wrongly.

**Green on the current commit** is not readable from a dispatched run's own
commit. A staging run is dispatched from the default branch, so the run reports
that branch as its commit while validating whatever sha it was handed. Match the
dispatch input, not the run's `headSha`.

**Production equal to main** used to be exact and no longer is: documentation
commits do not release, deliberately, so main's tip can sit ahead of production
with nothing wrong. What must match is the last commit that touched something
deployable:

```
git log -1 --format=%H origin/main -- . ':(exclude)openspec' ':(exclude).claude' \
  ':(exclude).github' ':(exclude)templates' ':(exclude)provision' \
  ':(exclude)ship.yml' ':(exclude)*.md'
```

Keep this list in step with the release trigger's `paths-ignore`, and read it
from there rather than from memory — they are the same list, and the guard is
wrong the moment they differ.

Comparing against main's tip instead makes this guard refuse every change that
follows a documentation commit. And when a release *has* gone red on a
documentation commit — because the exclusion list did not cover it — this guard
is what stops the next change, correctly. Reconcile it by excluding the path
rather than by releasing the commit. The merge must be a **fast-forward**: a
merge commit, a squash or a rebase produces a commit nobody built, leaving
nothing to promote without rebuilding — and a rebuilt image is not the one that
passed validation.
