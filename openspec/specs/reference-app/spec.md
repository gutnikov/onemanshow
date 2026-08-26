# reference-app Specification

## Purpose
The reference application is a deliberately featureless project that exercises every part of the delivery pipeline, including its failure paths, so the pipeline can be proven before real work depends on it.

## Requirements

### Requirement: Minimal end-to-end path
The reference application SHALL serve one page that displays a value it obtained from its own API, where that value originates in a database row written by `ship/seed`. The page, the API and the static assets SHALL be served by a single deployable unit.

#### Scenario: The page shows seeded data
- **WHEN** the application is deployed to a prepared environment and its page is opened
- **THEN** the page displays the value from the seeded row, proving in one observation that the build, the static serving, the API and the database all work

#### Scenario: One deployable unit
- **WHEN** the application is released
- **THEN** exactly one image contains both the API and the built frontend assets

### Requirement: Readiness endpoint reflects real readiness
The application SHALL expose a readiness endpoint which SHALL return a 2xx response only when the application can actually serve requests, including that its database is reachable and that its schema and its code agree. Drift SHALL be detected in **both** directions: a schema behind the code and a schema ahead of it are each a non-ready state. It SHALL NOT return a static success.

It SHALL be separate from the liveness endpoint, which reports that the process is serving and which commit it is, and touches no database. Readiness is asked at deploy time and by verification; liveness is what may be polled often.

Both endpoints SHALL carry the commit this build was deployed as. On liveness because that is where callers can reach it when the application is unhealthy; on readiness because a caller holding one response should not have to make a second request to learn what answered.

#### Scenario: Database unreachable
- **WHEN** the application is running but cannot reach its database
- **THEN** readiness returns a non-2xx response

#### Scenario: Migrations not applied
- **WHEN** the application is running against a database whose schema is behind the application's expectations
- **THEN** readiness returns a non-2xx response

#### Scenario: Schema ahead of the code
- **WHEN** the application is running against a database whose schema has moved past what this build expects, which is the state a rollback leaves behind
- **THEN** readiness returns a non-2xx response, and the release refuses to call the deploy healthy

#### Scenario: Fully ready
- **WHEN** the application can serve requests and its schema is current
- **THEN** readiness returns 2xx

#### Scenario: The response identifies the build
- **WHEN** either endpoint is requested, ready or not
- **THEN** it carries the commit this build was deployed as, taken from what the deploy tool supplied

#### Scenario: Nothing supplied an identity
- **WHEN** the application runs outside a deploy, with no version supplied
- **THEN** the field is absent rather than invented, so a caller can tell "not deployed" from a mismatch

#### Scenario: Liveness is asked while the database sleeps
- **WHEN** the liveness endpoint is polled and the database has scaled to zero
- **THEN** it answers without waking it

### Requirement: A smoke subset of the end-to-end tests
The reference application SHALL mark a subset of its end-to-end tests as the smoke set, and `ship/smoke` SHALL run only that subset. The smoke set SHALL exercise real user-visible paths rather than only a health check, and SHALL be free of mutations.

#### Scenario: Smoke detects a broken page on a live application
- **WHEN** the application is running and answering `/health` with 2xx, but its page fails to render its value
- **THEN** the smoke set fails, because it exercises the page rather than only liveness

#### Scenario: Smoke runs repeatedly against production
- **WHEN** the smoke set runs many times against production
- **THEN** production data is unchanged by it

### Requirement: Deliberate failure switch
The reference application SHALL provide a switch that, when enabled, makes it fail its own smoke set while still starting up. The switch SHALL be part of the released artifact's configuration so that enabling it requires a change travelling the pipeline.

#### Scenario: Testing the incident path
- **WHEN** a change enables the failure switch and is released to production
- **THEN** the post-deploy smoke check fails, production is rolled back one step, and the change is marked as requiring human attention

#### Scenario: The switch is off by default
- **WHEN** no change has enabled the switch
- **THEN** the application passes its smoke set

### Requirement: Deliberate irreversible migration
The reference application SHALL provide a migration that is, by construction, not undone by reverting the code that introduced it. It SHALL be inert until deliberately enabled, so that the cascade guard can be exercised on demand.

#### Scenario: Testing the cascade guard
- **WHEN** the irreversible migration is released and the resulting production state fails verification
- **THEN** production is rolled back exactly one step, that step also fails verification, and the pipeline stops and escalates to a human instead of continuing backwards

#### Scenario: Revertability is visible before implementation
- **WHEN** a change containing the irreversible migration is proposed
- **THEN** its planning artifacts state that reverting the code will not undo the schema change, and name the manual step required
