# Tasks

## 1. The transitions that need no judgment

- [x] 1.1 A workflow that moves a change to `staging` and starts the validation when `check` and the build are green on its commit. Verify by pushing a passing commit on a change in `dev` and observing the label move and the validation start with nobody asking
- [x] 1.2 A workflow that records the validation's outcome in the thread — the stand's address on green, what failed and where on red — and notifies only on red or on green-awaiting-approval. Verify both paths by forcing each outcome
- [x] 1.4 Move a change to `released` when its release succeeds, which is what opens the observation window — the window being the interval in which a change is released and not yet closed. Verify by releasing a change and observing the label and the note appear with nobody asking. **Missing from this list until implementation reached it**, even though the proposal names releasing and opening the window as automation's work
- [ ] 1.5 Decide whether a failed post-deploy smoke rolls back automatically. Today it marks `blocked:rollback` and rolls nothing back, which is deliberate but weaker than `08-deploy.md` promises: rewinding an artifact restores neither configuration nor schema, and if the migration has run the previous image may not work against the schema it finds, so "step back until it works" is a cascade that never terminates. If it is automated it must carry its "once, then a person" bound explicitly. Verify by forcing a smoke failure and observing exactly one step and a stop
- [x] 1.3 A workflow that closes a ticket as not planned when its pull request is closed unmerged. Verify by closing a draft pull request and observing the ticket close with that reason and no other change

## 2. The merge, where the guards can refuse

- [x] 2.1 Read all six guards from the tools in one place, each reported by name with what it found. Verify by running it against the change of 2026-08-25, which satisfied all six, and confirming it says so per guard rather than in aggregate
- [x] 2.2 Make the green-pipeline guard check the sha the validation was given rather than the commit the run reports. Verify with a dispatched validation: the run reports the default branch, and the guard must still be evaluating the change's commit
- [x] 2.3 Fast-forward the merge when all six hold, and refuse naming the failing guard when one does not. Verify the refusal by deliberately leaving production behind the last deployable commit
- [x] 2.4 Verify a guard can actually fail: for each of the six, construct the state that violates it and confirm the merge is refused. A guard nobody has seen refuse is not known to work

## 3. The window closes itself

- [ ] 3.1 A scheduled workflow that finds changes in `released` whose window has elapsed, consults every configured source, closes the ticket as completed, and names any source that was unavailable. Verify by releasing a change and leaving it alone. **The evaluation already exists** in `.github/actions/health-window` and is referenced by no workflow — it is the only composite action in the repository that nothing calls, which is why the window has been evaluated by hand. Wire it rather than write it, and read its verdict from its exit code
- [x] 3.2 Verify the window evaluation can report unhealthy, one source at a time: a failed smoke, an unreported smoke, a new issue in the release, reported downtime, a declared monitor that does not exist, and a monitor that exists while the configuration declares none. Each must give a non-zero exit. Done once by hand on 2026-08-25 and worth keeping as a test rather than a memory
- [ ] 3.3 Take up the head of the queue when the segment frees, and say so when the queue is empty. Verify with two changes queued: the second must start without anyone asking. Verify the empty case too — silence and a stopped queue must be distinguishable
- [x] 3.4 Report on every run, including runs that found nothing to do, so a stopped schedule is distinguishable from a quiet one. Verify by disabling the schedule and confirming the absence is noticeable
- [x] 3.5 An inbound dispatch endpoint for an external liveness signal, admitting only whitelisted fields. Verify by sending a payload containing free text and confirming none of it reaches the thread

## 4. Applying a change that is not an artifact

- [ ] 4.0 Give configuration a way to reach production. A change to `secrets/**` alters what the container is given at deploy time but produces no new image, so the release has nothing to promote and fails — which is what happened on 2026-08-25, unnoticed for twenty minutes, and was surfaced by the fourth guard rather than by anyone reading the red run. Excluding secrets from the trigger stops the failed release and leaves the real gap: a rotated credential does not reach production until something redeploys the running artifact, and until the old credential is revoked nothing looks wrong. Needs a path that redeploys the current version with current configuration — the rollback action already does something close. Verify by rotating a credential and observing production pick it up

## 5. Bounding repetition

- [x] 5.1 Count a change's automatic actions from what the tools already record, and reset the count on any human action. Verify the reset by acting as a person mid-sequence
- [x] 5.2 Refuse an automatic action when the budget is exhausted, moving the change to `blocked` with the cause. Verify by exhausting it deliberately — the task this replaces was left open for years-equivalent because nothing could exhaust it, so the test is the point
- [x] 5.3 Keep the destructive limits separate and absolute: one rollback step, one merge per ticket, one production migration per deploy. **Two verified, one audited only.** The merge is idempotent — a head already on main is reported as nothing to do — and the guards refuse a second attempt anyway, because production no longer matches. The release migrates once per run. The rollback's refusals are in `.github/actions/rollback/action.yml` and are the right shape: a rollback of a rollback is refused by comparing production to main rather than by a stored flag, so nothing has to remember. **Not exercised**, because exercising it means rolling production back to see whether the second attempt is refused. It wants a way to be tested that does not involve breaking production first, which is a real gap and not a formality — every check in this project that had never failed turned out to be unable to

## 6. The skill catches up

- [x] 6.1 Update `reference/gates.md` so the guards are described as enforced, and by what. Verify no playbook still tells the reader to check something automation now refuses
- [x] 6.2 Update `04-ready-for-dev.md`, `07-approve.md` and `09-stabilize.md` where they describe work automation now does. Verify by re-reading each as someone arriving cold: it must not claim credit for a transition it no longer performs, nor leave one unowned
- [x] 6.3 **Not moved, and `templates/README.md` says why.** Each message lives in the script for its own transition, beside the condition that sends it, where the two cannot drift; moving the text into `templates/` would separate a message from its rule and add indirection to read through. The property the requirement is for — that this wording is versioned with the playbooks and reproduces no external payload — holds either way. Recorded as a deviation rather than silently satisfied. Originally: move the wake and notification wording into `templates/`, versioned with the playbooks, since everything automation writes is read by the agent as context. Verify the templates contain no interpolation of an external payload
- [x] 6.4 Record in bootstrap that branch protection is required, since every guard here is bypassed by a direct push to main. Verify against a project set up from the template that a direct push is refused

## 7. Verification

- [ ] 7.1 Drive one change end to end with no person performing a transition other than the two gates. Verify each transition happened without being asked, and that the thread reads coherently to someone opening it cold
- [ ] 7.2 Disable each workflow in turn and confirm the transition falls back to a person rather than the change becoming stuck. Verify that a partly-built reactive layer is slower rather than broken
- [ ] 7.3 Perform every transition by hand while its workflow is enabled, and confirm the work is found already done rather than done twice
