# Staging

The change is deployed where a person can look at it. Two verification runs
happen here and they prove different things — do not confuse them.

## Why there are two

The baseline is production's schema **and production's data**, with this change's
migration applied on top. That is what makes the migration path real rather than
seeded past.

But it also means the data present is not the data this change's fixtures
describe. So:

**Run one — migration safety.** The content-agnostic smoke set against the
migrated production baseline. It answers: did the migration break the
application against data shaped like production's? It deliberately asserts
nothing about *content*, because the content is not this change's.

**Run two — feature correctness.** Reset, seed at this change's own commit, then
the full end-to-end suite. Now the fixtures are the ones the tests were written
against.

Asserting on content in run one fails every change that touches fixtures,
through no fault of its own. That mistake was made here once already.

## When the end-to-end run is red

The pipeline reports all three of these identically. Deciding between them is
your work and it is most of your value.

**A flake.** The failure is in the harness, not the application: a timeout on a
slow start, a race in the test, a network blip. Evidence: it fails somewhere
unrelated to the diff, or the same test has failed before on unrelated changes.
Re-run **once** — staging is reset before each attempt, so a retry is a real
retry rather than a rerun on residue. Consult `reference/loops.md` before a
second. Then `blocked:e2e`.

**A broken test.** The application is right and the test is wrong: it asserted on
something this change legitimately changed. Evidence: the failure is exactly
where the diff is, and the new behaviour is what the proposal said it would be.
Fix the test in this change — it is part of the work, not a separate ticket.

**A real bug.** Back to `dev`. Say what broke and where you think it is.

If you cannot tell, say so and go to `blocked:e2e`. Guessing between these is
worse than asking: a wrong guess sends the change to the wrong place and wastes
the slot.

## Do not read the deploy as the verdict

A green deploy means the container became healthy. It says nothing about whether
the change works. The verdict is the two runs.

Then continue into `playbooks/07-approve.md`.
