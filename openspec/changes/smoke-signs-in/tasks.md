# Tasks

Decisions the examination settled, so `dev` does not reopen them: through the
**form**; **two probes**, one before the deploy and one after; the check does
**not** run on the migration-safety pass; the negative test happens **against
the stand**, never against production.

## 1. Contract first

- [x] 1.1 `app-contract`: a seventh hook, `ship/signin`, because the check must be selectable — `ship/smoke` also runs on the stand's content-agnostic pass and a check that needs a particular account cannot go there. The same delta corrects "smoke must not mutate production" to say what the residue actually is, since signing in writes a session
- [x] 1.2 `delivery-pipeline`: the rule that makes two probes worth having — a failure before the deploy and one after it get opposite responses — and the rule that what was rolled back is reported from what happened rather than inferred from the release having failed
- [x] 1.3 `authentication`'s identity delta: that the check goes through the form, because cookie flags are the failure class only a browser exercises; and the correction that a throttle refusal does not count towards the allowance the way a wrong password does, which is why a retry loop terminates

## 2. The credentials reach the release

- [x] 2.1 The release job decrypts `secrets/ci.yaml` as well, masks both values before anything can print them, and exports them at job level rather than step level — the rollback composite runs the same hook and would otherwise run without them
- [ ] 2.2 Verify the values arrive non-empty in the job. A credential declared and blank is a state this pipeline has been bitten by twice, and both times the check that should have caught it read the wrong thing

## 3. Before the deploy

- [x] 3.1 The release asks the **running** production whether the synthetic account can still sign in, and stops without deploying if it cannot. This is the step that makes a later failure attributable, and it runs against the one image in the release already known to work
- [ ] 3.2 Verify it stops the release: point it at a wrong password once and confirm nothing was deployed and nothing was rolled back

## 4. After the deploy

- [x] 4.1 The authenticated check signs in and reads a page that requires a session, writing nothing to `note`. Reuse the suite's own sign-in helper so the throttle is respected by one piece of code rather than two
- [x] 4.2 **Verify it can fail** — by hand, against the stand, with a wrong password, and it must go red. Not against production: doing it there rolls production back for real, and the rollback's cascade guard then reports the schema having moved when nothing of the sort happened
- [ ] 4.3 Verify no `note` rows appeared after a release, and record the two `session` rows it does leave, so nobody later reads "writes nothing" as literal

## 5. Fix what the examination found, where this change makes it load-bearing

- [x] 5.1 The retry's cap of ten attempts is unreachable past three: each refusal waits about 10.25s and no test timeout is set, so the default 30s kills the test first and the failure reads as a hung application. Set an explicit timeout above the worst case, or a cap that matches reality — and verify by making a refusal happen rather than by arithmetic
- [x] 5.2 The helper's assertion says "a seeded account must be able to sign in", which is wrong the moment it is used for the synthetic account and points whoever reads a red release at the wrong environment
- [x] 5.3 `open-window` is told what happened instead of inferring it. Today any failed release is told "Nothing has been rolled back", including one where the rollback ran — and this change adds a failure mode where that sentence is true, which is exactly why the sentence has to stop being a guess. Verify both ways: a pre-deploy failure must say production is untouched, and a post-deploy failure that rewound production must say it was rewound
- [x] 5.4 Delete the testbed's stale root `deploy.yml`. It declares the removed Postgres accessory and the old `/health` proxy check beside the live `config/deploy.yml`, nothing reads it, and this change edits release configuration — which is exactly when somebody opens the wrong file. It rides this change rather than going to main alone, because a commit touching deploy config with no image built fails the release for want of one

## 6. What production does and does not check

- [x] 6.1 Task 5.4 of `authentication`: record in `06-staging.md` and the README what a green production smoke now means about identity — that sign-in works end to end, and that nothing about organisations, invitations or verified addresses is exercised there at all
