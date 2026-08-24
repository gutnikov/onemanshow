## Purpose

Defines how a change travels from a pull request to production, and the invariants that make the journey verifiable at any moment from the tools alone.

## ADDED Requirements

### Requirement: Pull request validation
For every change under review the pipeline SHALL run `ship/check` and then build exactly one image. Building SHALL NOT begin until checking has passed, so that the cheapest verification fails first.

#### Scenario: Check fails
- **WHEN** `ship/check` returns non-zero
- **THEN** no image is built and the change is reported as failing at the check stage

#### Scenario: Check passes
- **WHEN** `ship/check` returns zero
- **THEN** the pipeline builds one image and tags it with the commit SHA under review

### Requirement: One immutable artifact per change
Each change SHALL produce exactly one image, tagged only with its commit SHA. The pipeline SHALL NOT create or move floating tags such as `latest`, `staging` or `prod`, because a floating tag makes it impossible to verify what is running.

#### Scenario: Determining what production runs
- **WHEN** an operator or agent asks which commit production is running
- **THEN** the answer is read from the tag of the deployed image and is a single unambiguous commit SHA

#### Scenario: An attempt to serve two artifacts
- **WHEN** a change would require more than one image to be deployed together
- **THEN** the pipeline rejects it, since promotion of a set cannot be verified with one comparison

### Requirement: Staging baseline is derived from production's commit
Before validating a change, the pipeline SHALL rebuild the staging data plane from scratch: destroy the staging data volume, start an empty database, then run `ship/migrate` and `ship/seed` at the commit production is currently running. It SHALL NOT restore a stored dump, and SHALL NOT seed directly at the commit under review.

#### Scenario: Staging is prepared
- **WHEN** staging preparation completes
- **THEN** staging holds synthetic data on the schema production is running, with no residue from any previous change

#### Scenario: The migration under review is exercised
- **WHEN** the change under review contains a schema migration and the change's image is deployed to staging
- **THEN** `ship/migrate` at the change's commit runs against the production schema, so the migration path itself is executed before it can reach production

### Requirement: Reset precedes every use of staging
The pipeline SHALL reset staging before each automated verification attempt and again before handing the environment to a human, so that neither ever observes the residue of a previous run.

#### Scenario: A verification attempt is retried
- **WHEN** `ship/e2e` failed and is attempted again on the same commit
- **THEN** staging is reset before the retry, so the retry does not run against the wreckage of the failed attempt

#### Scenario: Handover to a human
- **WHEN** automated verification has passed and the change is handed over for review
- **THEN** staging has been reset and seeded, so the reviewer sees predictable synthetic data rather than the by-products of the test run

### Requirement: Reset must not be able to reach production
The reset operation SHALL act only on a target whose identity marks it as the staging data plane, and SHALL refuse to act on any other target. Staging and production SHALL NOT share a database instance, so that resetting is the destruction of a separate volume rather than a command issued against a server that also serves production.

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

### Requirement: Production and the main branch agree
After a successful release the commit running in production SHALL equal the head of the main branch. Every commit reaching main SHALL have travelled the full pipeline; no commit, including documentation or bookkeeping, SHALL bypass it.

#### Scenario: Checking pipeline health
- **WHEN** the deployed image tag is compared with the head of main
- **THEN** they are equal whenever no release is in flight and no rollback is unresolved

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

#### Scenario: The previous version is healthy
- **WHEN** production is rolled back one step and verification passes
- **THEN** service is restored and the change that caused the incident is marked as requiring human attention

#### Scenario: The previous version also fails
- **WHEN** production is rolled back one step and verification still fails
- **THEN** the pipeline performs no further rollback and escalates to a human, because a schema change already applied cannot be undone by moving further back through images

#### Scenario: Automation does not fix its own fix
- **WHEN** the change being rolled back is itself a rollback
- **THEN** no further automatic rollback is generated and a human is required
