## MODIFIED Requirements

### Requirement: Minimal end-to-end path
The reference application SHALL serve one page that displays a value it obtained from its own API, where that value originates in a database row written by `ship/seed`. The page, the API and the static assets SHALL be served by a single deployable unit.

It SHALL also serve one page that requires a session and shows who is signed in and which organisation they belong to. That page exists for the same reason as the first: one observation proves the chain. Where the first proves build, serving, API and database, the second proves that a session is created, carried and read — and a capability the template ships pre-wired but no run exercises is a claim rather than a feature.

The public page SHALL stay public. A skeleton where nothing can be seen without signing in cannot prove the chain before an account exists, and it makes the unauthenticated smoke check impossible.

#### Scenario: The page shows seeded data
- **WHEN** the application is deployed to a prepared environment and its page is opened
- **THEN** the page displays the value from the seeded row, proving in one observation that the build, the static serving, the API and the database all work

#### Scenario: One deployable unit
- **WHEN** the application is released
- **THEN** exactly one image contains both the API and the built frontend assets

#### Scenario: The page behind a session
- **WHEN** a visitor with no session opens the page that requires one
- **THEN** they are not shown its contents, and signing in shows them who they are and which organisation they belong to

#### Scenario: Identity is exercised rather than asserted
- **WHEN** the end-to-end suite runs
- **THEN** it signs in, reads that page, and fails if a session is not carried — so the capability is proved by a run rather than by documentation
