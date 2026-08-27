## Purpose

The instance's own address is repeated across its wiring, and a stale copy of it
does not fail — it quietly points at somewhere that still answers.

## ADDED Requirements

### Requirement: The instance's address has one authority, and the wiring is checked against it
An instance's own addresses SHALL be recorded in one place, and everything the pipeline reads SHALL be checked against that record rather than kept in step by hand.

This is not symmetry for its own sake. The address appears in the workflows that deploy, roll back, reconfigure, validate, watch liveness and retire the database — and the failure mode of a stale copy is not an error. Names that resolve keep resolving: a workflow left pointing at a previous address goes on deploying to it, or watching it, and reports success while doing something nobody asked for.

The check SHALL fail on disagreement, and SHALL name both values. A check that reports only "mismatch" leaves the reader to work out which one is stale, and the stale one is not always the older-looking one.

#### Scenario: An address changes
- **WHEN** an instance's address is changed in its record
- **THEN** a check reports every place in the wiring that still carries the previous one, before anything is deployed

#### Scenario: A previous address that still resolves
- **WHEN** a stale reference points at a name that still answers
- **THEN** the check fails anyway, because the pipeline succeeding against the wrong address is the failure being prevented

#### Scenario: An address deliberately different
- **WHEN** one part of the wiring must use a different address from the rest
- **THEN** that exception is recorded where the check reads it, with its reason, rather than being expressed as an unexplained difference
