## MODIFIED Requirements

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
