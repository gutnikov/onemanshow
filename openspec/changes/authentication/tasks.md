# Tasks

## 1. Schema before anything uses it

- [x] 1.1 Add the account, session and organisation tables to the schema and generate the migration during development. Verify `ship/check` passes, which now compares the journal against the files — and verify by reading the generated SQL that it creates what was intended rather than trusting the generator
- [x] 1.2 Turn off any ability the library has to create its own schema at run time. Verify by starting the application against a database with the migration **not** applied: it must fail readiness rather than quietly creating tables, because a table nothing declared is a table nothing can roll back

- [x] 1.3 **Not planned, and found by doing 1.1.** The library requires `drizzle-kit >= 0.31.4` and `drizzle-orm >= 0.45.2`; the project had 0.30.6 and 0.38.4. So adding identity meant upgrading the data-access layer by seven minor versions — a change to every query in the application rather than a change to authentication. Verified that the new generator agrees with the existing migration history (no spurious migration, journal version unchanged), that `ship/check` passes, and against a real database that the readiness query still works. The bundle went from 374KB to 2.2MB, which is the cost and belongs written down

## 2. Signing in works

- [x] 2.1 Wire sign-up and sign-in with email and password, and one secret per environment for signing. Verify locally, then verify the secret is present and non-empty in both environments — a credential declared and blank is a state this pipeline has been bitten by
- [x] 2.2 An organisation is created for an account that arrives without one. Verify by signing up and reading the row: the organisation exists and holds exactly that account
- [x] 2.3 A page that requires a session and shows who is signed in and which organisation they belong to. Verify that a visitor without a session cannot see its contents

- [x] 2.4 **Not planned, and found by running it.** The schema had to be regenerated with the current tool: the package named `@better-auth/cli` is deprecated and a minor line behind, and produced a schema missing one field, which the library refused at run time naming exactly which. The current tool needs node 21 or newer, which a local node 20 does not have, so it runs in a container at the project's own version — the same shape as the database client that was older than the server it had to dump. And the adapter needs the schema passed to it explicitly, because the connection is built without one

## 3. Identity stops being a claim

- [x] 3.1 `ship/seed` creates an account and its organisation, as part of the fixture set rather than as a step the tests perform. Verify a failure to create the account fails seeding, not the suite
- [x] 3.2 `ship/e2e` signs in with the seeded account and reads the authenticated page. **This is the task that makes the capability real** — verify by breaking session handling deliberately and confirming the suite goes red, because a check that has never failed is not known to work

## 4. Organisation scoping, exercised rather than asserted

- [x] 4.1 One organisation-scoped table, and a write the authenticated page performs. Verify the row records the organisation
- [x] 4.2 The suite signs in as the seeded account, writes, and reads back only what belongs to its organisation. Verify by seeding a second account in a second organisation and confirming neither sees the other's row. **Without this, the requirement that rows record their organisation is a claim no run exercises**

- [x] 4.3 **Not planned, and found by running it in the pipeline.** The suite signed in six times in ten seconds and the application refused it: the library throttles sign-in to three attempts per ten seconds per address, on by default whenever the app runs as production, so the stand enforces it too. The suite could therefore never be reliably green — the first two green runs were timing luck, and the red one looked in turn like a flake, like the stand's one CPU, and like broken organisation scoping. Fixed in the suite rather than in the application, because the throttle is a real defence against password guessing. Sessions are obtained once over the API and reused, and the sign-ins that remain wait as long as the application asks and ask again — the first fix modelled the allowance and window instead, which made the suite a second copy of a rule it does not own, so it was replaced. The test that asserts the throttle asserts the property, not the numbers. Verified that the waiting actually happens rather than being dead code: with the allowance deliberately spent first, the form sign-in test passes and takes ten seconds instead of one, and the whole suite passes where the modelled version could not, since a fresh process assumed a clear window. Two consecutive full runs pass, which the original suite never did. Verified separately that the address the throttle counts cannot be chosen by the client: the proxy overwrites the forwarded header when it terminates TLS, and a forged one is discarded
- [x] 4.4 **Found by the same failure.** The wrong-password test asserted only that some problem message appeared, which "Too many requests" satisfies — so it would have gone green with password checking entirely broken. It now asserts the refusal names the credentials

## 5. Production exercises signing in

**These follow the release, not precede it.** The synthetic account is created
by signing up through the product's own path, and that path does not exist in
production until this change is released — so 6.1 comes first, then 5.1 and 5.2,
then 5.3 as a change of its own. The same ordering as teaching the readers to use
a new endpoint after the endpoint exists, which was predicted in that case and
still not applied when these tasks were written.

- [x] 5.1 Create the synthetic account in production by signing up through the product's own path, once, by hand. Verify sign-up works in production — the one time it will be checked there. **Done 2026-08-26** through production's own form in a real browser rather than by calling the endpoint, so the form itself was the thing exercised: sign-up answered 200 and the page came back behind a session
- [x] 5.2 Store its credentials as a secret in both the place smoke reads and nowhere else. Verify the account is alone in its own organisation and has no data of its own. **Done**, and the placement took two corrections worth recording: first into GitHub repository secrets, which is wrong because this instance keeps secrets in SOPS and the repository holds only the two keys that unlock them; then into `secrets/prod.yaml`, which is wrong because that file is what the container is given, and adding a credential the application never reads redeployed production for nothing. It lives in `secrets/ci.yaml`, with the pipeline's own tokens. Verified through the product rather than the database: the organisation plugin reports one member, owner, itself, and the account owns zero rows. `ship.yml` records that the account exists and which file holds it, repeating neither address nor password
- [x] 5.3 **Done, as its own change (#24), and the hook is `ship/signin` rather than `ship/smoke`** — smoke also runs on the stand's content-agnostic pass, where a check needing a particular account cannot go. The release runs it twice, before and after the deploy, so a failure is attributable. `ship/smoke` signs in as that account and reads the authenticated page, and writes nothing. Verify by watching production's data after a release: no new rows. Verify the check can fail by pointing it at a wrong password once
- [x] 5.4 Record in `06-staging.md` and in the README what production does and does not check about identity, so nobody reads a green smoke as more than it is

## 6. Verification

- [ ] 6.1 Drive an ordinary change end to end afterwards — queue to closed, a person doing only the two gates. The test of whether this broke the pipeline
- [x] 6.2 Confirm the migration behaved on a database that had just moved: the release's own migration step applied it, and readiness passed, which it cannot if applied and expected disagree. **Done by the release of this change on 2026-08-26.** The migration step ran before the deploy and reported `migrations applied`, which is not the evidence — the evidence is that production answers `ready: true` while running `e824677`, whose code expects three migrations, and readiness refuses in both directions. Applied fewer and it would say `migrations-behind`; applied more, `schema-ahead`. A fabricated session cookie is answered 401 rather than 500, which shows the endpoint path works but is *not* proof the table exists: the library could swallow the error and return no session either way
- [ ] 6.3 Measure what an authenticated request costs against a sleeping database, from outside. The session query is the first thing that will wake it in normal use, and the number belongs next to the others rather than assumed to be the same
