# Stabilize

The change is in production and being watched. This stage ends in one of two
ways: closed as completed, or an incident.

## What the window actually asks

**Has production been healthy since this release was deployed?** Three sources
answer it, and each can be absent:

- the post-deploy smoke result
- unresolved issues first seen in *this release*, in the *production*
  environment
- the external liveness monitor

Ask about new issues in the release rather than an error rate. At the traffic an
indie product has, one error in three requests is a 33% rate and a quiet hour
proves nothing. "Did anything break that was not broken before" survives any
volume.

Filter by environment. Both environments run the same release, so without it an
error deliberately raised on staging reports production as unhealthy.

## Never read silence as health

A source that was not configured reports zero problems, exactly like a healthy
one. Say which sources you consulted, and name any that were unavailable.

**The monitor is slower than the window.** At a ten-minute interval with a
two-failure threshold, an outage takes about twenty minutes to be declared,
against a thirty-minute window. So an outage starting late in the window will not
be caught before it closes. Within-window confidence rests mostly on the smoke
check and on new issues; liveness catches the slower cases afterwards.

Do not describe a green window as proof that production is fine. It is the
absence of the signals we can see, in the time we allowed.

## Closing it

Green at the end of the window: close the ticket as completed, run openspec's
sync and archive, and **take the next change from the queue**. That last part is
easy to forget and its failure mode is the worst kind — everything looks healthy
while the queue silently stops.

The close is yours to make, not the person's. Asking them to confirm a green
window is asking for a rubber stamp, and rubber stamps train people to click
without looking.

## If a signal goes red

`blocked:rollback` and `playbooks/rollback.md`. A problem found after the ticket
closed is a new ticket, not a reopening — the release did ship, and what came
after is its own change.
