# delivery-pipeline Specification

## Purpose
Defines how a change travels from a pull request to production, and the invariants that make the journey verifiable at any moment from the tools alone.

## Requirements

### Requirement: Pull request validation
For every change under review the pipeline SHALL run `ship/check` and then build exactly one image. Building SHALL NOT begin until checking has passed, so that the cheapest verification fails first.

#### Scenario: Check fails
- **WHEN** `ship/check` returns non-zero
- **THEN** no image is built and the change is reported as failing at the check stage

#### Scenario: Check passes
- **WHEN** `ship/check` returns zero
- **THEN** the pipeline builds one image and tags it with the commit SHA under review

### Requirement: One immutable artifact per change
Each change SHALL be built exactly once. The built image SHALL be tagged with its commit SHA, and the pipeline SHALL NOT create or move floating tags of its own such as `latest`, `staging` or `prod`, because a floating tag makes it impossible to verify what is running. A deployment tool may create such a tag locally on the machine as a side effect; the requirement governs what the pipeline produces and publishes.

Where a deployment tool requires per-destination metadata in the image, the pipeline MAY publish a destination-labelled derivative of the built image. Such a derivative SHALL share every layer with the image that was built, differing only in metadata, and the promotion check SHALL then compare layer digests rather than the image digest.

#### Scenario: Determining what production runs
- **WHEN** an operator or agent asks which commit production is running
- **THEN** the answer is read from the tag of the deployed image and is a single unambiguous commit SHA

#### Scenario: An attempt to serve two artifacts
- **WHEN** a change would require more than one image to be deployed together
- **THEN** the pipeline rejects it, since promotion of a set cannot be verified with one comparison

#### Scenario: A destination-labelled derivative is published
- **WHEN** a derivative image is published so that a destination's deployment tool will accept it
- **THEN** its layer digests are identical to those of the image that was built and validated, and a differing layer fails the promotion check

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

### Requirement: Reset precedes every use of staging
The pipeline SHALL reset staging before each automated verification attempt and again before handing the environment to a human, so that neither ever observes the residue of a previous run. Since validation comprises two runs with different data, staging is reset three times in a normal pass: for the baseline, between the two runs, and for the handover.

#### Scenario: A verification attempt is retried
- **WHEN** `ship/e2e` failed and is attempted again on the same commit
- **THEN** staging is reset before the retry, so the retry does not run against the wreckage of the failed attempt

#### Scenario: Between the two verification runs
- **WHEN** the migration-safety run has finished and the end-to-end suite is about to start
- **THEN** staging is reset and seeded at the change's own commit, so the suite sees the fixtures it was written against rather than production's data

#### Scenario: Handover to a human
- **WHEN** automated verification has passed and the change is handed over for review
- **THEN** staging has been reset and seeded, so the reviewer sees predictable synthetic data rather than the by-products of the test run

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

### Requirement: Reset must not be able to reach production
The reset operation SHALL act only on a target whose identity marks it as the staging data plane, and SHALL refuse to act on any other target. Staging and production SHALL NOT share a database instance or a storage volume, so that resetting is the destruction of a separate volume rather than a command issued against a server that also serves production.

Separation of storage is what this requirement guarantees. It does NOT guarantee network unreachability: where both environments run on one machine they may share a container network, in which case one environment can open a TCP connection to the other's database and is stopped only by not holding its credentials. Each environment SHALL therefore have its own database credentials, and the weaker guarantee SHALL be stated wherever the stronger one might be assumed.

#### Scenario: One environment reaches for the other's database
- **WHEN** a process in the staging environment opens a connection to the production database on a shared machine
- **THEN** the connection may be established at the transport level but authentication fails, because the environments hold distinct credentials

#### Scenario: Reset confirms it destroyed something
- **WHEN** the reset operation completes
- **THEN** it has verified that the data it was meant to destroy is gone, because a destructive step that cannot confirm its effect is indistinguishable from one that did nothing

#### Scenario: Reset discovers where the data lives
- **WHEN** the reset operation runs
- **THEN** it determines the storage location from the running environment rather than assuming a storage shape, and refuses if the location it finds does not identify itself as staging

