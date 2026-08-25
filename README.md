# onemanshow

A template for one person shipping a product: a reference application, a
delivery pipeline that carries it to production, and the rules the pipeline
enforces. Create a repository from this one and you get all three.

It costs about €10 a month to run — one VPS and, optionally, a domain.
Everything else sits on free tiers.

## First steps in a new project

1. **Clear the template's planning history.** `openspec/changes/` holds *our*
   change artifacts, which are noise in your project:
   ```
   git rm -r --cached openspec/changes && rm -rf openspec/changes
   ```
   The `ship` skill's `init` will do this for you once it exists.

2. **Replace the placeholders.** `grep -rn REPLACE_ME .github/ config/` and
   `.sops.yaml` — the registry path, the host names, and the age recipients.

3. **Generate your own age keys.** Never keep the ones a template ships with;
   recipients in a template mean somebody else can read your secrets.
   See `secrets/README.md`.

4. **Provision the machine.** `ssh root@HOST 'sh -s' < provision/bootstrap.sh`.
   Run it again after adding a key — it refuses to disable password login while
   no key is present.

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

**Staging is reset before every use.** Its data is synthetic and predictable, and
that is the point — a reset that quietly destroys nothing is worse than none,
because everything downstream then validates against accumulated state.
