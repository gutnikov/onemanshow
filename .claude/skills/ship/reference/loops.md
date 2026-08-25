# Loops

Before repeating any automated action, ask one question:

> **Is it cheap to repeat this a hundred times?**

That decides which bound applies. Everything else here follows from it.

## Cheap: a budget that a person refills

Re-running a test, re-reading state, re-deriving a stage. Repeating these wastes
minutes and nothing else.

Each change carries a finite budget of automatic invocations. Exhausting it moves
the change to `blocked` and asks a person — it does not keep going.

**Any human action on the change refills it.** This is the part that makes the
budget usable rather than merely restrictive: a loop is *unattended* repetition
by definition. If a person is replying, reviewing, approving, the system is
working, not spinning. A change that goes back and forth for a day with someone
involved never runs out; a runaway hits the ceiling within the hour.

The count is derived, like everything else — from what the tools already record.
Do not keep your own tally.

## Expensive: once, then a person

Merging. Deploying. Rolling back. Reverting. Applying a migration. Repeating
these causes harm each time, so a budget is the wrong instrument: bounding them
at fifteen still permits fifteen times the damage.

One attempt. Then stop and ask.

The clearest case is a rollback that does not help. Production is rolled back one
step and still fails: the cause is outside the artifact — a migration already
applied, or configuration the rollback did not rewind — and stepping back again
cannot reach it. A system that keeps stepping back never terminates and ends up
many versions from where it should be.

**Automation does not fix its own fix.** If the change being reverted is itself a
revert, refuse and escalate.

## Exhaustible counts as expensive

An action can destroy nothing and still be expensive: burning a monthly quota on
error reporting, a rate limit, a free-tier allowance. Exhausting the thing that
lets you *see* is as bad as breaking the thing you are watching, and it happens
faster — a crash loop can spend a month's allowance in minutes.

## Do not consume your own output

Never react to an event you emitted. If automation watches a channel it also
writes to, its own writes must not satisfy the condition it is watching for.

## Why this is a rule and not a list

A list of loops we have met would be stale in a month, and worse, it would imply
the listed ones are the only ones. The agent is not a finite state machine: it
can take an action no table here anticipated. The budget is the only bound that
covers those, which is precisely why it exists.

It does not prove loops cannot happen. It bounds what one costs: any loop, known
or not, hits a ceiling and fetches a person instead of running all night.
