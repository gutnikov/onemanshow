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
The pipeline SHALL give staging a database with no residue before each automated verification attempt and again before handing the environment to a human, so that neither ever observes the by-products of a previous run. Since validation comprises two runs with different data, staging is given a clean database three times in a normal pass: for the baseline, between the two runs, and for the handover.

Where the provider supports it, this SHALL be done by creating a database rather than by emptying one. Creating leaves nothing to verify: a database that has just been created cannot contain residue, whereas emptying one requires proving that the emptying happened — and the code that proved it here removed a named volume while the data lived in a bind mount, so for an entire run it destroyed nothing and reported success.

The data SHALL remain synthetic. A provider's branch of production would be cheaper and would put real user data where a browser and a test suite can reach it; the seeded fixture is chosen deliberately over that.

#### Scenario: A verification attempt is retried
- **WHEN** `ship/e2e` failed and is attempted again on the same commit
- **THEN** staging has a fresh database before the retry, so the retry does not run against the wreckage of the failed attempt

#### Scenario: Between the two verification runs
- **WHEN** the migration-safety run has finished and the end-to-end suite is about to start
- **THEN** staging is given a clean database and seeded at the change's own commit, so the suite sees the fixtures it was written against

#### Scenario: Handover to a human
- **WHEN** automated verification has passed and the change is handed over for review
- **THEN** staging holds freshly seeded synthetic data, so the reviewer sees predictable values rather than the by-products of the test run

#### Scenario: The clean database is created rather than emptied
- **WHEN** staging is prepared
- **THEN** a database is created for this validation, so there is no emptying to confirm and no residue that could survive it

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

The merge SHALL be performed by automation, and automation SHALL refuse it unless all six guards hold: approval recorded; the pipeline green on the commit being merged; the branch a fast-forward from main; production equal to the last deployable commit on main; no other change in `released` with an open window; no active incident. All six are readable from the tools, and reading them is not the same as checking them — until the merge is performed by something that refuses, they are advice to whoever merges.

The guard for a green pipeline SHALL be checked against the commit that was validated, not against the commit a run reports. A validation run started by dispatch reports the branch it was dispatched from, so a run's own commit is not evidence about the change.

#### Scenario: The branch is up to date
- **WHEN** an approved change whose branch is up to date with main is merged
- **THEN** main's new head is the commit that was validated, and the artifact built for it is the one promoted

#### Scenario: The merge would create a new commit
- **WHEN** merging would produce a commit that was never built or validated
- **THEN** the merge is refused, because promoting would require rebuilding and rebuilding produces an artifact nobody verified

#### Scenario: A guard does not hold
- **WHEN** a change is approved but production is behind the last deployable commit on main
- **THEN** automation refuses the merge and says which guard failed, rather than merging and leaving an unresolved rollback buried

#### Scenario: A run is mistaken for evidence
- **WHEN** the green-pipeline guard is evaluated for a change whose validation was dispatched
- **THEN** the sha the run was given is what is checked, and the branch the run reports as its own commit is not accepted in its place

### Requirement: Production and the main branch agree
After a successful release the commit running in production SHALL equal the most recent commit on main that touched a **deployable** path. Commits that touch only documentation, planning artifacts, pipeline wiring, project configuration or provisioning scripts SHALL NOT release.

This corrects an overstatement in the previous version of this requirement, which said that releasing on a documentation commit deployed an unvalidated image to production. It does not, and cannot: the release promotes a pre-validated artifact and refuses to build one, so a commit that never went through a pull request has no image and the release **fails** at the promotion check. What actually happens is a red release on every close, and production left unequal to main's tip — which then trips this very guard and blocks the next change until someone reconciles it by hand.

That is still worth preventing, and for a reason the overstatement obscured: a release that is red every time a change closes is red as a matter of routine, and routine red is not read. The pipeline's own history contains a stretch where production sat three commits behind main behind exactly this signal.

The set of ignored paths SHALL be expressed as an exclusion list rather than a list of deployable paths, because the two constructions fail differently. A path missing from an exclusion list produces a release that fails loudly at promotion. A path missing from a list of deployable paths produces a real change that never deploys, while this guard — computing the last deployable commit from the same list — reports agreement. One failure announces itself; the other is silent and satisfies the check meant to catch it.

#### Scenario: Checking pipeline health
- **WHEN** the deployed image tag is compared with the most recent deployable commit on main
- **THEN** they are equal whenever no release is in flight and no rollback is unresolved

#### Scenario: The closing archive commit
- **WHEN** a change is archived after its observation window closes
- **THEN** no release runs, and production continues to run the artifact that was validated

