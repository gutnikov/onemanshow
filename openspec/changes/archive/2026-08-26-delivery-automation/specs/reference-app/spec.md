## MODIFIED Requirements

### Requirement: Readiness endpoint reflects real readiness
The application SHALL expose `/health`, which SHALL return a 2xx response only when the application can actually serve requests, including that its database is reachable and that its schema and its code agree. Drift SHALL be detected in **both** directions: a schema behind the code and a schema ahead of it are each a non-ready state. It SHALL NOT return a static success.

The response SHALL also carry the commit this build was deployed as, so the pipeline can ask production what it is running. It is reported on the readiness endpoint rather than one of its own because a caller that wants the identity always wants to know whether the thing is alive as well, and two endpoints would let those answers disagree.

#### Scenario: Database unreachable
- **WHEN** the application is running but cannot reach its database
- **THEN** `/health` returns a non-2xx response

#### Scenario: Migrations not applied
- **WHEN** the application is running against a database whose schema is behind the application's expectations
- **THEN** `/health` returns a non-2xx response

#### Scenario: Schema ahead of the code
- **WHEN** the application is running against a database whose schema has moved past what this build expects, which is the state a rollback leaves behind
- **THEN** `/health` returns a non-2xx response, so the external liveness check goes red during exactly the incident it exists to catch

#### Scenario: Fully ready
- **WHEN** the application can serve requests and its schema is current
- **THEN** `/health` returns 2xx

#### Scenario: The response identifies the build
- **WHEN** `/health` is requested, ready or not
- **THEN** it carries the commit this build was deployed as, taken from what the deploy tool supplied, so an unhealthy production can still be identified

#### Scenario: Nothing supplied an identity
- **WHEN** the application runs outside a deploy, with no version supplied
- **THEN** the field is absent rather than invented, so a caller can tell "not deployed" from a mismatch
