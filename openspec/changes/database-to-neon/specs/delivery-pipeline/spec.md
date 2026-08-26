## ADDED Requirements

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
Staging and production SHALL NOT share a database instance. The boundary between them SHALL be the provider's, not a password: preparing staging SHALL be an operation on a separate database that cannot name production's.

Each environment SHALL hold only its own credentials regardless, because two boundaries are not more expensive than one.

Where a project still runs both environments on one machine, it has the weaker guarantee that the removed requirement described — separation of storage without separation of reach — and that SHALL be stated wherever the stronger one might be assumed.

#### Scenario: Staging is prepared
- **WHEN** the pipeline prepares staging
- **THEN** it acts on staging's own database, and production's is not something it could name by accident

#### Scenario: One environment reaches for the other's database
- **WHEN** a process in the staging environment attempts to connect to production's database
- **THEN** it holds no credentials for it, and on a managed provider it is also not on a network that reaches it

#### Scenario: Preparation is pointed at a target that is not staging
- **WHEN** the preparation step is given a target that does not identify itself as staging
- **THEN** it refuses and performs no destructive action

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Reset must not be able to reach production
**Reason**: It described the guarantees of a destructive operation that no longer exists. Its substance was that a reset must confirm it destroyed something, must discover where the data lives rather than assume a storage shape, and must refuse a target that is not staging — three obligations that only make sense when preparing staging means emptying a database in place.

Staging is now prepared by creating a database. There is nothing to confirm destroyed, no storage shape to discover, and no volume to point at by mistake. Keeping the requirement would mean keeping scenarios that can never be exercised, which is the shape of every defect this project has found: a check that cannot fail.

Its surviving intent — that staging cannot reach production — is carried by **Staging cannot reach production**, which states the boundary rather than the safety of the operation.

**Migration**: A project that still runs both environments on one machine keeps the weaker guarantee this requirement described, and the replacement says so explicitly. Nothing else carries over: the reset action is deleted rather than adapted.
