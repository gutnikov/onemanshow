# Tasks

## 1. The two credentials, and the list they live in

- [ ] 1.1 `POSTGRES_PASSWORD` leaves `secrets/prod.yaml` and `secrets/staging.yaml`; `DATABASE_URL_TUNNEL` leaves `secrets/prod.yaml`. Verify by decrypting both files and reading the list, not by trusting the edit
- [ ] 1.2 The two remaining hand-written `-e` lists in the rollback action are **deleted**, not shortened: those calls go through the shared action, which derives the names from `.kamal/secrets` and refuses one that is declared with no value. Shortening the list leaves a live copy of the defect that stopped a rollback booting the application this morning
- [ ] 1.3 Verify a rollback still loads its configuration — through the shared action's own refusal, because nothing declares the removed name to the deploy tool and so nothing could have noticed its absence. The first draft's version of this task was a check that cannot fail

## 2. The example files, in both directions

- [ ] 2.1 All four stop prescribing the two dead credentials — the instance's two and the template's two, not just the instance's as the first draft said
- [ ] 2.2 Three of the four gain `BETTER_AUTH_SECRET`, which `.kamal/secrets` declares and the deploy fails without. This is the same omission that made a rollback unable to boot the application, sitting in the file that documents the shape
- [ ] 2.3 The template's `staging.example.yaml` stops prescribing a staging `DATABASE_URL`. `verify-secrets` already warns that a stored value there is a trap, because staging's database is a branch created per validation
- [ ] 2.4 **Something compares the examples with the reality.** All three defects above survived because nothing does. The existing checker compares the two `.kamal/` files to each other; verify the new check by removing a name from an example and watching it fail

## 3. The workflow that keeps reading a value this instance no longer has

- [ ] 3.1 `adopt-database.yml` says what is missing instead of failing inside `sops`. The pattern is eight lines below the broken one, in the same file
- [ ] 3.2 The template's `prod.example.yaml` carries the name that workflow reads. The first draft justified keeping the workflow by a path that has been broken in the template since it shipped — the example never had the name

## 4. The prose that caused the first draft's worst error

- [ ] 4.1 `gates.md` stops spelling out the deployable-path exclusions and points at the script that reads them from the trigger. **Done in this change already**, because the stale list is what made the first draft claim this change does not deploy
- [ ] 4.2 And it says that an excluded path does not mean no deploy: a `secrets/**` commit reaches production through the reconfigure workflow, which that workflow's own header explains

## 5. What this change actually costs, said out loud

- [ ] 5.1 Before merging, check on the machine whether a reconfigure can leave two containers at the same version. If it can, the rollback's success check compares the second-newest to the newest, finds them equal, and reports a rewind that never happened — the defect two attempts were spent on this morning, reachable through the trigger this change fires
- [ ] 5.2 Record in the thread at the merge: one production redeploy of the version already running, no automatic recovery on that path by design, and **no unblocking of the eight tasks waiting elsewhere** — six of them wait on a deployable release, which this is not
