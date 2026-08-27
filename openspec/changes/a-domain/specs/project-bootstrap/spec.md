## Purpose

Renaming an environment in one step stops serving the old name at the moment it
deploys, while everything that asks about the environment still uses it.

## ADDED Requirements

### Requirement: An environment is renamed in two steps, serving both names in between
Changing the address an environment answers on SHALL be done in two changes: first the proxy learns the new name **while keeping the old one**, then the references the pipeline uses are moved.

One step does not work, and the reason is not caution. The proxy routes by host header and refuses a name it was not told about, and its configured host is a single value — so the deploy that introduces the new name is the same deploy that stops answering for the old one. Every health URL, guard and probe in the pipeline is still asking for the old name at that moment, and they fail together, including the guard that refuses a merge when production cannot say what it runs.

Between the two changes both names SHALL answer, and that SHALL be verified by asking each name **which certificate it is served** rather than whether a page loads. A page that loads proves the old certificate still works, which was never in question.

The second change SHALL move the external monitor last, because it lives outside the repository and cannot change in the same commit. Pausing it instead SHALL NOT be used as a holding action: a paused monitor is not an active one, and a liveness declaration with no active monitor is reported as stale, which closes the next observation window unhealthy.

#### Scenario: The proxy learns the new name
- **WHEN** the first change deploys
- **THEN** both names answer, each with a certificate naming itself, and nothing in the pipeline has been asked to use the new one yet

#### Scenario: A rename attempted in one step
- **WHEN** the address is swapped in a single change
- **THEN** the old name stops being served at the deploy, and the guards and checks that still reference it fail together

#### Scenario: The monitor during the move
- **WHEN** the external monitor is repointed before the new name is served
- **THEN** it reports the environment down, and the holding action is to point it back rather than to pause it
