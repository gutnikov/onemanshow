# Smoke signs in to production

## Why

**Narrowed by the examination.** The first version of this section named three
failure modes and two of them cannot happen:

- *A signing secret present but empty* is caught before smoke exists.
  `shared/env.ts:4-6` treats `''` exactly like undefined and throws at module
  load, so the container never becomes healthy and the release fails at the
  deploy.
- *A cookie flag wrong in one environment* is not an environment setting at
  all: the library derives it from the base URL's scheme, and both environments
  are `https://`.
- *A base URL that makes the request cross-origin* cannot skew, because the
  release passes one `domain` to both the app and the check.

What survives is real and smaller: **the session round-trip has never executed
against production's own signing secret and production's own tables.** Sign-in
that is broken only by those two things ships green today. That is the whole of
the gap, and this change should be read against it rather than against the
larger claim it started with.

## The delta this turned out to need

The first draft said there was none, and implementation proved that wrong — so
it is corrected here rather than diverged from quietly.

The identity contract does already exist, in the still-open `authentication`
change: *Signing in is exercised in production, by a synthetic account*. Nothing
restates it. Two things belonging to it are added there and not here: that the
check goes through the form, and the correction that a throttle refusal does not
count towards the allowance the way a wrong password does.

What is genuinely new lives in two capabilities that are already in `specs/`:

- **`app-contract`** gains a seventh hook. The check has to be *selectable*,
  because `ship/smoke` also runs on the stand's content-agnostic pass and a
  check requiring a particular account to exist cannot go there. The same delta
  corrects the requirement that says smoke must not mutate production: signing
  in writes a session, so "leaves nothing" was never true, and a requirement
  that allows residue should say what the residue is.
- **`delivery-pipeline`** gains the rule that makes two probes worth having:
  a failure before the deploy and a failure after it mean different things and
  get opposite responses. It also gains the rule that a message about what was
  rolled back must be derived from what happened — see the defect list at the
  end, which this change now has to touch anyway because its own new failure
  mode lands in exactly that branch.

## What is being built

1. **Before the deploy**, the release asks production whether the synthetic
   account can sign in. If it cannot, the release stops without deploying.
2. **After the deploy**, the same check runs again and reads a page that
   requires a session.

Two probes rather than one, because that is what makes the answer attributable.
A single post-deploy check cannot tell "this release broke sign-in" from "the
password in the secret store is stale", and the pipeline's response to those
two must be opposite: the first should roll back, the second must not. Asking
before deploying separates them by construction — the old image answers the
first question, and it is the one thing in the release known to work.

Through the **form**, in a browser, not through the API. Cookie flags and the
client bundle are the only failure class this change uniquely catches, and only
a browser exercises them. An API call with injected cookies would satisfy the
requirement's words while missing its purpose.

## What is not included

- **No writes to `note`.** Nothing the product would call data.
- **But signing in is not free, and the first version of this proposal was
  wrong to say "not one row".** Each sign-in inserts a `session` row
  (`shared/auth-schema.ts:45`) with a seven-day expiry, and nothing sweeps it:
  the library only deletes an expired session when something reads it, and
  nothing reads these again. So this change writes **two rows per release**,
  each expiring a week later. Accepted rather than swept: at one release an
  hour that is a few hundred rows steady-state, and `app-contract` already
  allows "only what signing in itself leaves". Written down because the
  verification below depended on the false version.
- **No sign-up in production ever again.** Exercised once, by hand.
- No invitations, no organisation switching, no email verification.

## Examination

**1. What is this for, and what happens if we skip it?** Above. Skipping it
leaves one hole: a sign-in broken only by production's own secret or its own
tables. Everything else the first draft claimed is caught earlier.

**2. What is out of scope, and will `dev` grow?** It will, and the first draft
budgeted for none of it. `release.yml:71-79` decrypts only `secrets/prod.yaml`
and the credentials live in `secrets/ci.yaml`, so the release job needs a second
decrypt path and a mask for both values. The pre-deploy probe is a new step, not
a test. Neither is test surgery, and both are in scope here. Explicitly **not**
in scope: making the same check run on the stand's migration-safety pass — see
below, it must not.

**3. How will we know it worked?** The first draft answered this entirely
post-release and therefore gave the approval gate nothing to look at. Worse,
its negative test was a production incident: pointing production's smoke at a
wrong password makes `release.yml:169` roll production back for real, then the
rollback's cascade guard reruns the same failing check
(`rollback/action.yml:82-87`) and reports *"stepping back cannot help when the
schema has moved"* — the wrong diagnosis — and the ticket is told **"Nothing has
been rolled back"** while production has been. All verified by reading.

