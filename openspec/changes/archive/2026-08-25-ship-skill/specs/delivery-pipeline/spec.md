## MODIFIED Requirements

### Requirement: Staging baseline is derived from production's commit
Before validating a change, the pipeline SHALL rebuild the staging data plane from scratch: destroy the staging data plane, start an empty database, then run `ship/migrate` and `ship/seed` at the commit production is currently running. It SHALL NOT restore a stored dump, and SHALL NOT seed directly at the commit under review.

The change's own migration SHALL then be applied **before** the image that requires it is deployed. Deploying first leaves a window in which the schema is behind the code, which readiness correctly refuses to call healthy — so the deploy fails its health check and the ordering, not the change, is at fault.

#### Scenario: Staging is prepared
- **WHEN** staging preparation completes
- **THEN** staging holds synthetic data on the schema production is running, with no residue from any previous change

#### Scenario: The migration under review is exercised
- **WHEN** the change under review contains a schema migration
- **THEN** `ship/migrate` at the change's commit runs against the production schema, so the migration path itself is executed before it can reach production

#### Scenario: A migration the previous code cannot work against
- **WHEN** a change's migration is not backward compatible with the running image
- **THEN** the migration is applied before the new image is deployed, so no deploy is attempted against a schema that is behind it

#### Scenario: The order is the same in both environments
- **WHEN** a change is released to production
- **THEN** the migration precedes the deploy there too, because two stages of one pipeline disagreeing about the order is a defect only a non-backward-compatible migration would reveal

### Requirement: Migration safety and feature correctness are verified separately
Validating a change on staging SHALL answer two questions in two runs, because one run cannot answer both. Against the baseline derived from production — production's schema and production's data with the change's migration applied on top — the pipeline SHALL run only the content-agnostic smoke set, because the data present is deliberately not the data the change's fixtures describe. It SHALL then reset, seed at the change's own commit, and run the full end-to-end suite.

Every step described as being at the change's commit SHALL execute code checked out at that commit. Resolving it to the default branch instead makes the second run self-consistent rather than correct: the seed writes the default branch's fixture and the suite asserts the default branch's expectation, the two agree, and the run reports green while the change under review was never exercised.

#### Scenario: A change alters the seed fixtures
- **WHEN** a change modifies the synthetic fixture data and is validated on staging
- **THEN** the migration-safety run uses the smoke set and passes even though the data present differs from the change's fixtures, and the end-to-end suite afterwards runs against data seeded at the change's own commit

#### Scenario: A migration breaks the application against existing data
- **WHEN** the change's migration is applied to production's data and the application can no longer serve its pages
- **THEN** the smoke set fails during the migration-safety run, before the end-to-end suite is reached

#### Scenario: A feature is wrong while its migration is safe
- **WHEN** the migration applies cleanly but the change's behaviour is wrong
- **THEN** the migration-safety run passes and the end-to-end suite fails

#### Scenario: A change that moves a fixture is actually exercised
- **WHEN** a change alters both the value `ship/seed` writes and the expectation the suite asserts
- **THEN** the stand serves the change's new value, so an arrangement that ran the default branch's code for both — reporting green while the stand still served the old value — SHALL fail instead

### Requirement: Production and the main branch agree
After a successful release the commit running in production SHALL equal the most recent commit on main that touched a **deployable** path. Commits that touch only documentation, planning artifacts or pipeline wiring SHALL NOT release.

This overturns the earlier requirement that no commit, including documentation or bookkeeping, may bypass the pipeline. That requirement was implemented faithfully and the result was worse than the rule it enforced: the archive commit that closes a change is pushed straight to main, so it released — building a new image from itself and deploying it to production with no staging validation, then reopening an observation window with nobody observing. The closing step of every change broke the invariant the rest of the pipeline exists to protect.

The alternative was to send the archive commit through a pull request and both staging runs. That costs a full validation cycle per change to rename a directory, and validates nothing, because the artifact it produces differs from the released one only in files the artifact does not contain.

What is given up is the exactness of the comparison: main's tip may now sit ahead of production with nothing wrong. The guard therefore reads the last deployable commit rather than the tip, and comparing against the tip would refuse every change that follows a documentation commit.

#### Scenario: Checking pipeline health
- **WHEN** the deployed image tag is compared with the most recent deployable commit on main
- **THEN** they are equal whenever no release is in flight and no rollback is unresolved

#### Scenario: The closing archive commit
- **WHEN** a change is archived after its observation window closes
- **THEN** no release runs, and production continues to run the artifact that was validated

#### Scenario: A change follows a documentation commit
- **WHEN** the next change's merge guards are checked and main's tip is a documentation commit
- **THEN** production matching the last deployable commit satisfies the guard, and the tip being ahead is not treated as an unresolved rollback
