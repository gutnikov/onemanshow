# Tasks

## 1. The databases exist before anything uses them

- [x] 1.1 Create the production and staging databases with the provider. **The connection strings are not stored** — the provider can be asked for them with the API key, so a second copy is not created, and it must be asked with `pooled=false` because the default answer is the pooler that a long-lived container does not want. Production's string will enter `secrets/prod.yaml` at task 4.2, when production actually moves, so `DATABASE_URL` has one meaning at every moment. Verified in CI: the key sees exactly the two projects, the provider returns a direct string, and a real connection is opened. Originally: record the connection strings in both secret files
- [x] 1.2 Record the database as a role in `ship.yml`, with the provider named. Verify `reference/roles.md` says what its absence costs, which is everything: there is no degraded mode

## 2. Staging moves first, because it is disposable

- [x] 2.1 A branch per **change**, not per validation, created or reused and emptied by restoring it to the parent. Verified by two validations of the same change back to back: the second reused the branch, emptied it, and reported `verified empty: 0 tables` both times. **The first attempt deleted the branch when the validation ended, and that was wrong**: the application stayed deployed against a database that no longer existed, so the stand answered `database-unreachable` the moment the run went green — and the stand is what the next step asks a person to inspect. Found by opening it, not by any check. Originally: create a branch for each validation and delete it afterwards
- [x] 2.2 **Delete `reset-staging`.** Verify no workflow references it and that the validation still prepares a clean database. The action is the defect this change exists to remove; adapting it would keep the thing that reported destroying a volume nobody was using
- [x] 2.3 Remove the SSH tunnel from the staging migration path, along with `DATABASE_URL_TUNNEL`. Verify by grep that neither the workflow nor any secret still names a forwarded port — the drift between those two copies was a real defect
- [x] 2.4 Sweep abandoned branches in the scheduled workflow that closes windows, reporting what it swept and what it left. Verify by leaving a branch behind on purpose and watching the next run remove it. Without this the branch limit is reached by accident and validation stops for a reason nobody can see

## 3. The endpoints come apart

- [x] 3.1 Add a liveness endpoint that reports the process is serving and which commit it is, and touches no database. Verify against a deployed instance with the database unreachable: liveness answers, readiness does not
- [ ] 3.2 Point the external monitor and the proxy's health check at liveness. Verify the database's compute activity shows it sleeping — that graph is the whole point of this group. **The proxy is done and deployed; the monitor is a change in the provider's interface and is the last thing standing between this and a sleeping database.** Until it moves, production's database is woken every five minutes by the check that exists to notice it dying
- [x] 3.3 Move the deep readiness check into the release as an explicit step, after the deploy and before smoke. Verify it **refuses** a container whose schema is ahead of its code: that is the state a rollback leaves, it is what the conditional rollback decision rests on, and it must fail visibly in the pipeline rather than implicitly in a proxy setting
- [x] 3.4 Make the guard that production and main agree, and the configuration redeploy, read liveness rather than readiness. Verify both still work while production is unhealthy — identity is exactly what is needed when things are broken

## 4. Production moves, reversibly

- [ ] 4.1 Take a dump of the existing production database and keep it outside this pipeline before anything points elsewhere. Verify by restoring it into a scratch database, not by the file existing
- [ ] 4.2 Point production at the managed database and deploy. Verify the page serves and readiness passes
- [ ] 4.3 Delete the accessories, the tunnels, and the database from `provision/bootstrap.sh` — **last**, so that 4.2 could be reversed by pointing a connection string back. Verify a fresh run of bootstrap provisions a machine that runs the application and no database

## 5. Recovery covers both losses

- [ ] 5.1 Dump from the managed database in the scheduled pipeline, encrypt to the project's age recipients, and place it on the machine outside anything the application can read. Verify the file is encrypted **by content**, and verify the application cannot read the path — the first was claimed once and was false
- [ ] 5.2 Enforce a retention limit when writing, not by a separate cleanup. Verify by filling the limit and watching the oldest go: a backup that fills the disk causes the outage it exists to survive, and on this machine that is not theoretical
- [ ] 5.3 Report on every backup run, including runs with nothing to say. Verify by disabling the schedule and confirming the absence is noticeable
- [ ] 5.4 Write down what the provider's recovery window actually is on the current plan, next to the retention of the dump. Verify the two numbers appear together, because each is meaningless about the other

## 6. Verification

- [ ] 6.1 Measure how long a sleeping database takes to answer, and whether smoke's timeouts survive it. **First numbers, taken 2026-08-26:** from a laptop, a cold connect took 2481ms and steady queries 44ms; from a runner, connect-and-query took 961ms and the second query 94ms. So waking costs roughly one to two and a half seconds. Liveness is unaffected because it will not touch the database. Smoke pays it once on its first request after a deploy, which is inside ordinary HTTP patience — so the risk looks real but modest, and the number to watch is whether it grows once there is data. Still open until measured against staging after it moves. Originally: Verify by letting staging sleep and then running smoke. A cold start read as a failed deploy would trigger the rollback decision, which makes this the most expensive flake available
- [ ] 6.2 Drive an ordinary change end to end afterwards — queue to closed, a person doing only the two gates. **This is the test of the whole change.** Anything less specific is not evidence that the move broke nothing
- [ ] 6.3 Confirm the weaker guarantee is gone rather than assumed: verify staging cannot name production's database, and that the spec no longer claims separation-of-storage-without-separation-of-reach for a project on a managed provider