So the negative test moves off production entirely: `ship/smoke` is run by hand
against the stand with a deliberately wrong password, and it must go red. That
proves the assertion can fail, which is all the pipeline needs — everything
downstream keys off smoke's exit code.

What a person looks at on the stand: the authenticated page, as now. What they
look at in the validation run: the pre-deploy probe passing against the stand.
The approval question is *"did the stand's run sign in before deploying and
after, and did the wrong-password run go red?"*

**4. Is there a cheaper way?** Yes, and it was not considered. A wrong-password
probe — POST sign-in, assert 401 with the credentials-named message — needs no
standing credential, no new secret, no session rows, and exercises the route,
the origin check, the account lookup and the password verifier. It was measured
against production during this examination: three 401s, then 429.

It does not cover the `Set-Cookie` → cookie carried → authenticated read
round-trip, which is exactly the gap in section one. So the honest split is:
the cheap probe covers the route, and the synthetic account buys only the
round-trip. Both are kept, because the cheap one is nearly free and fails
differently.

**5. Can this be undone by reverting it?** Not fully.

- Reverting removes the checks but not the `session` rows already written.
  Recovery, if they ever matter:
  `delete from session where user_id = (select id from "user" where email = 'smoke@onemanshow.invalid')`
  against `DATABASE_URL` in `secrets/prod.yaml`.
- If the release carrying this change fails smoke, production is rewound and a
  code revert does not move it forward; someone must release the revert, and
  until then no further automatic rollback is attempted.
- The standing credential predates this change and a revert leaves it live.
  There is **no password reset and no mail role**, so if that password leaks,
  recovery is manual and is written here rather than discovered later:
  1. encrypt a new password into `secrets/ci.yaml`;
  2. replace the stored hash, which cannot be done in SQL — the hash must come
     from the library's own hasher, so it needs a one-off script built against
     `createAuth`; or
  3. delete the user and re-create it by hand through production's form —
     noting that deleting a user cascades to sessions, accounts and memberships
     but **not** to the organisation, so each re-creation leaves an orphaned
     organisation row behind.

## Why this must not run on the migration-safety pass

That pass exists to be content-agnostic: `staging.yml` says so in its own
opening comment, and the existing smoke tests are written to it deliberately —
the release commit is asserted as a *shape*, not a value. A check that requires
a particular account row to exist is content-dependent by construction.

It is worse than that. The baseline is built by checking out **production's**
commit and running its `ship/migrate` and `ship/seed`, while the constants the
test would use come from the **review** commit. Any change that rotates a
fixture password, renames a fixture account or touches the sign-up hook would
fail its own migration-safety pass and report it as "sign-in is broken". And had
this shipped alongside the identity change itself, production's seed would have
had no accounts at all and the pass would have been impossible — so the first
draft's confidence that "the seeded one does exist" was true by accident of
release ordering.

The authenticated check therefore runs against production, and against the
stand only in the pass that is seeded at the change's own commit.

## Found by the examination, but not this change

Recorded so they are not lost. None is a reason to hold this change.

1. `open-window` branches on the release job's outcome alone, so **any** failed
   release is told "Nothing has been rolled back" — including one where the
   rollback ran. The message asserts something it never checked.
2. The rollback's cascade guard reports "the schema has moved" for any second
   failure, whatever the cause.
3. `ATTEMPT_CAP = 10` in the suite's sign-in retry is unreachable past three
   attempts: each refusal waits about 10.25s and no test timeout is set, so the
   default 30s kills the test first — and the failure reads as a hung
   application. Needs an explicit timeout above the worst case, or a cap that
   matches reality. **In scope here**, because this change reuses that helper.
4. That helper's assertion says "a seeded account must be able to sign in",
   which is wrong for the synthetic account. **In scope here.**
5. The testbed still has a stale root `deploy.yml` beside the live
   `config/deploy.yml`, declaring the removed Postgres accessory and the old
   `/health` proxy check. Two copies, one dead.
6. `trace: 'retain-on-failure'` means a failing production sign-in writes a
   trace containing the password in cleartext. Nothing uploads traces today;
   adding an upload to debug a red smoke would publish the credential.
7. `close-window` reads the smoke result of whatever production reports
   running, which after a rollback is the previous release's success. Masked
   today only because a failed release never reaches `released`.
8. `authentication`'s requirement says the throttle "counts refused attempts".
   True of a wrong password, false of a throttle refusal: a 429 does not advance
   the window.
