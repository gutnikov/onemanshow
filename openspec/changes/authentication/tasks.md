# Tasks

## 1. Schema before anything uses it

- [x] 1.1 Add the account, session and organisation tables to the schema and generate the migration during development. Verify `ship/check` passes, which now compares the journal against the files — and verify by reading the generated SQL that it creates what was intended rather than trusting the generator
- [x] 1.2 Turn off any ability the library has to create its own schema at run time. Verify by starting the application against a database with the migration **not** applied: it must fail readiness rather than quietly creating tables, because a table nothing declared is a table nothing can roll back

- [x] 1.3 **Not planned, and found by doing 1.1.** The library requires `drizzle-kit >= 0.31.4` and `drizzle-orm >= 0.45.2`; the project had 0.30.6 and 0.38.4. So adding identity meant upgrading the data-access layer by seven minor versions — a change to every query in the application rather than a change to authentication. Verified that the new generator agrees with the existing migration history (no spurious migration, journal version unchanged), that `ship/check` passes, and against a real database that the readiness query still works. The bundle went from 374KB to 2.2MB, which is the cost and belongs written down

## 2. Signing in works

- [ ] 2.1 Wire sign-up and sign-in with email and password, and one secret per environment for signing. Verify locally, then verify the secret is present and non-empty in both environments — a credential declared and blank is a state this pipeline has been bitten by
- [ ] 2.2 An organisation is created for an account that arrives without one. Verify by signing up and reading the row: the organisation exists and holds exactly that account
- [ ] 2.3 A page that requires a session and shows who is signed in and which organisation they belong to. Verify that a visitor without a session cannot see its contents

## 3. Identity stops being a claim

- [ ] 3.1 `ship/seed` creates an account and its organisation, as part of the fixture set rather than as a step the tests perform. Verify a failure to create the account fails seeding, not the suite
- [ ] 3.2 `ship/e2e` signs in with the seeded account and reads the authenticated page. **This is the task that makes the capability real** — verify by breaking session handling deliberately and confirming the suite goes red, because a check that has never failed is not known to work

## 4. Organisation scoping, exercised rather than asserted

- [ ] 4.1 One organisation-scoped table, and a write the authenticated page performs. Verify the row records the organisation
- [ ] 4.2 The suite signs in as the seeded account, writes, and reads back only what belongs to its organisation. Verify by seeding a second account in a second organisation and confirming neither sees the other's row. **Without this, the requirement that rows record their organisation is a claim no run exercises**

## 5. Production exercises signing in

- [ ] 5.1 Create the synthetic account in production by signing up through the product's own path, once, by hand. Verify sign-up works in production — the one time it will be checked there
- [ ] 5.2 Store its credentials as a secret in both the place smoke reads and nowhere else. Verify the account is alone in its own organisation and has no data of its own
- [ ] 5.3 `ship/smoke` signs in as that account and reads the authenticated page, and writes nothing. Verify by watching production's data after a release: no new rows. Verify the check can fail by pointing it at a wrong password once
- [ ] 5.4 Record in `06-staging.md` and in the README what production does and does not check about identity, so nobody reads a green smoke as more than it is

## 6. Verification

- [ ] 6.1 Drive an ordinary change end to end afterwards — queue to closed, a person doing only the two gates. The test of whether this broke the pipeline
- [ ] 6.2 Confirm the migration behaved on a database that had just moved: the release's own migration step applied it, and readiness passed, which it cannot if applied and expected disagree
- [ ] 6.3 Measure what an authenticated request costs against a sleeping database, from outside. The session query is the first thing that will wake it in normal use, and the number belongs next to the others rather than assumed to be the same
