# change-lifecycle Specification

## Purpose
Defines the states a change occupies between an idea and a closed ticket, what may move it between them, and which moves a person must make — so that at any moment the state can be read from the tools rather than remembered.

## Requirements

### Requirement: State is derived, never stored
The skill SHALL determine a change's current state by querying the tools that hold it, and SHALL NOT keep its own record of where a change has got to. Every transition SHALL therefore be idempotent: performing one that has already happened SHALL be a no-op rather than an error.

#### Scenario: Invoked halfway through
- **WHEN** the skill is invoked on a change that is already part-way through its life
- **THEN** it establishes the current stage from the tools and continues from there, without needing to have been present earlier

#### Scenario: Two actors reach the same transition
- **WHEN** automation and the skill both act on the same transition
- **THEN** whichever arrives first performs it and the other finds nothing to do

### Requirement: The statuses of an open change
An open change SHALL be in exactly one of: `draft`, `ready-for-dev`, `dev`, `staging`, `blocked`, `ready-to-release`, `released`. Closing SHALL be recorded on a separate axis with two reasons — completed, and not planned — rather than as further statuses.

#### Scenario: Reading a change's state
- **WHEN** the state of a change is read
- **THEN** exactly one status applies, and whether it is closed is a separate fact from which status it holds

### Requirement: Flags layer over status
`hotfix` and `paused` SHALL be recorded alongside a status rather than as values of it, because a preempted change must resume in the exact status it was interrupted in.

#### Scenario: A preempted change resumes
- **WHEN** a change flagged `paused` is resumed
- **THEN** it returns to the status it held when it was paused, which a status value could not have preserved

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

### Requirement: Two gates need a person
Moving from `draft` to `ready-for-dev`, and approving at the end of `staging`, SHALL require a human decision. Every other transition MAY be performed by automation or by the skill.

#### Scenario: A change waits for a decision that is not the agent's
- **WHEN** a change reaches either gate
- **THEN** the skill stops and asks, rather than deciding on the human's behalf

### Requirement: Blocked always holds up the segment
`blocked` SHALL be reachable only from the exclusive segment, and SHALL always return to `dev`. Its cause SHALL be recorded in a machine-readable form alongside a human explanation, because the same status is reached for reasons that need different work.

#### Scenario: Resuming a blocked change
- **WHEN** the skill picks up a blocked change
- **THEN** it reads the recorded cause and chooses the corresponding course of action, rather than inferring it from prose

#### Scenario: A blocked change cannot be quietly ignored
- **WHEN** a change is blocked
- **THEN** it is holding the segment, so nothing else can proceed until it is dealt with

### Requirement: A hotfix overtakes the queue without skipping stages
A change declared a hotfix SHALL be allowed onto an occupied segment, pausing the change already there. It SHALL pass through the same stages as any other change. Only a person SHALL declare a hotfix, and a hotfix SHALL NOT preempt a hotfix.

#### Scenario: Production needs a fix while the segment is occupied
- **WHEN** a person declares a hotfix while another change holds the segment
- **THEN** the occupying change is paused where it stands and the hotfix proceeds through every stage

#### Scenario: The agent judges something urgent
- **WHEN** the agent believes a change is urgent
- **THEN** it may say so but SHALL NOT declare a hotfix, or the exceptional path becomes the ordinary one

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
