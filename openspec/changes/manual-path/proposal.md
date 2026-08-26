# A path a person can take at every stage

## Why

Events are not delivered reliably, and this pipeline is built out of them.

On 2026-08-26 the code host stopped serving `pull_request` and `push` events for
over an hour — a run created at 15:40 still had `updated_at` equal to
`created_at` at 16:40, with no jobs — while `schedule` and `workflow_dispatch`
ran normally. Separately, a single `issues.labeled` event produced no run at all;
re-applying the same label produced one within a second.

**Corrected by the examination.** The first draft said "two of the four stages"
and both numbers were invented. Reading every workflow in both repositories: nine
are reached by an event, and four have no path a person can take —
`on-pr-closed`, `on-ready-to-release`, `on-liveness`, and the template's own
`template-ci`. Two of those four *should not* get one, for reasons below.

The framing was also wrong in a way that made the hazard sound safe. `merge.yml`
gates on `github.event.label.name` at **job** level, and a skipped job makes a
run **green**. So a dispatch trigger added without touching that condition would
have reported success and done nothing — the same shape as the empty ticket
status that used to be reported as a successful promotion.

## What the examination changed, before anything else

Three premises of the first draft were false, and each one moves the design.

**1. "This change produces no release of its own" — false, and it would have
jammed the pipeline.** `merge-change` ends with `gh workflow run on-main.yml`,
unconditionally, and its own comment explains why: a push made with the
workflow token raises no events. `paths-ignore` filters the *push* trigger only.
So every merge releases, whatever it touched — and `pr.yml` tags
`<sha>-production` for every pull request head, so the artifact exists and the
release succeeds. Production would then be running a commit whose whole diff is
excluded from the deployable paths, and merge guard 4 — which compares
production to the last commit touching a deployable path — would refuse **the
next** change with "unresolved rollback or a leaked release", silently, until
somebody tried to merge.

`openspec/specs/delivery-pipeline` already forbids exactly this: *"Commits that
touch only documentation, planning artifacts, pipeline wiring, project
configuration or provisioning scripts SHALL NOT release."* The push trigger
honours that list and guard 4 honours it; the merge's dispatch does not. Three
readers of one list, one of them not reading it. So fixing this is not scope
creep — this change cannot land without it.

**2. "Exclusivity guarantees one answer" — refuted by this project's own spec.**
`change-lifecycle` requires that *"a change declared a hotfix SHALL be allowed
onto an occupied segment, pausing the change already there"*, and a paused change
keeps the status it was interrupted in. So two tickets can carry
`status:ready-to-release`, by design, and nothing anywhere refuses a second. A
derived merge that picks one is a coin toss that ships the wrong change with all
six guards green. The derivation must **refuse ambiguity**, not resolve it.

**3. "The six guards still run, so a manual merge is safe" — false.** The
approval guard reads the issue timeline for the last actor who applied
`status:ready-to-release`, and that record survives the label being removed. It
certifies that a person once approved *something*, not that they approved *this
commit*. On the event path the event itself is the missing proof: the merge only
runs when the label is being applied now. A dispatch path deletes that proof, and
the known sequence — approve, push a commit, watch automation drop the label to
`staging`, let revalidation write a fresh mark on the new head — then satisfies
every guard for a commit nobody approved.

## What is being built

1. **The merge stops dispatching a release for a commit that touches no
   deployable path**, reading the same exclusion list guard 4 reads rather than
   a second copy of it. This makes the existing requirement true instead of
   aspirational.
2. **Approval becomes commit-scoped and durable.** A mark on the approved head,
   written when a person applies the label, checked as a guard — the same shape
   the validation mark already uses. Then neither path can ship an unapproved
   commit, and the event stops being load-bearing evidence.
3. **The derived ticket refuses ambiguity.** One ticket in `ready-to-release`
   proceeds; two stop with both numbers named; none stops.
4. **A manual path where it is argued for**: `on-ready-to-release`, and
   `template-ci` — which today has no dispatch trigger, is the required check on
   the very pull request carrying this change, and is triggered by exactly the two
   event kinds that stalled.
5. **A manual path deliberately refused, with the reason written down**, for
   `on-pr-closed` and `on-liveness`. Abandoning closes a ticket, which the
   lifecycle reserves to a person; the only thing that makes automation's closure
   legitimate is that a person closed the pull request, and a dispatch carries no
   such decision. Liveness records an observation made from outside; entering one
   by hand is not operating the pipeline, it is fabricating evidence.
6. **A detector on the schedule that reports and does not act** — see below.
7. **The stub checker learns to compare triggers.** It compares `with:` keys and
   the `uses:` target only, so trigger drift is invisible to it — and has already
   happened: the instance's `on-pr` carries `workflow_dispatch` and the template
   stub it was made from does not.

## What is not included, and one refusal withdrawn

- **A poller that acts.** Still out.
- **A poller that reports — withdrawn from the exclusion list, because the
  argument against it was wrong.** The first draft cited `reference/loops.md`;
  that file says the opposite, listing *"re-reading state, re-deriving a stage"*
  as the cheap, budgeted kind. And the thing already exists: the window check
  runs every ten minutes, re-derives lifecycle state from labels and timelines,
  and already performs the `ready-for-dev → dev` transition. Adding one listing
  there — a ticket has held `ready-to-release` for longer than N with no merge run
  since the label event — costs two queries in a workflow that already runs, and
  it is the only part of this proposal that answers the half of the Why the
  dispatch triggers do not: telling a person that a change is stuck rather than
  waiting for them to notice.
- No retry of the host's delivery. Not ours.

## How we will know it worked

Not "the run passed" — a skipped job passes. For each stage: the run's log
contains the lines that stage prints when it does its work. For the merge,
that is six guard lines, the merged head equal to the resolved pull request head,
and either a dispatched release or a stated refusal to dispatch one.

The negative cases, each proved by a **named guard printing its refusal**, not by
a red run:

- a dispatched merge for a ticket whose approval mark does not match the head;
- a dispatched merge with two tickets in `ready-to-release`;
- a merge of a commit touching no deployable path, which must say it is not
  releasing and why.

## Task 3.2 of `smoke-signs-in`, and what it really costs

The first draft claimed this change would close it for free. It will not, and
after item 1 above it definitely will not: this change touches only wiring, so it
must not release, and there is nothing to piggyback on.

The rehearsal is still worth doing on purpose, but its price is now visible. The
release stub takes no inputs, so the only way to give the probe a wrong
credential is to commit one to `secrets/ci.yaml` — which fires the reconfigure
workflow and redeploys production, once to break it and once to restore it. Two
unnecessary deploys of an unchanged version. And the ticket the failure lands on
depends on when the button is pressed: today main's head belongs to a closed
ticket, so the label is inert; after this change merges it would land on an open
one and block every merge in the repository until removed.

So the rehearsal is scheduled deliberately, before this change merges, against
today's head, with the label removed afterwards and the thread told it was
staged.

## Decided at the gate

**The cheap approval check, not the commit-scoped mark.** The guard refuses
unless `status:ready-to-release` is *currently* on the ticket **and** the label
event that put it there is newer than the head commit. That closes the known
sequence — approve, push, the label drops, revalidation writes a fresh mark —
because after the push the newest approval event is older than the head. It
leaves a narrower race: approve, and push within the same second. Written down
rather than pretended away, and the full mark stays available as a later change
if that race ever stops being theoretical.

**The detector belongs here.** It is the only part that answers the half of the
Why the dispatch triggers do not, and it is the cheapest thing in the change.
