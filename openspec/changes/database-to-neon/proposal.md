## Why

The database lives in a container on the same machine as both environments, and almost every defect found in two days of running this pipeline lived in the machinery around that arrangement.

The two environments were isolated only by credentials. Reaching the database to migrate it needed an SSH tunnel whose address was written in two places and drifted. Resetting staging meant destroying a data plane, and the code that did it removed a named volume while the accessory kept its data in a bind mount — so for an entire run it destroyed nothing and reported success, and the following create made the fiction check out.

A managed database removes the machinery rather than fixing it. What is left to design is not the database but two consequences: what watches it when it is asleep, and what staging is made of when it is no longer a volume to destroy.

## What Changes

- **Managed Postgres.** Both environments get their own database from the provider rather than two accessories on one host, so the boundary between them is the provider's rather than a password.
- **Staging is a branch, created for each validation and deleted after.** The `reset-staging` action is **deleted**. Its whole purpose was to prove a volume was gone, and it is the single most defect-prone piece of the pipeline.
- **The SSH tunnel leaves the migration path.** `DATABASE_URL_TUNNEL` disappears, and with it the port that lived in a workflow and a secret at once.
- **Production's database is allowed to sleep**, which requires that nothing poll it continuously:
  - a shallow liveness endpoint, reporting that the process is serving and which commit it is, touching no database;
  - the deep readiness check moves to an **explicit step in the release**, after the deploy and before smoke, rather than being an implicit consequence of the proxy's health check. A load-bearing check should be visible in the pipeline, not a side effect of a setting.
- **BREAKING for the reference app:** the health endpoint splits in two. The guard that production and main agree, and the configuration redeploy, read the shallow one — they ask what is running, which is identity rather than readiness, and they must work while production is unhealthy.
- **The backup changes shape.** It is no longer a dump reachable only over SSH, and the provider has its own recovery window. Whether that replaces the dump or merely shortens it is decided here rather than assumed.

## Capabilities

### New Capabilities
<!-- None. This moves where the database lives; every requirement it touches already exists. -->

### Modified Capabilities
- `delivery-pipeline`: how the staging data plane is built and reset, and how migrations reach each environment.
- `app-contract`: liveness and readiness become separate questions with separate endpoints, and which one the pipeline asks for what.
- `reference-app`: the endpoints the reference application exposes.
- `project-bootstrap`: the machine no longer hosts a database, so what provisioning has to establish changes.

## Impact

`config/deploy.yml` and its staging override, `staging.yml`, `release.yml`, `backup.yml`, the `reset-staging` action (deleted), `api/routes.ts`, `api/readiness.ts`, `db/client.ts`, `secrets/*.yaml`, `ship.yml`, and `provision/bootstrap.sh`. The skill's `06-staging.md`, `08-deploy.md` and `reference/roles.md`.

No change to the lifecycle, the guards, or the reactive layer. That is deliberate: the pipeline proved itself yesterday, and the way to know this move broke nothing is that a change afterwards travels exactly as it did before.
