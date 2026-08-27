# Tasks

## 1. Decide before deleting anything irreversible

- [ ] 1.1 Settle how the rollback target is protected: keeping the newest N is a proxy that is wrong precisely when production is behind main, which is the case a rollback exists for. Either the job asks the machine, or the rule is written so that being wrong costs nothing
- [ ] 1.2 Settle whether a scheduled job may delete at all, given that destructive actions get one attempt and then a person. Dispatch-only, or scheduled-but-reporting until somebody agrees once
- [ ] 1.3 Settle the rule's clock. The mirrored rollback target is recent by push time and old by commit date, and a rule written against the wrong one deletes it

## 2. The credentials that outlived their reason

- [ ] 2.1 `POSTGRES_PASSWORD` leaves `secrets/prod.yaml` and `secrets/staging.yaml`; `DATABASE_URL_TUNNEL` leaves `secrets/prod.yaml`. Verify by decrypting both files afterwards and reading the list
- [ ] 2.2 The two `-e POSTGRES_PASSWORD` leave the rollback action. Verify a rollback still loads its configuration — the deploy tool fails at config load when a declared secret is absent, which is how this would announce itself
- [ ] 2.3 The instance's own `secrets/*.example.yaml` stop describing a shape that no longer exists
- [ ] 2.4 **The four occurrences that stay, stay on purpose**: the throwaway container's own password in `backup.yml`, local development in `compose.yml`, the comment in `check-kamal-secrets.py`, and `adopt-database.yml`'s use of the tunnel for instances that have not moved. Each gets a line saying so where a search for the name will meet it
- [ ] 2.5 `adopt-database.yml` says what is missing when the tunnel value is absent, instead of failing inside `sops` with nothing a reader can act on

## 3. Retention

- [ ] 3.1 A job that deletes old image versions, subject to the requirement that already exists: never what production runs, read from production rather than assumed; never fewer kept than the deploy tool keeps containers; and nothing deleted at all if production cannot be asked
- [ ] 3.2 **Verify it refuses.** Point it at an unreachable production and confirm it deletes nothing and says why. A retention job that has only ever deleted is not known to be safe
- [ ] 3.3 **Verify it keeps the rollback target**, by name, in a run that also deletes something else
- [ ] 3.4 Verify what it deleted by asking the registry afterwards, not by reading the job's own summary

## 4. The thing this change deliberately does not do

- [ ] 4.1 Record in the ticket thread, at the merge, that this produced no release and that the rollback rehearsal is still waiting. The state is readable from the tools, but a person reading the thread should not have to derive it
