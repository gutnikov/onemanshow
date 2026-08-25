# Deploy

Approval is in. This stage merges and releases.

## Check the guards before merging

All six from `reference/gates.md`, and all six are readable from the tools. The
one that gets forgotten is *the pipeline green on the current commit* — a green
run on an earlier commit says nothing about this one.

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

Migrate production, promote the image, deploy, smoke. You do not do this by hand
unless automation is absent.

Two things to know about what promotion means here. The image carries
destination-specific metadata, so the tag that reaches production is derived from
the one that was validated rather than identical to it — what must match is the
**layers**, and the pipeline checks that. And the migration runs before the
deploy, never after.

## If smoke fails

That is an incident, not a retry. `playbooks/rollback.md`.

Do not re-run smoke hoping for green. If the page was broken a moment ago it is
broken now, and the second run costs the time the rollback should have had.

## If smoke passes

`released`, and the observation window opens. Continue into
`playbooks/09-stabilize.md`.
