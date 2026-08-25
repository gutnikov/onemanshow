# grill Specification

## Purpose
The examination a proposal passes before it may occupy the development slot — the most expensive resource in the system, since only one change holds it at a time.

## Requirements

### Requirement: The structure is mandatory, the answers are proportional
A proposal SHALL answer every item of the examination before it may leave `draft`. An answer of "not applicable" SHALL be legal and sufficient for any item except revertability, so that a trivial change clears the whole examination in a sentence while nothing can be skipped for being late at night.

#### Scenario: A one-line change
- **WHEN** a change amounts to correcting a word
- **THEN** the examination is answered in a line or two and the change proceeds, because the form is cheap to satisfy when there is little to say

#### Scenario: An item is left unanswered
- **WHEN** any item has no answer at all
- **THEN** the change does not leave `draft`

### Requirement: Revertability never scales down
The examination SHALL always establish whether the change can be undone by reverting it, and "not applicable" SHALL NOT be accepted for that item. Where the answer is no, the change SHALL carry the manual steps recovery would need.

#### Scenario: A small change that cannot be undone
- **WHEN** a one-line change drops a column, performs an irreversible data transformation, or calls an external service with a lasting effect
- **THEN** it is identified as unrevertable before it occupies the slot, because size does not predict reversibility

#### Scenario: A large change that reverts cleanly
- **WHEN** a change touches a great deal of code but only code
- **THEN** it is recorded as revertable, and its size does not by itself demand more examination

### Requirement: The critic is not the author
The examination SHALL be conducted by a subagent that sees the proposal without having seen it written, and its role SHALL be to challenge cheap answers rather than collect them.

#### Scenario: The proposal asserts it is safe to revert
- **WHEN** a proposal claims revertability without saying why
- **THEN** the claim is challenged rather than accepted

### Requirement: What the examination produces is the proposal
The answers SHALL become part of the change's own proposal rather than a separate record, so that the person deciding whether to develop it reads the examination as part of reading the change.

#### Scenario: A person considers taking a change into development
- **WHEN** they open the proposal
- **THEN** the examination's answers are there, and no second document has to be found
