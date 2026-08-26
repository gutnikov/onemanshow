## Context

Two days of running this pipeline produced nineteen defects, and a disproportionate share lived in the machinery around a self-hosted database: the tunnel whose port was written twice and drifted, the reset that removed a volume the accessory was not using, the two environments separated by a password on one host. See `openspec/specs/delivery-pipeline` for what those requirements look like now.

This change does not improve that machinery. It removes it.

## Goals / Non-Goals

**Goals:**
- The boundary between environments is the provider's, not a credential.
- No SSH in the path from a workflow to a database.
- Preparing staging cannot fail silently, because there is nothing to destroy.
- Production's database may sleep, so the free tier is a runway rather than a countdown.
- Recovery covers both a bad statement and a lost account.

**Non-Goals:**
- Real production data on staging. Cheap now, and refused: the fixture stays synthetic.
- Any change to the lifecycle, the guards, or the reactive layer. They were proved yesterday and are the control in this experiment.
- Shrinking the machine. It becomes possible; it is not part of this.

## Decisions

**Staging is a branch created per validation, and deleted after.** Chosen over one long-lived branch that gets emptied, because "created" needs no proof while "emptied" does — and the code that proved it is the defect this change exists to delete. The cost is a limit: ten branches on the free tier, and a failed run leaves one behind. So abandoned branches are swept by the scheduled workflow that already closes observation windows, already runs every ten minutes, and already reports what it found. A limit reached is then a visible event rather than a validation that mysteriously stops working.

**The production database is allowed to sleep, which forces the endpoints apart.** A readiness check on a short interval keeps a sleeping database awake permanently: our own liveness monitor, at five minutes, would consume the entire free tier's compute on health checks with no users. So liveness becomes shallow — process serving, commit reported, no database — and readiness stays deep.

**The deep check moves into the release as an explicit step.** It is currently the proxy's health check path, which makes a load-bearing guarantee an implicit consequence of a setting. It is load-bearing: readiness detecting a schema *ahead* of the code is what makes a bad rollback fail, and that is the mechanism the conditional rollback decision rests on. Whether the proxy polls it continuously is a fact we do not have — and this design makes the fact irrelevant, which is better than depending on it either way.

**What is given up is stated in the spec rather than discovered later.** Between deployments nothing watches the database. A database failure with no traffic shows a green liveness check and no new errors, because there were no requests to fail. Accepted for a product whose own health window says a quiet hour proves nothing — but it is a trade, not a solved problem, and the first real users change the calculation.

**Recovery is two mechanisms, and the dump goes on the machine.** The provider's point-in-time recovery answers "the wrong statement ran"; the dump answers "an account is gone". After this change the machine has nothing to do with the database, so a dump on it survives losing GitHub and losing the database provider — the two losses that matter. It does not survive losing the machine's provider, and destroying the data then requires two unrelated providers failing at once, against a host that is the cheap thing to rebuild.

**The dump is taken by the pipeline, not by a cron on the machine.** A cron would keep the data out of the code host entirely, which is cleaner in principle. It is also the classic thing that stops silently. The pipeline's runs are visible in a list, and the dump is encrypted before it leaves the runner, so the cleanliness bought by the cron is mostly theoretical while the visibility bought by the pipeline is not.

## Risks / Trade-offs

**A sleeping database means cold starts, and the liveness timeout is five seconds.** Liveness no longer touches the database, so it is not exposed — but smoke is, and smoke runs immediately after a deploy when the database may be cold. If smoke flakes on cold starts it will be read as a broken deploy, which is the worst kind of false signal because it triggers the rollback decision. Wants measurement before the timeouts are tuned.

**Branch creation is now on the critical path of every validation.** A provider incident stops validation entirely, where a local container did not. In exchange, a local container is what produced the reset defect. The pipeline already distinguishes an environment's failure from a change's failure and has somewhere to put it: `blocked:external`.

**Free-tier limits become operational facts.** Ten branches, 0.5 GB, 100 CU-hours. None is close for a reference application, and all three are cliffs rather than slopes — so the sweep of abandoned branches is not housekeeping, it is the thing that stops a cliff being reached by accident.

**Better Auth follows this change and will put session traffic against a sleeping database.** Not in scope here, but it is the reason to get the sleeping right rather than to work around it: every authenticated request wakes the database, so the decision to keep sessions in the database is a decision about wake-ups, taken deliberately for a product with no users yet.

## Migration Plan

The order matters and the reason is verification, not safety.

1. Provision the databases and put their connection strings in the secrets. Nothing uses them yet.
2. Move **staging** first. It is disposable, it is exercised by every validation, and a mistake there costs a rerun. The reset action is deleted at this step, not before.
3. Split the endpoints, and move the deep check into the release. Verify by deploying and watching the release refuse a container whose schema is ahead — the state a rollback leaves, which is the one that must still be caught.
4. Move **production**, with a dump taken from the old database first and kept.
5. Delete the accessories and the tunnels. Not before, so that step 4 can be reversed by pointing the connection string back.
6. Then drive an ordinary change end to end. **That is the test.** If it travels exactly as it did before — queue to closed with a person doing only the two gates — the move broke nothing. Anything less specific than a full pass is not evidence.

Rolling back means pointing the connection strings at the old accessories, which is why they are deleted last.

## Open Questions

- The cold-start numbers, partly answered before the move. Waking costs about one to two and a half seconds; steady queries cost 44ms from a laptop and 94ms from a runner, against roughly 1ms when the database was on localhost. The wake does not threaten smoke, which pays it once. What did change and was not anticipated: **every query now crosses a network.** The reference application makes one query per page and does not care, but an application making twenty per request has just had that cost multiplied by an order of magnitude, and the pattern that used to be merely untidy is now expensive. Worth stating in the template rather than discovered by whoever writes the twentieth query.
- Whether the machine can be smaller afterwards. A separate decision, taken on evidence rather than in advance.
