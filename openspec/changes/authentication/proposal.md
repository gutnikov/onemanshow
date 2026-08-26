## Why

The template carries a delivery pipeline and a reference application with no notion of who is using it. Every product this template is meant to start needs one, and the identity model is the part that is expensive to retrofit: a schema built around a lone user is a migration of live accounts once teams turn out to matter.

Doing it now, before there are users, is what makes it cheap. Doing it in the reference application rather than as advice is what makes it validated — a pre-wired capability that no run exercises is a claim, not a feature.

## What Changes

- **Identity lives in the application, not in a service.** A library over the project's own tables: no new hosted dependency, nothing added to a ten-euro monthly bill, and the coupling is to Postgres rather than to a vendor. The alternative considered and refused was the database provider's own authentication, which creates its tables outside the migration stream and ties accounts to the provider — so changing providers would mean migrating live accounts rather than moving a dump.
- **Sessions live in the database.** The cheaper-looking option is a stateless token that avoids a query per request, and it is refused for now: the cost it saves is theoretical with no users, while the complexity it adds is immediate — revocation stops being instant, and you cannot look in a table to see who is signed in while you are still changing the product weekly.
- **An organisation exists from the first migration, holding one person.** Not because teams are wanted, but because the reverse is expensive. A column added later is nothing; a live account moved into a structure that did not exist is the worst kind of migration.
- **Sign-in is email and password.** No social providers and no magic links: each would add something to every validation run that can fail without the change being at fault — a mail server to read, or another domain to visit.
- **Sign-up is included and unverified**, and that is named as a limitation rather than a decision to be proud of. Verifying an address needs a mail provider, which is a role this project does not have. Acceptable before there are users; the first thing to fix when there are.
- **The seed creates an identity.** The end-to-end suite needs a session, so a seeded fixture is now a user and an organisation as well as a row to display. **BREAKING for the app contract**, which described fixtures as data.
- **The smoke set signs in, in production, as a dedicated synthetic account.** The first answer here was that it could not: production is never seeded, so there is nobody to sign in as. That was wrong, and the existing requirement on the smoke set had already provided for it — residue from a dedicated synthetic account is acceptable in production. Leaving sign-in unexercised there would have left the path that matters most in any product with accounts checked only where the configuration is not production's. What smoke does while signed in is read-only; the stand is where writing is exercised.

## Capabilities

### New Capabilities
- `identity`: what the application must be able to say about who is signed in, what the pipeline requires of that, and which parts of it are deliberately not verified in production.

### Modified Capabilities
- `app-contract`: seeded fixtures include an identity, because the end-to-end suite needs a session; and the smoke set's boundary becomes explicit.
- `reference-app`: the pages and endpoints that exercise a session, so that one run proves identity works rather than asserting it.

## Impact

`shared/schema.ts` and a generated migration — the largest this project has run, which is itself worth exercising. `api/`, the web application, `db/seed.ts`, `e2e/`, one new secret per environment, and the skill's `06-staging.md` where it explains what the two runs cover.

No change to the pipeline, the guards, or the reactive layer. As with the database move, the way to know this broke nothing is that a change afterwards travels exactly as it did before.
