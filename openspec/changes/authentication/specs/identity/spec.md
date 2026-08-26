## Purpose

Defines what the application must be able to say about who is using it, and which of those answers the pipeline can verify — so that a capability the template ships pre-wired is one a run has exercised rather than one the documentation claims.

## ADDED Requirements

### Requirement: Identity is the application's, not a provider's
The accounts, sessions and organisations SHALL live in the project's own database, under the project's own migrations, reached by the same connection string as everything else.

An identity service that owns its own tables couples accounts to the vendor: changing providers stops being a dump and becomes a migration of live accounts. It also creates schema outside the migration stream, which this pipeline treats as a defect rather than a convenience — the readiness check compares what is applied against what the code expects, and a table nothing declared is a table nothing can roll back.

#### Scenario: The provider is changed
- **WHEN** the database moves to a different provider
- **THEN** the accounts move with the data, because they are data

#### Scenario: Something wants to create a table at run time
- **WHEN** a library offers to create its schema on first use
- **THEN** that is switched off, and the schema is generated during development and committed, because production must not hold a table that no migration describes

### Requirement: A session is a row, and revoking it is a delete
Sessions SHALL be stored, not encoded. A signed token that carries its own validity avoids a query per request and gives up the ability to end a session: revocation becomes a list of exceptions, and a list of exceptions is a table with extra steps.

This costs a query per authenticated request. That cost is accepted deliberately and its shape is worth knowing: the database is allowed to sleep, so an authenticated request after a quiet period pays the wake, and a product with no users wakes it only when someone actually arrives.

The choice SHALL be revisitable. It is configuration rather than architecture, and the condition that would change it — enough traffic that a query per request matters — is also the condition under which there is money to pay for it.

#### Scenario: Access is withdrawn
- **WHEN** a session must be ended immediately
- **THEN** the row is deleted and the next request is unauthenticated, with no interval during which a token remains valid

#### Scenario: Who is signed in
- **WHEN** it needs to be known which sessions exist
- **THEN** they can be read, because they are rows — which is the property that matters while the product is still changing weekly

### Requirement: An organisation exists from the first migration
Every account SHALL belong to an organisation, and one SHALL be created for an account that arrives without one. A product with a single user has an organisation of one.

The reason is asymmetry, not ambition. Adding the structure now costs a table and a foreign key. Adding it later means moving live accounts into a shape that did not exist when they were created, which is the migration people put off until it becomes impossible.

#### Scenario: The first account is created
- **WHEN** somebody signs up and belongs to nothing
- **THEN** an organisation is created holding them alone, so every later query can assume one exists

#### Scenario: Data belongs to an organisation
- **WHEN** a row is created on behalf of a signed-in account
- **THEN** it records the organisation, so that a second member later changes who can see it rather than requiring the row to be reshaped

### Requirement: Sign-up is unverified, and that is stated
An address SHALL NOT be assumed to belong to whoever typed it. Verification requires sending mail, which requires a provider this project does not have, so sign-up accepts an address without proving it.

This SHALL be recorded as a limitation wherever sign-up is described, not left for someone to discover. It is acceptable before there are users and it is the first thing to fix once there are — and fixing it adds a role, which is why it is not being fixed here.

#### Scenario: An address that is not theirs
- **WHEN** somebody signs up with an address they do not control
- **THEN** the account is created, because nothing checks, and the limitation is documented rather than implied

#### Scenario: Verification is added later
- **WHEN** email verification becomes necessary
- **THEN** it arrives with a mail provider as a new role, whose absence degrades sign-up rather than the whole pipeline

### Requirement: Signing in is exercised in production, by a synthetic account
The smoke set SHALL sign in and reach a page that requires a session, using a **dedicated synthetic account** that exists in production for that purpose and belongs to nobody.

The alternative — leaving sign-in unexercised in production because production is never seeded — was the first answer here and it is wrong. Sign-in is the path that matters most in any product with accounts, and configuration that differs between environments is exactly where it breaks; a check that stops at the front page would pass through that. The existing requirement on the smoke set already allowed for this: residue from a dedicated synthetic account is acceptable in production, and that is what this uses.

What smoke does while signed in SHALL be read-only. Creating data as the synthetic account would put rows in production on every release, and the point of the account is to prove a session works, not to exercise the product.

The synthetic account's credentials SHALL be a secret like any other, and its existence SHALL be visible: an account that can sign in to production is an attack surface, and one nobody remembers creating is worse than one written down.

#### Scenario: Smoke signs in after a release
- **WHEN** the smoke set runs against production
- **THEN** it signs in as the synthetic account, reaches a page that requires a session, and creates nothing

#### Scenario: Sign-in breaks through environment configuration
- **WHEN** a change works on the stand and breaks signing in in production because a value differs between them
- **THEN** the smoke set fails, which is the case this exists for

#### Scenario: The suite goes further than smoke
- **WHEN** the end-to-end suite runs against the stand
- **THEN** it exercises signing up, organisation scoping and whatever else requires writing, because the stand is seeded and its residue is discarded

### Requirement: Repeated sign-in attempts are refused
Sign-in SHALL be throttled per client address. The library's own default is three attempts per ten seconds for anything under `/sign-in`, counted per address and per path, and it counts refused attempts — which is the point, since guessing is what it defends against. It is active whenever the application runs as production, so it is active on the stand as well as in production.

The throttle SHALL NOT be relaxed to make tests pass. This is written down because the first version of the suite signed in six times in ten seconds and was therefore never reliably green; the failure looked like a flake, then like contention, then like broken organisation scoping, and was none of those.

A suite that signs in more often than a visitor plausibly would SHALL instead behave as any well-behaved client does: when the application answers that it is being asked too often, wait as long as the application asked and ask again. It SHALL NOT restate the throttle's rule — not the allowance, not the window, not how the window rolls. A suite that predicts the rule is a second copy of a rule it does not own, and it diverges silently the moment the rule changes. It SHALL also reuse a session wherever the test is not itself about signing in, so that ordinary coverage does not consume a defence's allowance.

Waiting on a refusal SHALL NOT be able to hide a broken sign-in. An attempt that was judged — accepted or rejected — is returned to the test as it is; only a refusal to judge is retried.

The throttle SHALL be asserted by a test, and asserted as a property rather than as a number: that repeated guessing is eventually refused instead of endlessly checked, and refused within few enough attempts for the defence to be worth having. Nothing else notices when a defence disappears.

Throttling per address is only meaningful if the address cannot be chosen by the client. The proxy therefore SHALL be the only source of the forwarded address: it overwrites what the client sent, which is what it does when it terminates TLS. Configuring it to forward client headers instead SHALL be treated as a change to this requirement, because the forwarded chain then becomes unresolvable and every such request falls into one bucket shared by all of them.

#### Scenario: A password is guessed repeatedly
- **WHEN** attempts arrive from one address faster than the allowance
- **THEN** they are refused with a rate-limit response rather than checked, and the refusals count towards the allowance

#### Scenario: The suite signs in more often than a person would
- **WHEN** the end-to-end suite runs, including a run that starts while the allowance is already spent
- **THEN** it passes without the application being reconfigured, waiting only as long as the application asked, and it leaves the allowance clear for whatever runs next

#### Scenario: The throttle's own rule changes
- **WHEN** an upgrade changes the allowance, the window, or how the window rolls
- **THEN** the suite still passes, because it reads the refusal rather than predicting it, and the test that asserts the throttle fails only if refusal stops happening at all

#### Scenario: A client claims a different address
- **WHEN** a request arrives carrying its own forwarded-address header
- **THEN** the value is discarded by the proxy and the attempt is counted against the address the request actually came from
