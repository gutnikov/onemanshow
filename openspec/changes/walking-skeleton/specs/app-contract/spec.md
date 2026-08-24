## Purpose

Defines the only interface between the delivery pipeline and an application, so the pipeline can validate and release any project without knowing its language, framework or toolchain.

## ADDED Requirements

### Requirement: Hook interface
The application SHALL expose its pipeline participation as executable files at fixed paths: `ship/check`, `ship/build`, `ship/migrate`, `ship/seed`, `ship/e2e`, `ship/smoke`. The pipeline SHALL invoke them by path only, and MUST NOT inspect their contents or infer anything about the project's language or tooling. A hook SHALL signal success with exit code 0 and failure with any non-zero code.

#### Scenario: Pipeline invokes a hook
- **WHEN** the pipeline reaches a stage whose hook exists and is executable
- **THEN** it runs the file at that path and treats exit code 0 as success and any non-zero code as failure

#### Scenario: Hook is present but not executable
- **WHEN** a hook file exists without the executable bit set
- **THEN** the pipeline fails the stage with a message naming the hook and the missing permission, rather than silently treating it as absent

### Requirement: A missing hook degrades its stage
A hook is optional. When a hook is absent the pipeline SHALL continue with reduced capability rather than failing, and SHALL report which capability was reduced.

#### Scenario: No check hook
- **WHEN** `ship/check` is absent
- **THEN** the check stage is skipped and the pipeline proceeds to build

#### Scenario: No build hook
- **WHEN** `ship/build` is absent and a Dockerfile is present at the repository root
- **THEN** the pipeline builds the image from that Dockerfile

#### Scenario: No migrate or seed hook
- **WHEN** `ship/migrate` or `ship/seed` is absent
- **THEN** the pipeline treats the project as having no database and completes staging validation with no data present

#### Scenario: No e2e hook
- **WHEN** `ship/e2e` is absent
- **THEN** staging validation becomes human-only: the change is deployed to staging and handed over for review with no automated verification, and the handover states that no automated check ran

#### Scenario: No smoke hook
- **WHEN** `ship/smoke` is absent
- **THEN** the pipeline issues an HTTP GET to `/` on the deployed target and treats a 2xx response as success

### Requirement: Check must not require a running application
`ship/check` SHALL contain only work that needs no deployed or running instance of the application. Any verification requiring a live instance SHALL belong to `ship/e2e` or `ship/smoke`.

#### Scenario: Check runs with no environment
- **WHEN** `ship/check` is invoked with no database, no deployed application and no network access to any environment
- **THEN** it completes and returns a verdict

### Requirement: Target URL is supplied to the hooks that need it
The pipeline SHALL pass the address of the environment under test to `ship/e2e` and `ship/smoke` through the environment variable `SHIP_URL`. Those hooks SHALL NOT hardcode an environment address.

#### Scenario: e2e receives the staging address
- **WHEN** the pipeline invokes `ship/e2e` during staging validation
- **THEN** `SHIP_URL` holds the address of the staging environment

#### Scenario: smoke receives the production address
- **WHEN** the pipeline invokes `ship/smoke` after a production deploy
- **THEN** `SHIP_URL` holds the address of the production environment

### Requirement: Smoke must not mutate production state
`ship/smoke` runs against production. It SHALL NOT create, modify or delete data that is visible to real users. Where exercising a path requires state, it SHALL use a dedicated synthetic account whose residue is acceptable in production.

#### Scenario: Smoke exercises a user path in production
- **WHEN** `ship/smoke` runs against production
- **THEN** no data belonging to or visible to a real user is created, modified or deleted

### Requirement: Seed data is the same data the tests expect
The synthetic data written by `ship/seed` SHALL be the fixture set that `ship/e2e` relies on, maintained as a single source in the repository and versioned with the code.

#### Scenario: Schema changes in the same change as its fixtures
- **WHEN** a change alters the database schema and its accompanying fixtures in one commit
- **THEN** `ship/migrate` followed by `ship/seed` succeeds at that commit, and `ship/e2e` finds the data it expects
