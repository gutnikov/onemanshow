# Staging

The change is deployed where a person can look at it. Two verification runs
happen here and they prove different things — do not confuse them.

## Why there are two

The baseline is production's schema and the data **production's own code
produces**, with this change's migration applied on top. That is what makes the
migration path real rather than seeded past.

Not production's actual data, which this said for a while and which was never
true. The fixture is synthetic throughout, deliberately: the provider could copy
production's data into the stand in seconds, and that would put real user data
where a browser and a test suite reach it.

But it also means the data present is not the data this change's fixtures
describe. So:

**Run one — migration safety.** The content-agnostic smoke set against the
migrated production baseline. It answers: did the migration break the
application against data shaped like production's? It deliberately asserts
nothing about *content*, because the content is not this change's.

Which is why the check that **signs in** is not in that set. It needs a
particular account to exist, and that is content by definition. It lives in
`ship/signin`, which this pass does not run — putting it here would dissolve the
property that makes this pass safe, and would fail every change that touches a
fixture account.

**What production checks about identity, and what it does not.** The release
runs `ship/signin` twice — before it changes anything and again after the
deploy — and a green pair means one thing: an account can sign in through the
form, the browser keeps the cookie, and a page behind a session renders. It says
nothing about organisations beyond one existing, nothing about invitations,
nothing about verified addresses, and nothing about anybody's real account,
because the account it uses belongs to nobody. Read it as "the session round
trip works in production", not as "identity works".

**Run two — feature correctness.** The database is emptied, seeded at this
change's own commit, and the full end-to-end suite runs. Now the fixtures are
the ones the tests were written against.

Emptied by the provider rather than by us, and **checked afterwards** — the
pipeline asserts the database holds no tables. That is not ceremony. If emptying
silently fails, the migration table survives, every migration counts as applied,
the seed writes into the previous run's data, and the run is green and
meaningless. The code this replaced removed a volume nothing was using and
reported success for a whole run.

Asserting on content in run one fails every change that touches fixtures,
through no fault of its own. That mistake was made here once already.

**Both runs must be running the change's code.** If the pipeline resolves "the
change's commit" to the default branch, run two seeds that branch's fixture and
asserts that branch's expectation — the two agree, the run is green, and the
change was never exercised. That mistake was also made here, and it is the
harder one to notice, because nothing is red. Before trusting a green run on a
change that touches fixtures, look at the stand and confirm it serves the new
value. A green suite and a stand showing the old value cannot both be right.

## When the end-to-end run is red

The pipeline reports all three of these identically. Deciding between them is
your work and it is most of your value.

**A flake.** The failure is in the harness, not the application: a timeout on a
slow start, a race in the test, a network blip. Evidence: it fails somewhere
unrelated to the diff, or the same test has failed before on unrelated changes.

One concrete cause worth knowing: a managed database that has scaled to zero
takes a second or two to wake, and the first request after a deploy pays it. A
single timeout on the first request, with everything after it passing, is that
and not your change.
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
