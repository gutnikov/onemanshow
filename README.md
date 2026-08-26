# onemanshow

A template for one person shipping a product: a reference application, a
delivery pipeline that carries it to production, and the rules the pipeline
enforces. Create a repository from this one and you get all three.

It costs about €10 a month to run — one VPS and, optionally, a domain.
Everything else sits on free tiers.

## First steps in a new project

**Ask the `ship` skill to `init` first.** It compares the roles below against
what your repository actually shows and turns the difference into tickets you
can work through, in an order that reaches a live deployment before it makes it
correct. The steps here are what it will walk you through; they are listed so you
can see the shape of it, and so you can do it by hand if you would rather.

1. **Clear the template's planning history.** `openspec/changes/` holds *our*
   change artifacts, which are noise in your project:
   ```
   git rm -r --cached openspec/changes && rm -rf openspec/changes
   ```

2. **Copy your workflows in, then replace the placeholders.** The files in
   `templates/github-workflows/` are yours, not the template's:
   ```
   cp templates/github-workflows/on-*.yml .github/workflows/
   grep -rn REPLACE_ME .github/ config/ .sops.yaml
   ```
   The registry path, the host names, and the age recipients. They are kept out
   of `.github/workflows/` here so they do not run in the template itself with
   placeholder values — see that directory's README.

3. **Generate your own age keys.** Never keep the ones a template ships with;
   recipients in a template mean somebody else can read your secrets.
   See `secrets/README.md`.

4. **Get a database.** Two of them, one per environment, from a managed
   provider — the machine does not host one. Every other role degrades when it
   is missing; this one does not. Without a database the application cannot
   start, readiness cannot pass, and no stage runs, so it belongs here rather
   than in a list of improvements.

5. **Provision the machine.** `ssh root@HOST 'sh -s' < provision/bootstrap.sh`.
   Run it again after adding a key — it refuses to disable password login while
   no key is present.

6. **Three settings in the repository itself.** None is code, all three fail as
   something else:

   - **The status and `blocked:` labels must exist.** The whole state machine is
     read from them, so a missing label makes the transition that applies it
     fail — and a swallowed failure announces a blocked change in a comment
     while the ticket shows nothing, which the merge guards then read as no
     incident.
   - **Workflow permissions must allow write.** A workflow asking for more than
     the repository's default fails *before any job exists* — a startup failure
     with no log to read. The workflows then declare their own narrower
     permissions; the setting only makes the request possible.
   - **Protect the default branch.** Every merge guard is bypassed by a direct
     push, and pushing directly is easier than not. Without protection the
     guards constrain only the automation that was going to obey them.

## What the pipeline expects from your application

Six executable files. The pipeline calls them and never learns what your project
is written in.

| Hook | Does | If absent |
|---|---|---|
| `ship/check` | everything needing no running app | stage skipped |
| `ship/build` | produce one image | falls back to the Dockerfile |
| `ship/migrate` | apply migrations | no database assumed |
| `ship/seed` | write synthetic fixtures | nothing to seed |
| `ship/e2e` | test against `$SHIP_URL` | staging becomes human-only |
| `ship/smoke` | non-mutating checks against `$SHIP_URL` | `GET /` expecting 2xx |
| `ship/signin` | sign in against `$SHIP_URL`, read-only | signing in goes unexercised, and the release says so |

`ship/signin` is separate from `ship/smoke` because smoke also runs against the
stand on a pass that deliberately asserts nothing about content, and a check
that needs a particular account to exist is content. The release runs it twice,
before and after the deploy: a failure before means the stored credential, a
failure after means this change, and those want opposite responses. A green pair
means the session round trip works in production — not that identity does.

## Rules worth knowing before you fight them

**Merges must be fast-forward.** A merge commit, a squash or a rebase produces a
commit that was never built, leaving nothing to promote without rebuilding — and
a rebuilt image is not the one that passed validation.

**One change at a time.** Attribution is the whole point: when production
breaks, you know exactly which change did it.

**Rolling back an image does not roll back configuration or schema.** Anything
living outside the artifact is not restored by rewinding the artifact. Rollback
is two steps: return the previous image to stop the bleeding, then revert through
the pipeline, which is what actually restores the rest.

**Two decisions are yours and nothing takes them.** Whether a change is worth
doing, and whether it was done well. Everything between those two happens
without you asking: the queue is picked up, the change is validated, the guards
are checked, the merge is made, the release goes out, and the observation window
closes itself. If you find yourself performing a transition by hand, something
is disabled — and it will still be readable and doable, just slower.

**Staging gets a fresh database, not a cleaned one.** It is created for the
change under review and emptied by the provider between the two validation runs,
and both times the pipeline checks that it is actually empty. That check is not
ceremony: an unemptied database makes every migration count as applied, so the
seed writes into the previous run's data and the validation is green and
meaningless. The code this replaced removed a volume nothing was using and
reported success for an entire run.

**Its data is synthetic on purpose.** A branch of production's data would be
cheaper and would put real user data where a browser and a test suite can reach
it.
