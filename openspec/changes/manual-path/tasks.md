# Tasks

The examination settled most of what the first draft left open, and moved three
premises. What remains for the gate is in the proposal's last section.

## 1. The merge must stop releasing what must not be released

Forced first: this change cannot land without it, because merging it would
deploy a wiring-only commit and then block the next merge on guard 4.

- [ ] 1.1 `merge-change` dispatches the release only when the merged commit touches a deployable path, reading the exclusion list guard 4 already reads rather than keeping a second copy. Verify by merging a wiring-only commit and watching it say it is not releasing, and by confirming production still reports the previous commit
- [ ] 1.2 Verify the other direction, which is the one that matters: a commit that *does* touch a deployable path still releases. A guard that only ever refuses is indistinguishable from a broken one

## 2. Approval that names a commit

- [ ] 2.1 Approval leaves a mark on the head it approved, written when a person applies the label, in the shape the validation mark already uses. Verify the mark exists on the right commit and nowhere else
- [ ] 2.2 A guard reads it and refuses a head it does not match. **Verify by constructing the failure**: approve, push a commit, let the label drop and revalidation write its own mark on the new head, then attempt the merge by hand — today every guard holds and the change ships unapproved, so this must refuse, naming the mark
- [ ] 2.3 Verify the event path still works unchanged, since it stops being the evidence and becomes merely the trigger

## 3. The ticket, derived and unambiguous

- [ ] 3.1 The merge derives its ticket, preferring the event's value when present. One in `ready-to-release` proceeds
- [ ] 3.2 Two stop, with both numbers named. Verify by putting the label on a second ticket — the hotfix requirement makes this a real state, not a hypothetical
- [ ] 3.3 None stops, saying so. Verify

## 4. Manual paths, where argued

- [ ] 4.1 `on-ready-to-release` and `template-ci` gain `workflow_dispatch`, in the instance and in the stub templates both
- [ ] 4.2 Exercise each by hand once, and judge it by the lines the stage prints, never by the run being green — a skipped job is green, which is exactly how this stage would have lied if the trigger had been added alone
- [ ] 4.3 `on-pr-closed` and `on-liveness` do not get one, and the reasons are written where a reader will find them: abandoning closes a ticket, which only a person may do, and the closing of the pull request is the decision that makes automation's closure legitimate; liveness records an observation from outside, and typing one by hand is fabricating evidence rather than operating the pipeline
- [ ] 4.4 Note the trap found while arguing 4.3: `abandon.yml` gates on `github.event.pull_request.merged == false`, and under a dispatch that field is absent, which the expression treats as false — so the guard passes and the run dies later with an empty branch. Loud, but for the wrong reason

## 5. Telling a person a change is stuck

- [ ] 5.1 The window check gains one listing: a ticket has held `ready-to-release` longer than the window with no merge run since the label event. It reports and does not act
- [ ] 5.2 Verify it fires, by leaving a ticket in that state on purpose. Verify it stays quiet otherwise, which is the half that is easy to skip

## 6. Parity that something enforces

- [ ] 6.1 `check-instance-stubs.py` compares triggers, not only `with:` keys and the `uses:` target. Verify against the drift that already exists — the instance's `on-pr` carries a dispatch trigger and the stub template it came from does not — and fix that drift
- [ ] 6.2 A stage deliberately without a manual path is named in an exception list in the checker, so the spec's "the reason is written down" is asserted rather than hoped for

## 7. The rehearsal, deliberately and before this merges

- [ ] 7.1 `smoke-signs-in` 3.2: with a knowingly wrong credential in `secrets/ci.yaml`, dispatch a release against today's head and confirm the pre-deploy probe stops it — nothing migrated, nothing deployed, nothing rolled back, and the ticket told production is untouched **because that is what happened**
- [ ] 7.2 Restore the credential and confirm a release passes both probes again
- [ ] 7.3 Record the price honestly: two reconfigure deploys of an unchanged version, and a `blocked:rollback` label on a closed ticket, removed afterwards with the thread told it was staged
