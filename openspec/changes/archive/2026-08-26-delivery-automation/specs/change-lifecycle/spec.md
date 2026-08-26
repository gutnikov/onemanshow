## MODIFIED Requirements

### Requirement: One change occupies the segment
At most one change SHALL be active across `dev`, `staging`, `ready-to-release` and `released` together. `draft` SHALL be outside this limit, so ideas may accumulate, and `ready-for-dev` SHALL be the queue that the limit creates.

When the segment frees, automation SHALL take up the head of the queue. This is stated as automation's duty rather than the skill's because the skill only acts when something invokes it, and nothing invokes it when work merely finishes.

#### Scenario: A second change is ready while one is in flight
- **WHEN** a change is approved for development while another occupies the segment
- **THEN** it waits in `ready-for-dev`, and the skill says so plainly rather than appearing to have stalled

#### Scenario: The segment frees
- **WHEN** the active change closes and the segment becomes empty
- **THEN** automation takes up the head of the queue, because a queue that needs poking is a queue that silently stops

#### Scenario: The segment frees and the queue is empty
- **WHEN** the active change closes and nothing is waiting
- **THEN** that is recorded as an empty queue rather than left silent, so a stopped queue and an idle one are distinguishable

### Requirement: Closing is not fired by the merge
Closing SHALL be a decision taken when the observation window ends, never a side effect of merging. Pull requests SHALL reference their ticket without the code host's closing keyword, because that keyword closes the ticket the moment the merge lands.

The window is the interval in which a change is `released` and not yet closed. Closing at merge removes the interval: for its whole duration the ticket reads completed, and a window that then goes red has already been recorded as a success.

Automation SHALL close the ticket at the end of the window, having consulted every configured health source, and SHALL name any source that was unavailable. A source that is absent reports no problems in exactly the way a healthy one does.

#### Scenario: A change is merged and released
- **WHEN** the merge lands and the release deploys
- **THEN** the ticket remains open in `released` until the window ends, so its open state is what marks the change as still under observation

#### Scenario: The window goes red
- **WHEN** a signal goes red before the window ends
- **THEN** the ticket has not yet been closed, so the failure is handled as an incident on a live change rather than as a new problem after a completed one

#### Scenario: A health source is not configured
- **WHEN** the window ends in a project with no external liveness monitor
- **THEN** the change is closed on the sources that exist and the absent one is named, rather than its silence being counted as health
