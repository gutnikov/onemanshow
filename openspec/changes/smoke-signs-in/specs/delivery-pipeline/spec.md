## Purpose

One probe cannot say whose fault a failure is. Two, on either side of the
deploy, can — and the pipeline's response to the two answers has to be
opposite.

## ADDED Requirements

### Requirement: A failed sign-in is attributed before it is acted on
Where the application has accounts, the release SHALL exercise signing in **twice**: once against the running production before anything is changed, and once after the deploy.

The first invocation runs against the artifact already in production, which is the one thing in the release known to work. A failure there SHALL stop the release before migrating or deploying, and SHALL NOT roll anything back — there is nothing to roll back, and the likely causes are a credential that has gone stale or a production that was already unwell.

A failure in the second invocation is attributable to the release, and SHALL be treated as the smoke set's failure is treated, including the rollback decision that depends on whether the schema moved.

The distinction SHALL be structural rather than a matter of wording in a log. A single post-deploy check cannot separate "this release broke signing in" from "the stored password is wrong", and those two demand opposite responses: the first should be rolled back, and the second must not be, because rolling back on a credential fault rewinds a release that was fine.

#### Scenario: The stored credential has gone stale
- **WHEN** the pre-deploy sign-in fails
- **THEN** the release stops with nothing migrated, nothing deployed and nothing rolled back, and says which of the two probes failed

#### Scenario: The release broke signing in
- **WHEN** the pre-deploy sign-in passes and the post-deploy one fails
- **THEN** it is handled as a failed smoke, and production is rolled back only where rewinding the image is safe

#### Scenario: An application with no accounts
- **WHEN** the application has no `ship/signin` hook
- **THEN** the release runs as before and reports that signing in was not exercised

### Requirement: What was rolled back is reported from what happened
A message about the state of production after a failed release SHALL be derived from whether a rollback was attempted and whether it succeeded, and SHALL NOT be inferred from the release having failed.

The two are not the same. A release that fails after an automatic rollback has rewound production; a release that fails before the deploy has not touched it. A message that asserts one of those without checking is wrong half the time, and it is wrong at the moment somebody is reading it to decide what to do.

#### Scenario: A rollback ran and the release still failed
- **WHEN** the smoke set fails, the schema did not move, production is rewound, and the rolled-back version also fails verification
- **THEN** the ticket is told that production was rewound and that the previous version failed too, rather than that nothing was rolled back

#### Scenario: The release failed before the deploy
- **WHEN** the release stops at the pre-deploy sign-in
- **THEN** the ticket is told that production is untouched, and it is told so because that is what the pipeline did, not because failing implies it
