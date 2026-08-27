## Purpose

The pipeline is built out of events, and events are not guaranteed. Every stage
it reaches by one needs a path a person can take when the event does not arrive.

## ADDED Requirements

### Requirement: Every stage reached by an event can also be reached by a person
A stage the pipeline enters in response to an event SHALL also be enterable by hand, in one command, by someone who has read nothing but the playbook.

This is not redundancy for its own sake. Event delivery is the code host's, not ours: on 2026-08-26 `pull_request` and `push` events went undelivered for over an hour while other kinds ran normally, and one `issues.labeled` event produced no run where re-applying the same label produced one within a second. A stage with no manual path is a stage where a change stops until the host recovers, and where a person cannot tell "busy" from "broken" from "never told".

A manual entry SHALL do the same work as the event-driven one and SHALL be subject to the same refusals. It is a second door into the same room, not a way past the guards.

Where a stage needs a fact the event payload would have carried, that fact SHALL be **derived** rather than passed in by hand where deriving is possible. Asking "which change is in this state?" is answerable because at most one occupies the segment; asking a person to retype a ticket number invites the wrong one.

#### Scenario: An event never arrives
- **WHEN** a change is waiting at a stage whose triggering event was not delivered
- **THEN** a person can enter that stage in one command, and the stage behaves exactly as it would have

#### Scenario: The manual path is not a way around a gate
- **WHEN** a stage is entered by hand for a change that has not passed the gate preceding it
- **THEN** it refuses for the same reason it would have refused an event-driven entry

#### Scenario: A stage that nobody would ever enter by hand
- **WHEN** a stage is driven entirely by an external system and has no meaning outside it
- **THEN** it may have no manual path, and the reason is written down rather than left as an omission

### Requirement: A change that deploys nothing still reaches the end of its lifecycle
A change whose commit touches no deployable path SHALL NOT release, and SHALL still be completed rather than left in the status that precedes a release.

The status that follows approval is moved by the release. A change with nothing to deploy has no release to move it, so without this it waits in `ready-to-release` for ever: it holds the segment, so the queue behind it stops, and every detector correctly reports it as stuck.

Such a change SHALL NOT be given an observation window. A window is time to watch production after a change, and production did not change; an open ticket would assert that something is under observation which nobody can observe.

#### Scenario: A wiring-only change is merged
- **WHEN** the merged commit touches only paths excluded from the deployable set
- **THEN** no release is dispatched, production keeps running the commit it was running, and the change is completed and closed with the reason stated

#### Scenario: The segment after such a change
- **WHEN** a change completes without deploying
- **THEN** the segment is free for the next change, without anybody having to notice and intervene
