# Tasks

## 1. The databases exist before anything uses them

- [ ] 1.1 Create the production and staging databases with the provider and record the connection strings in `secrets/prod.yaml` and `secrets/staging.yaml`. Verify by decrypting and connecting from a workflow that does nothing else — a credential that is present and wrong is the state this project has already been bitten by
- [ ] 1.2 Record the database as a role in `ship.yml`, with the provider named. Verify `reference/roles.md` says what its absence costs, which is everything: there is no degraded mode

## 2. Staging moves first, because it is disposable

- [ ] 2.1 Create a branch for each validation and delete it afterwards. Verify by running two validations back to back and confirming the second saw no residue from the first — and that the branch count returns to its baseline
- [ ] 2.2 **Delete `reset-staging`.** Verify no workflow references it and that the validation still prepares a clean database. The action is the defect this change exists to remove; adapting it would keep the thing that reported destroying a volume nobody was using
- [ ] 2.3 Remove the SSH tunnel from the staging migration path, along with `DATABASE_URL_TUNNEL`. Verify by grep that neither the workflow nor any secret still names a forwarded port — the drift between those two copies was a real defect
- [ ] 2.4 Sweep abandoned branches in the scheduled workflow that closes windows, reporting what it swept and what it left. Verify by leaving a branch behind on purpose and watching the next run remove it. Without this the branch limit is reached by accident and validation stops for a reason nobody can see

## 3. The endpoints come apart

- [ ] 3.1 Add a liveness endpoint that reports the process is serving and which commit it is, and touches no database. Verify against a deployed instance with the database unreachable: liveness answers, readiness does not
- [ ] 3.2 Point the external monitor and the proxy's health check at liveness. Verify the database's compute activity shows it sleeping — that graph is the whole point of this group
- [ ] 3.3 Move the deep readiness check into the release as an explicit step, after the deploy and before smoke. Verify it **refuses** a container whose schema is ahead of its code: that is the state a rollback leaves, it is what the conditional rollback decision rests on, and it must fail visibly in the pipeline rather than implicitly in a proxy setting
- [ ] 3.4 Make the guard that production and main agree, and the configuration redeploy, read liveness rather than readiness. Verify both still work while production is unhealthy — identity is exactly what is needed when things are broken

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

- [ ] 6.1 Measure how long a sleeping database takes to answer, and whether smoke's timeouts survive it. Verify by letting staging sleep and then running smoke. A cold start read as a failed deploy would trigger the rollback decision, which makes this the most expensive flake available
- [ ] 6.2 Drive an ordinary change end to end afterwards — queue to closed, a person doing only the two gates. **This is the test of the whole change.** Anything less specific is not evidence that the move broke nothing
- [ ] 6.3 Confirm the weaker guarantee is gone rather than assumed: verify staging cannot name production's database, and that the spec no longer claims separation-of-storage-without-separation-of-reach for a project on a managed provider
