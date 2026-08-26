## MODIFIED Requirements

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

### Requirement: Smoke must not mutate production state
`ship/smoke` runs against production. It SHALL NOT create, modify or delete data that is visible to real users. Where exercising a path requires state, it SHALL use a dedicated synthetic account whose residue is acceptable in production.

Signing in is such a path, and it is the one this allowance exists for. The account SHALL belong to nobody, its credentials SHALL be held like any other secret, and what smoke does while holding its session SHALL be read-only — the account proves a session works, it does not exercise the product.

#### Scenario: Smoke exercises a user path in production
- **WHEN** `ship/smoke` runs against production
- **THEN** no data belonging to or visible to a real user is created, modified or deleted

#### Scenario: Smoke needs a session
- **WHEN** the path being exercised requires being signed in
- **THEN** it signs in as the dedicated synthetic account and reads, leaving behind only what signing in itself leaves
