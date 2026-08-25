# Rollback

Production is broken. This has two steps and the second is not paperwork.

## Step one: stop the bleeding

Return production to the previous image. Seconds, no pipeline, no commit.

The deploy tool needs to be told **which** version — it does not work out the
previous one itself. The machine knows: the previous release's container is still
there, stopped, and its name carries the version.

Then verify. If the rolled-back version is healthy, service is restored and you
move to step two.

## If the rolled-back version also fails: stop

Do **not** step back again. The cause is not the image.

Something outside the artifact changed and rewinding the artifact does not rewind
it. Two things live out there:

**Schema.** A migration already applied. The old code queries a column that no
longer exists, and every older image has the same problem — so stepping back
never terminates, it just moves production further from where it should be.

**Configuration.** Supplied from the repository at deploy time. A rollback boots
the previous image against *today's* configuration, so a fault that lives in
configuration survives it untouched. This is not hypothetical: it is how this was
discovered.

Escalate. `blocked:rollback`, say plainly that the previous version fails too and
why that means a person is needed. **Automation does not fix its own fix** — if
the change being rolled back is itself a rollback, refuse before starting.

## Step two: revert through the pipeline

This is what actually restores configuration and brings production back into
agreement with main. Step one restored the image and nothing else.

The revert is a change like any other: its own ticket, its own pull request, the
same stages. The exception is that it may be declared a hotfix, so it overtakes
the queue — but a person declares that, not you.

While step one is done and step two is not, production is behind main and the
invariant is broken. Exclusivity is what keeps that from causing harm: the
segment is occupied, so nothing else can merge into the gap. Do not use the
window to slip something else through.

## What happens to the original change

It shipped and was withdrawn, so neither closing reason is quite true. Close it
as **not planned**, labelled reverted, and open a new ticket for the retry
linked to it.

That is not bookkeeping preference: the spec deltas were archived in the same
commit, so the revert reverted them too. The specs now say the feature is not
there. Closing the ticket as completed would put "done" next to a spec saying
otherwise.

## Write down what happened

Before you finish: what broke, what the signal was, what you did, and what is
still outstanding. The next person to touch this — probably you, with no memory —
arrives through the thread.
