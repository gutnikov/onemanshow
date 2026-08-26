# app-contract Specification

## Purpose
Defines the only interface between the delivery pipeline and an application, so the pipeline can validate and release any project without knowing its language, framework or toolchain.

## Requirements

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

Signing in is such a path, and it is the one this allowance exists for. The account SHALL belong to nobody, its credentials SHALL be held like any other secret, and what smoke does while holding its session SHALL be read-only — the account proves a session works, it does not exercise the product.

#### Scenario: Smoke exercises a user path in production
- **WHEN** `ship/smoke` runs against production
- **THEN** no data belonging to or visible to a real user is created, modified or deleted

#### Scenario: Smoke needs a session
- **WHEN** the path being exercised requires being signed in
- **THEN** it signs in as the dedicated synthetic account and reads, leaving behind only what signing in itself leaves

### Requirement: Seed data is the same data the tests expect
The synthetic data written by `ship/seed` SHALL be the fixture set that `ship/e2e` relies on, maintained as a single source in the repository and versioned with the code.

A fixture is not only rows to display. Where the application has accounts, the seed SHALL create an identity the suite can sign in as, and whatever that identity must belong to, because a suite that cannot hold a session cannot exercise anything behind one.

#### Scenario: The suite needs a session
- **WHEN** `ship/e2e` runs against a freshly seeded environment
- **THEN** an account it can sign in as already exists, created by the seed rather than by the test, so a failure to create an account is a seeding failure and not a test failure

#### Scenario: The fixture and the expectation move together
- **WHEN** a change alters the seeded identity
- **THEN** the suite's expectation changes in the same commit, because both are the same source

#### Scenario: Schema changes in the same change as its fixtures
- **WHEN** a change alters the database schema and its accompanying fixtures in one commit
- **THEN** `ship/migrate` followed by `ship/seed` succeeds at that commit, and `ship/e2e` finds the data it expects

### Requirement: The running artifact reports its own identity
The application SHALL report the commit it was built from, at its **liveness** endpoint, from a value supplied by the deploy tool rather than compiled in.

On liveness rather than readiness, because every caller that asks what is running needs the answer while production is unhealthy — that is when a rollback is unresolved and when the question matters most — and because asking it must not wake a sleeping database.

The pipeline has to be able to ask production what it is running, because the guard that production and the main branch agree is otherwise unenforceable. Every other source answers a different question: a deploy log and a workflow run record what was *intended*, and a rollback is precisely the case where intent and reality differ.

Asking the machine over a shell connection would answer correctly and would require giving the guard the credentials that can deploy, in order to learn a fact the artifact knows about itself.

An application that does not report it SHALL cause the guard to refuse rather than pass. An absent identity is unknown, and unknown is not agreement.

#### Scenario: The guard asks what production is running
- **WHEN** the merge guards evaluate whether production and the main branch agree
- **THEN** the answer comes from production itself, so it reflects what is deployed rather than what was last deployed successfully

#### Scenario: A rollback has happened
- **WHEN** production has been rolled back to an earlier artifact
- **THEN** it reports that earlier commit, and the guard refuses the next merge until the rollback is resolved

#### Scenario: The application does not report an identity
- **WHEN** the liveness endpoint carries no commit
- **THEN** the guard refuses, because a missing answer is not a matching one

#### Scenario: Production is unhealthy and must still be identified
- **WHEN** production cannot serve requests but its process is running
- **THEN** it still reports which commit it is, because deciding what to do about a broken production starts with knowing what is deployed

### Requirement: Liveness and readiness are separate questions
The application SHALL answer two distinct questions at two endpoints, and the pipeline SHALL ask each of the right one.

**Liveness** is whether the process is serving. It SHALL NOT touch the database. It exists to answer when the machine does not, and a check that reaches into a dependency cannot distinguish "the process is gone" from "the dependency is slow".

**Readiness** is whether the application can serve requests, which includes its database and the agreement between schema and code. It SHALL be asked at deploy time and by verification, not continuously.

The distinction is not tidiness. A managed database that is allowed to sleep is woken by whatever polls it, so a readiness check on a short interval keeps it awake permanently — the cost of watching the database closely is that it can never rest. Splitting the questions lets the frequent check be cheap and the expensive check be occasional.

What is given up SHALL be stated wherever it might be assumed: between deployments, nothing continuously observes the database. A database failure with no traffic against it will show a green liveness check and no new errors, because there were no requests to fail. That is a deliberate trade for a product whose quiet hour proves nothing anyway, and not a property to rely on later without revisiting.

#### Scenario: The external monitor asks whether production is alive
- **WHEN** the liveness endpoint is polled on a short interval
- **THEN** it answers without opening a database connection, so a sleeping database stays asleep

#### Scenario: A deploy asks whether the new container can serve
- **WHEN** a release has deployed and is deciding whether the container is fit to receive traffic
- **THEN** readiness is asked explicitly, including whether the schema and the code agree

#### Scenario: The process is up and the database is gone
- **WHEN** the application is running and cannot reach its database
- **THEN** liveness reports the process is serving and readiness reports it is not, and the two disagreeing is the information — it is the "up but broken" state that a single check cannot describe
