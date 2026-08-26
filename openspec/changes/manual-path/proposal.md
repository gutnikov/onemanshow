# A path a person can take at every stage

## Why

Events are not delivered reliably, and this pipeline is built out of them.

On 2026-08-26 the code host stopped serving `pull_request` and `push` events for
over an hour — a run created at 15:40 still had `updated_at` equal to
`created_at` at 16:40, with no jobs — while `schedule` and `workflow_dispatch`
ran normally. Separately, a single `issues.labeled` event produced no run at all;
re-applying the same label produced one within a second. Whether the host dropped
it or it was never emitted, the change stopped moving and only a person could
move it.

Two of the four stages the pipeline reaches by an event had no path a person
could take. The one that mattered was the merge: its stub has no
`workflow_dispatch` at all, and the workflow behind it gates on
`github.event.label.name` and reads the ticket from `github.event.issue.number`
in three separate places, so a manual run would have been refused and then, if
allowed, would have failed with an empty ticket.

The cost of not fixing this is not theoretical. It is a change that cannot be
released while the host is unwell, and a person who cannot tell whether the
system is busy, broken, or simply never told.

## What is being built

1. **The merge stage learns its ticket rather than being told.** Exclusivity
   already guarantees at most one change occupies `dev` through `released`, so
   "which ticket is in `ready-to-release`?" has exactly one answer, and asking is
   both more robust and shorter than three copies of an event field. The event's
   value stays as the first source when it is there.
2. **Every stage reached by an event gains a manual path**, and the set is
   enumerated rather than assumed: `on pull request`, `on ready to release`,
   `on main`, `on schedule`, `on pull request closed`, `on liveness`. Whichever
   of them cannot be run by hand today gets `workflow_dispatch` and whatever
   derivation that requires.
3. **The stub templates gain the same**, so instances created later are not born
   with the gap.

## What is not included

- **No mechanism that watches for missed events.** It is the obvious idea and it
  is wrong: a poller that re-derives what should have happened is a second
  implementation of the state machine, and the loop it needs has no natural
  bound. `reference/loops.md` exists because of exactly this shape.
- No change to how state is derived elsewhere. The lifecycle stays where it is.
- No retry of the host's delivery. It is not ours to retry.

## How we will know it worked

The manual path is exercised, not merely added: each stage that gains one is run
by hand once, and does the same thing it does from its event.

For the merge specifically, the test is the one that already happened by
accident — a change sitting in `ready-to-release` whose label event never
arrived — and the answer must be that a person can move it in one command.

## What this also closes

Task 3.2 of `smoke-signs-in`: verify that the pre-deploy sign-in probe **stops**
a release. This change touches only workflows, and `.github/**` is excluded from
the deployable paths, so it produces no release of its own to piggyback on. So
the verification is deliberate: dispatch a release with a knowingly wrong
credential and confirm that nothing is migrated, nothing deployed and nothing
rolled back.

That is also the first time this pipeline rehearses an incident at all. The
rollback path has fired once, in anger; the pre-deploy stop has never fired. A
rehearsal that costs nothing because the probe runs before anything changes is
the cheapest one available, and it is worth doing on purpose rather than waiting
to learn it during a real failure.

## What has to be decided, and is not obvious

1. **Deriving the ticket changes what "the merge" is keyed to.** Today it is keyed
   to a label event on a specific issue; derived, it is keyed to whatever is in
   `ready-to-release` at the moment it runs. If two tickets ever carry that label,
   the derived version picks one — quietly. Exclusivity says that cannot happen,
   but exclusivity is enforced elsewhere, and a guard that trusts another guard is
   how this project has been bitten before.
2. **A manual path is also a path around the gates.** `workflow_dispatch` on the
   merge means a person can merge without the approval that is supposed to precede
   it. The six guards still run, and one of them reads the ticket's status — so the
   question is whether that is sufficient, or whether the manual path needs its own
   refusal for a ticket that was never approved.
3. **Which stages genuinely need it.** `on liveness` and `on pull request closed`
   may not: one is driven by an external monitor and the other only tidies up. The
   answer should be argued per stage rather than applied uniformly, because a
   dispatch trigger that nobody will ever use is a rule the next reader has to
   understand for nothing.
4. **The deliberate broken-credential release will label a closed ticket.** The
   release derives its ticket from the commit, and main's head belongs to #24,
   which is closed. `open-window`'s failure branch labels whatever it finds. So the
   rehearsal has a side effect on a finished change, and either that is accepted and
   cleaned up, or the rehearsal needs somewhere else to happen.
