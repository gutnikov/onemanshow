# Ready for dev

A person decided this is worth doing. Your job is to start it — or to say clearly
why you cannot yet.

## Check the segment first

Count open tickets in `dev`, `staging`, `ready-to-release` or `released`, not
counting any flagged `paused`. If that count is not zero, this change waits.

**Say the position out loud.** "Your change is third in the queue; #12 is in
staging waiting for your review." A change that is third in line looks exactly
like a change nobody picked up, and the difference is the whole reason the
person trusts the system.

If you are the reason the segment is busy — a change of yours is sitting in
`staging` waiting for their approval — say that too. It is usually the fastest
thing they can unblock.

## Check the prerequisite

If the ticket references another that is still open, say which. Then proceed if
they want to: sometimes the order does not actually matter, and refusing would
be presumptuous. Warn, do not block.

## Then take it

Move the status to `dev` and continue into `playbooks/05-dev.md`. Do not stop
here to announce that you are starting; the note at the end of `dev` covers it.
