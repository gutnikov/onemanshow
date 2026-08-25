## Context

The pipeline and the skill both exist and both work; see `openspec/specs/`. What
is missing is the layer between them. Today a person carries every transition
from one to the other, including the ones the lifecycle assigns to automation,
and the two rules meant to bound the system are enforced by nobody.

One measurement from the run of 2026-08-25 constrains everything here, so it
comes first rather than appearing as a risk. The archived design's wake
mechanism — automation writes into the thread, the assistant's own integration
answers — **does not work**. A real mention authored by an application went
unanswered for three minutes; the same text typed by a person was answered at
once; a webhook and a bot token behaved identically. Authorship is the
discriminator, and it is not something this project can change.

What survives is more useful than it looks: application-authored messages **are
visible** to the agent when it next reads the thread.

## Goals / Non-Goals

**Goals:**
- Every transition the lifecycle does not reserve for a person happens without one.
- The six merge guards and the repetition budget are enforced by something that can refuse.
- The observation window closes itself, and the queue head is taken up when the segment frees.
- No addition to the monthly bill.

**Non-Goals:**
- Autonomy across the two human gates. They are the design, not a limitation to erode.
- Approving by emoji reaction. It needs a service this change deliberately avoids.
- Interpreting failures automatically. A red staging run is a flake, a broken test or a real bug, and choosing between them is the agent's work with a person present.

## Decisions

**Automation notifies; it never invokes.** Forced by the measurement above, and
better than the alternatives on their own terms.

*Posting with a user token* so the message appears to come from the founder was
the archived fallback. Rejected: it makes every automated message
indistinguishable from something the person said, in the one record the system
keeps of who decided what. The thread's value is that it attributes decisions;
impersonation trades that away for convenience. It is also still untested.

*A headless agent run in a workflow* for the judgment events was the second
fallback. Rejected for now: an agent invoked with nobody present is exactly the
situation the repetition budget exists to bound, so it would be built together
with its own enforcement or not at all. Worth revisiting once the budget is
counted, which this change does.

**No workflow-automation service.** The archived design named one for four
events. The window timer is a scheduled workflow; the external liveness signal
is an inbound dispatch; budget accounting is derived state read at the moment it
matters. Only emoji reactions genuinely need a service, and this project runs
production, staging and a database on one small machine — adding an always-on
process that must itself be watched, to save typing a word, is the wrong trade
at this budget. It becomes a later optional change, and its scope is honest:
reactions, nothing else.

**The merge is where the guards live.** Automation performs the merge, so it is
the only place a guard can refuse rather than be recited. A label moving to
`ready-to-release` triggers it; it reads all six from the tools and either
fast-forwards or reports which one failed. Preferred over a scheduled poller,
which would add minutes of delay to the one transition a person is waiting on.

**The window is derived, not held.** A scheduled run looks for changes in
`released` whose release time is further back than the configured window and
whose sources are green. Nothing has to stay alive, a missed run costs lateness
rather than a stuck change, and two runs racing find the work already done.

**The budget counts automatic actions, not agent invocations.** Discovered while
writing this: with nothing invoking the agent, a budget on invocations counts
zero of something and can never be exceeded. It would have read as satisfied
forever — the same shape as the checks this project has been finding all along.
So it bounds unattended repetition of any kind, and the counter lives with the
actor that repeats.

## Risks / Trade-offs

**A person is now required in the incident path.** Automation can roll back —
bounded to one step — but interpreting what happened waits for a person. Slower
than the archived design intended. Accepted because the rollback itself is the
time-critical part and it stays automatic, and because "once, then a person" was
already the rule for destructive actions.

**Notification fatigue turns into missed events.** The thread accumulates
records nobody reads, and the one that mattered scrolls past. Mitigation:
automation distinguishes what needs a person from what is merely progress, and
only the former notifies.

**A guard enforced in one place can be bypassed by pushing to main directly.**
Nothing here prevents that, and the project's own history is mostly direct
pushes. Mitigation: branch protection, which is configuration rather than code
and therefore recorded in bootstrap rather than assumed.

**The scheduled window run is a source that can silently stop.** A disabled or
failing schedule leaves changes open in `released` forever, and an open ticket
looks like ordinary work in progress. Mitigation: the same run reports when it
finds nothing to do, so silence from it is distinguishable from health.

## Migration Plan

Additive. Each event becomes a workflow that can be added independently, and
each is idempotent because state is derived — so a partly-built reactive layer
behaves like a slower one, not a broken one. Nothing needs to be turned off
first, and a person doing a transition by hand while its workflow exists finds
the work already done rather than done twice.

Roll back by disabling a workflow. The transition returns to being carried by a
person, which is where it is today.

## Open Questions

- The numbers: how many automatic actions a change gets, and how long the window
  should be for a project with real users rather than a testbed. Both want
  observation rather than a guess, and neither changes the shape of the work.
