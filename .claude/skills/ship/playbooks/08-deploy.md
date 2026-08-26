# Deploy

Approval is in. This stage merges and releases.

## The guards refuse; you do not check them

All six from `reference/gates.md` are read and **enforced** by the workflow that
merges, reported one by one. So the ordinary case is that you arrive to find
either a merge that happened or a named guard that refused — and your work is
the second of those, not the first.

Two of them refuse for reasons that read as something else:

**Production and main disagree** usually means a commit reached main without
travelling the pipeline, and its release failed for want of an image. The remedy
is to exclude the path if it is not deployable, or to release it properly if it
is — not to merge past the guard.

**Not a fast-forward** means main moved after this change was validated. The
remedy is to bring the branch up to date and let it revalidate. Note what that
costs on purpose: the new commit withdraws the approval, because approval
records that somebody approved, not which commit they were looking at.

## When the code host will not deliver the event

The merge is reached by a label event, and events are not guaranteed: on
2026-08-26 `pull_request` and `push` went undelivered for over an hour, and one
label event produced no run where re-applying the label produced one in a
second. Try re-applying the label first — it is one command and it usually
works.

The stage can also be entered by hand, which is what the dispatch trigger on it
is for. But note what that does not cover: a dispatch trigger only exists for a
workflow already on the default branch, so it prepares for the next outage
rather than the current one.

If neither works, the break-glass path is to do by hand exactly what the stage
does, in this order, and to say in the thread that you did:

1. Run the guards yourself — the action is a script and takes the ticket and the
   head commit. Do not skip this; the guards are the reason the merge is not
   just a push.
2. Fast-forward main to the validated head. Only a fast-forward, for the same
   reason as below.
3. Ask for the release, unless the commit touches no deployable path.

Doing this without step 1 is how an unapproved or unvalidated commit reaches
production, and it will not look like anything went wrong.

## The merge is a fast-forward

Not a merge commit, not a squash, not a rebase. Each of those produces a commit
that was never built, which leaves nothing to promote: the image was built for
the commit that was validated, and no other.

The alternative is rebuilding, and **a rebuilt image is not the artifact that
passed validation** — builds are not bit-reproducible, so it is a different
thing wearing the same name. Fail rather than rebuild.

This is also why the branch must be up to date: up to date plus fast-forward
means the validated commit becomes main's head unchanged.

## Then the pipeline releases

Migrate production, promote the image, deploy, **confirm readiness**, smoke. You
do not do this by hand unless automation is absent.

The readiness step is explicit rather than a property of the proxy's health
check, and it is the one that catches a deployed image older than the schema it
finds — the state a rollback leaves behind. A load-bearing check belongs where it
can be seen failing.

One surprise worth knowing: the merge **asks** for the release rather than
causing it. A push made with the code host's own token raises no workflow
events, which is how it prevents recursion, so an automated merge cannot trigger
a release by pushing. If a merge lands and no release follows, that is the thing
to look at.

Two things to know about what promotion means here. The image carries
destination-specific metadata, so the tag that reaches production is derived from
the one that was validated rather than identical to it — what must match is the
**layers**, and the pipeline checks that. And the migration runs before the
deploy, never after.

## If smoke fails

That is an incident, not a retry. `playbooks/rollback.md`.

Do not re-run smoke hoping for green. If the page was broken a moment ago it is
broken now, and the second run costs the time the rollback should have had.

**Whether it rolls back automatically depends on the schema.** If the release
changed no migration files, production is returned one step and a person is
called. If it did — or if what production was running could not be established —
nothing is rolled back and the change is marked `blocked:rollback`.

That is arithmetic, not caution. Migrations run before the deploy, so after a
release that added one the schema has already moved; rewinding the image leaves
the previous code against a newer schema, which readiness refuses to call
healthy. The rollback would fail its own health check and leave production broken
a second way. What is needed there is a decision between forward-fixing and
rolling the schema back too, and that is yours.

## If smoke passes

`released`, and the observation window opens. Continue into
`playbooks/09-stabilize.md`.
