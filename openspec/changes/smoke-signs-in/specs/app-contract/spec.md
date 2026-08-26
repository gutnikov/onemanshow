## Purpose

A seventh hook, because the check that signs in must be selectable. It cannot
live inside `ship/smoke`: that hook also runs against the stand on the pass that
is deliberately content-agnostic, and a check requiring a particular account to
exist is content-dependent by construction.

## MODIFIED Requirements

### Requirement: Hook interface
The application SHALL expose its pipeline participation as executable files at fixed paths: `ship/check`, `ship/build`, `ship/migrate`, `ship/seed`, `ship/e2e`, `ship/smoke`, `ship/signin`. The pipeline SHALL invoke them by path only, and MUST NOT inspect their contents or infer anything about the project's language or tooling. A hook SHALL signal success with exit code 0 and failure with any non-zero code.

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

#### Scenario: No signin hook
- **WHEN** `ship/signin` is absent
- **THEN** the release proceeds with signing in unexercised in production, and says so — an application with no accounts is the ordinary case for this hook to be missing, and one that has them should be told what is not being checked rather than left to assume it is

### Requirement: Check must not require a running application
`ship/check` SHALL contain only work that needs no deployed or running instance of the application. Any verification requiring a live instance SHALL belong to `ship/e2e`, `ship/smoke` or `ship/signin`.

#### Scenario: Check runs with no environment
- **WHEN** `ship/check` is invoked with no database, no deployed application and no network access to any environment
- **THEN** it completes and returns a verdict

### Requirement: Target URL is supplied to the hooks that need it
The pipeline SHALL pass the address of the environment under test to `ship/e2e`, `ship/smoke` and `ship/signin` through the environment variable `SHIP_URL`. Those hooks SHALL NOT hardcode an environment address.

#### Scenario: e2e receives the staging address
- **WHEN** the pipeline invokes `ship/e2e` during staging validation
- **THEN** `SHIP_URL` holds the address of the staging environment

#### Scenario: smoke receives the production address
- **WHEN** the pipeline invokes `ship/smoke` after a production deploy
- **THEN** `SHIP_URL` holds the address of the production environment

#### Scenario: signin receives the production address, twice
- **WHEN** the pipeline invokes `ship/signin` before the deploy and again after it
- **THEN** `SHIP_URL` holds the address of production on both occasions, and the two invocations are distinguished by when they ran rather than by what they were told

### Requirement: Smoke must not mutate production state
`ship/smoke` and `ship/signin` run against production. They SHALL NOT create, modify or delete data that is visible to real users. Where exercising a path requires state, they SHALL use a dedicated synthetic account whose residue is acceptable in production.

Signing in is such a path, and it is the one this allowance exists for. The account SHALL belong to nobody, its credentials SHALL be held like any other secret, and what is done while holding its session SHALL be read-only — the account proves a session works, it does not exercise the product.

Residue is not the same as nothing. Signing in writes a session, and a hook that signs in therefore leaves a row behind on every release — two, where the release probes before the deploy and after it. That is acceptable and SHALL be stated where the hook is described, rather than described as writing nothing: a claim that is easy to make, false, and one that quietly poisons any verification resting on it.

#### Scenario: Smoke exercises a user path in production
- **WHEN** `ship/smoke` runs against production
- **THEN** no data belonging to or visible to a real user is created, modified or deleted

#### Scenario: Smoke needs a session
- **WHEN** the path being exercised requires being signed in
- **THEN** it signs in as the dedicated synthetic account and reads, leaving behind only what signing in itself leaves

#### Scenario: Signing in leaves a session
- **WHEN** `ship/signin` signs in to production
- **THEN** the session it creates is the only thing it leaves, and the count of them is understood rather than assumed to be zero
