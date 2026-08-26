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

**The window closes itself.** A schedule asks which changes are in `released`,
how long ago they got there, and what every configured source says; on green it
closes the ticket and takes up the queue head. So the usual case is that you
arrive after the fact, and your job is to read what it found rather than to
repeat it.

Two things about that schedule are worth knowing. It reports on runs where it
found nothing, so silence from it means it has stopped rather than that all is
well. And it is late: a ten-minute cron was observed firing about every
forty-five minutes on a quiet repository, because the scheduler deprioritises
them. Lateness is the cost; correctness is not affected, because the check is
derived rather than triggered.

If you are closing one by hand — no schedule, or it has stopped — then: close
the ticket as completed, run openspec's sync and archive, and **take the next
change from the queue**.

The archive is a documentation commit, and the release trigger ignores
documentation paths, so no release runs. That is not incidental. While the
trigger fired on every push, this closing step started a release that then
failed — the release promotes a validated image and refuses to build one, and
no image exists for a commit that never went through a pull request. So the
harm was never a bad deploy. It was a red release at the close of every change,
and production left unequal to main's tip, which trips the fourth merge guard
and blocks whatever comes next.

Both parts of that matter. A signal that is red every single time is a signal
nobody reads, and this pipeline once sat three commits behind production behind
exactly that. If you are working in a project whose trigger has no path filter,
fix the trigger before archiving — and if a release has already gone red on a
documentation commit, reconcile the guard before taking the next change rather
than after it is blocked. That last part is
easy to forget and its failure mode is the worst kind — everything looks healthy
while the queue silently stops.

The close is yours to make, not the person's. Asking them to confirm a green
window is asking for a rubber stamp, and rubber stamps train people to click
without looking.

## If a signal goes red

`blocked:rollback` and `playbooks/rollback.md`. A problem found after the ticket
closed is a new ticket, not a reopening — the release did ship, and what came
after is its own change.