#### Scenario: A change follows a documentation commit
- **WHEN** the next change's merge guards are checked and main's tip is a documentation commit
- **THEN** production matching the last deployable commit satisfies the guard, and the tip being ahead is not treated as an unresolved rollback

#### Scenario: A non-deployable path was not excluded
- **WHEN** a commit touching only project configuration is pushed and the exclusion list does not cover it
- **THEN** the release fails at the promotion check because no validated image exists for that commit, rather than an image being built for it

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

### Requirement: Recovery covers two different losses
The project SHALL hold two independent means of recovery, because the two failures they answer are not substitutes.

The **provider's** point-in-time recovery answers "the wrong statement ran": it is fast, fine-grained, and its retention is whatever the plan gives. It does not answer the loss of the provider account itself.

An **exported dump** answers "an account is gone". It is coarse and slow and it survives what nothing else survives. It SHALL be written outside the accounts that hold the repository and the database, and the residual loss it does not cover SHALL be named rather than left to be assumed covered.

Neither SHALL be presented as covering the other. A single mechanism SHALL NOT be described as "the backup" when the failure it cannot address is the one that ends the project.

Four properties are required of the dump, and each of them exists because its absence has a specific failure:

- **Encrypted to the project's own recipients**, and **verified by content**. A plaintext dump of production sitting where the application is served is worse than no dump. Checking that a file still parses is not checking that it is encrypted; that mistake has already been made here, and the dump it produced was reported as encrypted while it was not.
- **A retention limit, enforced when writing.** Backups that fill a disk are a common cause of outage, and here it would be a copy that exists to survive a failure causing one. On a small machine this is not theoretical.
- **Unreadable by the application.** Otherwise a flaw in the application yields the whole history of the database rather than its current state.
- **Reported on every run, including runs with nothing to say.** A backup that has silently stopped is indistinguishable from one that is working.

#### Scenario: The dump lives on the machine that serves the application
- **WHEN** the dump is stored on the host that runs production, and the database is managed elsewhere
- **THEN** the arrangement satisfies this requirement for the two losses it covers, and the loss it does not cover — the host's own provider — is stated, because destroying the data would then require two unrelated providers failing at once while the host itself is the cheap thing to rebuild

#### Scenario: A statement destroyed data
- **WHEN** data is lost to a mistake and the loss is recent
- **THEN** the provider's recovery restores it, without the coarse dump being involved

#### Scenario: The provider account is lost
- **WHEN** access to the database provider is gone
- **THEN** the exported dump is reachable from an unrelated account and is what the project is rebuilt from

#### Scenario: The two live in one account
- **WHEN** the dump is written to the same account that holds the repository and the deploy credentials
- **THEN** that arrangement does not satisfy this requirement, because one loss takes both

#### Scenario: The dump is checked
- **WHEN** an export completes
- **THEN** its content is inspected for what it should and should not contain, rather than the job's exit status being taken as proof

### Requirement: Staging cannot reach production
Staging and production SHALL NOT share a database instance, so that preparing one is an operation on the other's peer rather than a destructive command against something that also serves production.

**The boundary is credentials and a named target, not the network, and that SHALL be stated rather than implied.** A managed provider's endpoints are publicly resolvable and accept connections from anywhere: production's database host was reached over TCP from an unrelated machine while this was being written. Nothing about moving off a shared host produced network isolation, and a requirement that implied otherwise would be believed.

What the arrangement does give: each environment holds only its own credentials, so a process in one cannot authenticate to the other's database; and the operations that create and empty staging are scoped to a project identifier that comes from configuration rather than from anything derived at run time, so production's is not a value they could arrive at.

The credential used for those operations SHALL be as narrow as the provider allows. Where it is account-wide — able to see and delete every project rather than the one it is for — that breadth SHALL be recorded as a weakness rather than left unexamined, because it is the one thing that could name production's database by mistake.

#### Scenario: Staging is prepared
- **WHEN** the pipeline prepares staging
- **THEN** it acts on the project named in configuration, and production's project is not a value it computes

#### Scenario: One environment reaches for the other's database
- **WHEN** a process in the staging environment attempts to connect to production's database
- **THEN** the connection is established at the transport level, because the endpoint is public, and authentication fails because it holds no credentials for it

#### Scenario: Someone assumes the environments are network-isolated
- **WHEN** an argument depends on staging being unable to reach production's database at all
- **THEN** that argument is unsound, and the reachability is a fact of the provider rather than something this pipeline can change on the plans it targets

#### Scenario: Preparation is pointed at a target that is not staging
- **WHEN** the preparation step is given a target that does not identify itself as staging
- **THEN** it refuses and performs no destructive action
