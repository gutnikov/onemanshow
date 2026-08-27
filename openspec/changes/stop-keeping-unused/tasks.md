# Tasks

## 1. The two credentials, and the list they live in

- [x] 1.1 `POSTGRES_PASSWORD` leaves `secrets/prod.yaml` and `secrets/staging.yaml`; `DATABASE_URL_TUNNEL` leaves `secrets/prod.yaml`. Verify by decrypting both files and reading the list, not by trusting the edit **Done.** Verified by decrypting both files: `prod.yaml` now holds exactly what the deploy tool declares, with the one name the store calls differently, and `staging.yaml` the same without `DATABASE_URL` — which it should not have
- [x] 1.2 The two remaining hand-written `-e` lists in the rollback action are **deleted**, not shortened: those calls go through the shared action, which derives the names from `.kamal/secrets` and refuses one that is declared with no value. Shortening the list leaves a live copy of the defect that stopped a rollback booting the application this morning **Done, by deleting them.** Both remaining hand-rolled `docker run` calls are gone: they read a value, so the shared action gained a `capture` input and an output first, and only then could the lists go. Capture is opt-in because a captured deploy stops streaming, and a deploy that takes minutes should be watchable while it runs
- [ ] 1.3 Verify a rollback still loads its configuration — through the shared action's own refusal, because nothing declares the removed name to the deploy tool and so nothing could have noticed its absence. The first draft's version of this task was a check that cannot fail

## 2. The example files, in both directions

- [x] 2.1 All four stop prescribing the two dead credentials — the instance's two and the template's two, not just the instance's as the first draft said **Done**, all four
- [x] 2.2 Three of the four gain `BETTER_AUTH_SECRET`, which `.kamal/secrets` declares and the deploy fails without. This is the same omission that made a rollback unable to boot the application, sitting in the file that documents the shape **Done.**
- [x] 2.3 The template's `staging.example.yaml` stops prescribing a staging `DATABASE_URL`. `verify-secrets` already warns that a stored value there is a trap, because staging's database is a branch created per validation **Done.**
- [x] 2.4 **Something compares the examples with the reality.** All three defects above survived because nothing does. The existing checker compares the two `.kamal/` files to each other; verify the new check by removing a name from an example and watching it fail **Done, and it fails both ways.** `check-kamal-secrets.py` now compares the examples with what the deploy tool declares. Constructed: remove a declared name from an example and it reports the example cannot deploy; add a name nothing declares and it reports that an example is how a dead credential reaches a new project. Restored, zero

## 3. The workflow that keeps reading a value this instance no longer has

- [x] 3.1 `adopt-database.yml` says what is missing instead of failing inside `sops`. The pattern is eight lines below the broken one, in the same file **Done** — the same shape as its neighbour eight lines below, which had it right all along
- [x] 3.2 **Decided the other way, and the checker forced the question.** Putting `DATABASE_URL_TUNNEL` into the example would now be reported as a name nothing declares — correctly, because it is not a steady-state credential. It exists only while a project still has a database on its machine. So the example describes the steady state and the workflow says what to add for the move, which is where the instruction belongs

## 4. The prose that caused the first draft's worst error

- [x] 4.1 `gates.md` stops spelling out the deployable-path exclusions and points at the script that reads them from the trigger. **Done in this change already**, because the stale list is what made the first draft claim this change does not deploy **Done.**
- [x] 4.2 And it says that an excluded path does not mean no deploy: a `secrets/**` commit reaches production through the reconfigure workflow, which that workflow's own header explains **Done.**

## 5. What this change actually costs, said out loud

- [x] 5.1 **Made impossible instead of checked.** The question was whether a reconfigure can leave two containers at the same version, which would make "roll back to the second newest" mean "boot what is already booted" — succeeding, achieving nothing, and reading downstream as a completed rewind. Rather than establish whether the machine is currently in that state, the rollback now refuses when the previous version is the one production already runs, and says why. Nothing to roll back to is a refusal, not a no-op. Exercised both ways as shell before it went in
- [ ] 5.2 Record in the thread at the merge: one production redeploy of the version already running, no automatic recovery on that path by design, and **no unblocking of the eight tasks waiting elsewhere** — six of them wait on a deployable release, which this is not