#### Scenario: Reset is pointed at a non-staging target
- **WHEN** the reset operation is invoked with a target that does not match the staging identity
- **THEN** it refuses and performs no destructive action

### Requirement: Every environment is reachable at its own host name
Each environment SHALL be reachable at a host name distinct from every other environment's, because a single machine hosting several environments distinguishes them by the requested host. A bare IP address SHALL NOT be used as an environment's address, since it cannot distinguish environments and cannot carry a certificate.

#### Scenario: A domain is configured
- **WHEN** a project has a domain
- **THEN** production answers on that domain and staging answers on a distinct subdomain of it, each over TLS

#### Scenario: No domain is configured
- **WHEN** a project has no domain
- **THEN** each environment is still addressed by a host name derived from the machine's IP address, distinct per environment and capable of carrying a certificate, rather than by the bare IP

#### Scenario: Two environments on one machine
- **WHEN** requests for the production and the staging host names arrive at the same machine
- **THEN** each is routed to its own environment, and neither can be reached through the other's host name

### Requirement: Production is released by promotion
Production SHALL receive the exact image that passed staging validation. The pipeline SHALL NOT rebuild an image for production.

#### Scenario: Release
- **WHEN** a change is released
- **THEN** the image already validated on staging is deployed to production unchanged, and its tag equals the commit being released

#### Scenario: The artifact is unavailable
- **WHEN** the validated image cannot be retrieved at release time
- **THEN** the release fails rather than rebuilding, because a rebuilt image is not the artifact that was verified

### Requirement: Merging must preserve the validated commit
The commit that reaches the main branch SHALL be the same commit that was built and validated, so merging SHALL be a fast-forward. A merge that produces a new commit - a merge commit, a squash, or a rebase - discards the identity the promoted artifact was built against, leaving nothing to promote without rebuilding.

This is why a branch must be up to date with main before merging: up to date plus fast-forward means the validated commit becomes main's head unchanged.

#### Scenario: The branch is up to date
- **WHEN** an approved change whose branch is up to date with main is merged
- **THEN** main's new head is the commit that was validated, and the artifact built for it is the one promoted

#### Scenario: The merge would create a new commit
- **WHEN** merging would produce a commit that was never built or validated
- **THEN** the merge is refused, because promoting would require rebuilding and rebuilding produces an artifact nobody verified

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

### Requirement: Post-deploy verification
Immediately after deploying to production the pipeline SHALL run `ship/smoke` against production and SHALL treat its failure as a production incident.

#### Scenario: Smoke passes
- **WHEN** `ship/smoke` returns zero after a production deploy
- **THEN** the release is recorded as deployed and the observation period begins

#### Scenario: Smoke fails
- **WHEN** `ship/smoke` returns non-zero after a production deploy
- **THEN** the pipeline rolls production back and reports an incident

### Requirement: Rollback is bounded to one step
Rolling back SHALL return production to the immediately preceding image and SHALL NOT continue stepping backwards. If the rolled-back state also fails verification, the pipeline SHALL stop and require human involvement.

Stepping back an image restores the artifact and nothing else. Configuration is supplied at deploy time from the repository, so a rollback boots the previous image against the *current* configuration - which means a fault that lives in configuration survives the rollback. Restoring configuration requires a revert that travels the pipeline, which is the second step of a rollback and not merely bookkeeping.

#### Scenario: The previous version is healthy
- **WHEN** production is rolled back one step and verification passes
- **THEN** service is restored and the change that caused the incident is marked as requiring human attention

#### Scenario: The fault lives in configuration
- **WHEN** a change breaks production through configuration rather than code and production is rolled back one step
- **THEN** the previous image runs against the same configuration and still fails, and the pipeline stops rather than stepping back further - the remedy is a revert through the pipeline, which restores the configuration

#### Scenario: The previous version also fails
- **WHEN** production is rolled back one step and verification still fails
- **THEN** the pipeline performs no further rollback and escalates to a human, because a schema change already applied cannot be undone by moving further back through images

#### Scenario: Automation does not fix its own fix
- **WHEN** the change being rolled back is itself a rollback
- **THEN** no further automatic rollback is generated and a human is required
