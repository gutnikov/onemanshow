# Event records

## Needs judgement — a person will want to bring the agent in

**A change is approved for development**

> #14 is approved for development. The segment is free, so nothing is blocking
> it — nobody has started it yet.

**Staging validation went red**

> #14 failed staging validation. The migration-safety run passed, so the
> migration did not break the application against production-shaped data; the
> end-to-end run failed on one test — `pricing shows the annual discount`. This
> is the first attempt, so no retry has happened yet.

Say which run failed. "Staging is red" makes the reader open the logs to learn
what the message could have told them.

**Production failed its smoke check**

> #14 deployed to production and the smoke check failed. Production was rolled
> back to the previous release, which is now serving and healthy. The revert has
> not been made yet, so production is behind main and nothing else can merge.

**The rolled-back version also failed**

> #14 was rolled back and the previous release fails too. No further rollback
> was attempted — the cause is outside the image, so stepping back again cannot
> reach it. Production is serving errors and this needs a person.

Say the rollback stopped deliberately. Otherwise it reads as a rollback that
failed, which invites someone to try again.

**A hotfix preempted the change in flight**

> A hotfix was declared. #14 is paused in staging and keeps its place; it will
> need re-validating afterwards, because the hotfix will move main underneath it.

## Recording only — no reply expected

**Validation passed, a person's turn**

> #14 is ready to look at: https://staging.example.com — check that the annual
> toggle shows the discounted figure. Both runs passed; smoke against the
> migrated baseline, then the full suite against fresh fixtures.

**Released**

> #14 is live. The observation window is open for thirty minutes. The monitor
> takes about twenty to declare an outage, so a green close means the smoke
> check passed and no new errors appeared — not that nothing can be wrong.

**Closed**

> #14 is closed. The window was green: smoke passed, no unresolved issues first
> seen in this release, and the monitor reported no downtime. Taking #15 next.

Name the sources. "Everything looks good" is the sentence that hides an
unconfigured check.

**Queued**

> #16 is approved but waiting — #14 is in staging waiting for your review. That
> review is the fastest way to move the queue.
