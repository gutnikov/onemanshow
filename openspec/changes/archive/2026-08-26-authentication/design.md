## Context

The template ships a pipeline and a reference application that has no notion of who is using it. See `openspec/specs/reference-app` for what the application proves today: one page, one row, one observation.

Two constraints shape everything here, and both come from decisions already taken. The database is managed and allowed to sleep, so a query per request has a cost with a shape. And schema must be generated during development and committed, because the readiness check compares what is applied against what the code expects — a table nothing declared is a table nothing can roll back.

## Goals / Non-Goals

**Goals:**
- Accounts, sessions and organisations are the project's data, under the project's migrations.
- Identity is exercised by a run, not described in a document.
- The shape that is expensive to change later exists from the first migration.
- Nothing new is hosted and nothing is added to the monthly bill.

**Non-Goals:**
- Verified email addresses. That needs a mail provider, which is a role this project does not have.
- Social providers or magic links. Each adds a way for a validation run to fail without the change being at fault.
- Roles and permissions beyond belonging to an organisation. There is no product yet whose access needs describing.

## Decisions

**A library over our own tables, not the database provider's authentication.** The provider's version creates its schema outside the migration stream and ties accounts to the vendor: changing providers would stop being a dump and become a migration of live accounts. The library's coupling is to Postgres, which the data already has.

**Sessions are rows.** A signed token that carries its own validity saves a query per request and gives up instant revocation, replacing it with a list of exceptions — which is a table with extra steps. With no users the saving is theoretical and the complexity is immediate. It is configuration rather than architecture, so the condition that would change it is also the condition under which there is revenue to pay for it.

**An organisation exists from the first migration.** Asymmetry, not ambition: a table and a foreign key now against moving live accounts into a shape that did not exist when they were created.

**The reference application gains one organisation-scoped table.** Discovered while writing the specs: a requirement saying rows record their organisation, in an application whose only table is a global greeting, is a claim no run can exercise — the exact thing this change exists to avoid. So the authenticated page writes something small and reads back only what belongs to the signed-in account's organisation. It is the minimum that makes scoping real, and the maximum that does not start inventing a product.

**The public page stays public.** A skeleton where nothing is visible without an account cannot prove the chain before an account exists, and it makes the unauthenticated part of the smoke set impossible.

**Smoke signs in, in production, as a dedicated synthetic account.** This reverses the first answer, which was that it could not, because production is never seeded. The existing requirement on the smoke set already permitted a dedicated synthetic account whose residue is acceptable in production, and leaving sign-in unchecked there would have left the path that matters most tested only where the configuration is not production's.

**That account is created by signing up, once, by hand.** No workflow to create it: using the product's own sign-up path proves it works in production the one time it matters, and the alternative is a one-off workflow whose only job is to do what the product already does. Its credentials become a secret like any other, because an account that can sign in to production and that nobody remembers creating is worse than one written down.

## Risks / Trade-offs

**A real credential that can sign in to production.** Mitigated by what the account is rather than by hiding it: an ordinary account, alone in its own organisation, named so that its purpose is obvious, and read-only in what smoke does with it. Not mitigated at all against its password leaking — that is the same exposure as any secret here, and the same remedy.

**Unverified sign-up.** Anybody can create an account with an address they do not control. Acceptable before there are users, and the first thing to fix once there are; the fix adds a role rather than changing this design.

**The largest migration this project has run.** Several tables at once, and it lands on a database that has just moved. That is a reason to do it now rather than later: the migration path was exercised yesterday by a single column, and this is the first one big enough to be interesting.

**An authenticated request wakes a sleeping database.** With no users, nothing wakes it until someone arrives, and then they pay about a second. Worth knowing rather than avoiding: the alternative was the stateless session this design refused.

## Migration Plan

The order is chosen so that each step is verifiable before the next depends on it.

1. Schema and its migration, generated during development and committed. Nothing uses it yet.
2. The library wired, sign-up and sign-in working, the authenticated page reading identity only.
3. The seed creates an account and an organisation. The suite signs in. **This is where identity stops being a claim.**
4. The organisation-scoped table and the write the authenticated page performs, exercised by the suite.
5. The synthetic account created in production by signing up, its credentials stored, and the smoke set taught to sign in and read.
6. An ordinary change afterwards, to show the pipeline still carries one.

Rolling back is a revert plus the schema, which means the same asymmetry as any migration: the tables outlive the revert until something drops them.

## Open Questions

- What the authenticated page should write. Something is needed to make organisation scoping real, and inventing a product to hold it is the failure mode on the other side. The smallest thing that is not a toy is probably a note, and that is a guess until it is written.
- Whether the synthetic account should be able to sign in at all after smoke stops needing it. Keeping a credential alive for a check is a reason; keeping it after is drift.
