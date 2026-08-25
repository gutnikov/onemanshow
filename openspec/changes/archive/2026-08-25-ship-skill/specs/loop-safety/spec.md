## Purpose

Bounds what repeated automated action can cost, in a way that also covers the repetitions nobody anticipated — because the agent is not a finite state machine and cannot be reasoned about by enumeration alone.

## ADDED Requirements

### Requirement: Cheap repetition is bounded by a budget
Each change SHALL have a finite budget of automatic agent invocations. Exhausting it SHALL move the change to `blocked` rather than continuing. Any human action on the change SHALL replenish the budget, because a loop is by definition unattended repetition — if a person is answering, the system is working rather than spinning.

#### Scenario: An unattended loop
- **WHEN** automation repeatedly invokes the agent on a change with no human involvement
- **THEN** the budget runs out within a bounded number of invocations and a person is asked, rather than the loop continuing overnight

#### Scenario: A genuinely iterative change
- **WHEN** a person is replying and reviewing as a change goes back and forth
- **THEN** the budget does not run out, because their involvement refills it

#### Scenario: The count is derived
- **WHEN** the remaining budget is determined
- **THEN** it is counted from what the tools already record, not from a number the skill keeps

### Requirement: Destructive repetition is bounded by one
An action whose every repetition causes harm SHALL be limited to a single attempt, after which a person SHALL be required. A budget SHALL NOT be used for such actions, because bounding them at a count still permits the damage that count allows.

#### Scenario: Rolling back does not help
- **WHEN** production is rolled back once and still fails verification
- **THEN** no further rollback is attempted and a person is asked, because the cause lies outside the artifact and stepping back again cannot reach it

#### Scenario: Automation is asked to fix its own fix
- **WHEN** the change that would be reverted is itself a revert
- **THEN** the operation is refused

### Requirement: New actions are classified before they are added
Every automated action added to the system SHALL be classified by what repeating it a hundred times would cost. Cheap actions fall under the budget; expensive ones need an explicit limit and a route to `blocked`. This rule SHALL be recorded in preference to a list of known loops, which goes stale.

#### Scenario: An action that exhausts something external
- **WHEN** an action consumes a finite external allowance, such as a monthly quota
- **THEN** it counts as expensive even though it destroys nothing, because exhausting the allowance removes the ability to see

### Requirement: An actor does not consume what it produces
Automation SHALL NOT react to events it emits itself, and the agent SHALL NOT be invoked by its own output.

#### Scenario: A message is misread as a decision
- **WHEN** automation watches a channel that it also writes to
- **THEN** its own writes cannot satisfy the condition it is watching for
