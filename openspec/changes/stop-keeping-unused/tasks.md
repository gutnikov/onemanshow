# Tasks

## 1. The credentials that outlived their reason

- [ ] 1.1 `POSTGRES_PASSWORD` leaves `secrets/prod.yaml` and `secrets/staging.yaml`; `DATABASE_URL_TUNNEL` leaves `secrets/prod.yaml`. Verify by decrypting both files afterwards and reading the list
- [ ] 1.2 The two `-e POSTGRES_PASSWORD` leave the rollback action. Verify a rollback still loads its configuration — the deploy tool fails at config load when a declared secret is absent, which is how this would announce itself
- [ ] 1.3 The instance's own `secrets/*.example.yaml` stop describing a shape that no longer exists
- [ ] 1.4 **The four occurrences that stay, stay on purpose**: the throwaway container's own password in `backup.yml`, local development in `compose.yml`, the comment in `check-kamal-secrets.py`, and `adopt-database.yml`'s use of the tunnel for instances that have not moved. Each gets a line saying so where a search for the name will meet it
- [ ] 1.5 `adopt-database.yml` says what is missing when the tunnel value is absent, instead of failing inside `sops` with nothing a reader can act on

## 2. The thing this change deliberately does not do

- [ ] 2.1 Record in the ticket thread, at the merge, that this produced no release and that the rollback rehearsal is still waiting. The state is readable from the tools, but a person reading the thread should not have to derive it
