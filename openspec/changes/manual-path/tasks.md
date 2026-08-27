# Tasks

The examination settled most of what the first draft left open, and moved three
premises. What remains for the gate is in the proposal's last section.

## 1. The merge must stop releasing what must not be released

Forced first: this change cannot land without it, because merging it would
deploy a wiring-only commit and then block the next merge on guard 4.

- [x] 1.1 `merge-change` dispatches the release only when the merged commit touches a deployable path, reading the exclusion list guard 4 already reads rather than keeping a second copy. Verify by merging a wiring-only commit and watching it say it is not releasing, and by confirming production still reports the previous commit **Done.** The predicate was exercised on real commits under a POSIX shell: a commit touching only `secrets/` and `ship.yml` says no release, one touching `e2e/` and `ship/` says release, and a commit git cannot read refuses instead of guessing — three outcomes, not two, because reading a failure to answer as "deployable" is the reading that releases a commit nobody classified
- [x] 1.2 **Done by the registry change's release on 2026-08-27.** It touches `config/`, a deployable path, and the merge said `release dispatched for 0423ee8` followed by a release that deployed. The refusing direction had been seen the day before; this is the other one, and a guard seen only refusing is indistinguishable from a broken one

## 2. Approval that means this commit — the cheap version, chosen at the gate

- [x] 2.1 The approval guard requires that `status:ready-to-release` is **currently** on the ticket, not merely that it once was. Today it reads the timeline alone, so the label being removed changes nothing **Done**, and it is the smaller half: the guard now asks whether the label is on the ticket at all, where before it only asked the timeline
- [x] 2.2 And that the label event is **newer than the head commit**. That is what closes the known sequence: after a push, the newest approval event is older than the head. **Verify by constructing the failure** — approve, push a commit, let automation drop the label, let revalidation write its mark on the new head, then attempt the merge by hand. Today every guard holds and an unapproved commit ships **Done, both conditions, on the real script with real data.** Label absent: `applied by gutnikov once, but the label is not on the ticket now`. Label present but stale: `applied by gutnikov at 18:32:50Z, older than d331f51 (18:33:03Z) - approved a different commit` — built on a closed ticket and a local scratch commit, so nothing in the segment was disturbed and nothing was pushed
- [x] 2.3 Verify the event path still works unchanged, since the event stops being the evidence and becomes only the trigger **Done.** The real merge of this change ran from the label event and its approval guard passed on the new logic: `applied by gutnikov at 18:33:27Z, after 2026-08-26T20:23:51+02:00`
- [x] 2.4 Record the race this leaves: approve and push inside the same second. The commit-scoped mark closes it and is a later change if it ever stops being theoretical **Recorded**, and measured: the refusal above fired on a thirteen-second gap, so the window this leaves is smaller than that

## 3. The ticket, derived and unambiguous

- [x] 3.1 The merge derives its ticket, preferring the event's value when present. One in `ready-to-release` proceeds **Done.** Prefers the event's value; derives from the label otherwise. The counting was exercised on none, one and two
- [x] 3.2 Two stop, with both numbers named. Verify by putting the label on a second ticket — the hotfix requirement makes this a real state, not a hypothetical **Done, in the real workflow rather than in a copy of its arithmetic.** Two scratch tickets carried the label, the merge was dispatched by hand, and it refused naming both. The message rendered them as "#29 28" — the hash reached only the first number — which is fixed, because a refusal read wrongly is a refusal that gets overridden
- [x] 3.3 None stops, saying so. Verify **Done.** Dispatched by hand with nothing labelled: `nothing is in ready-to-release, so there is nothing to merge`

## 4. Manual paths, where argued

- [x] 4.1 `on-ready-to-release` and `template-ci` gain `workflow_dispatch`, in the instance and in the stub templates both **Done**, in the instance and in both stub templates, plus the template's own CI — which had no dispatch trigger at all and is the required check on this very pull request
- [x] 4.2 Exercise each by hand once, and judge it by the lines the stage prints, never by the run being green — a skipped job is green, which is exactly how this stage would have lied if the trigger had been added alone **Done for the merge stage, twice** — the no-ticket refusal and the two-ticket refusal — and both were the first uses of a path that did not exist an hour earlier
- [x] 4.3 `on-pr-closed` and `on-liveness` do not get one, and the reasons are written where a reader will find them: abandoning closes a ticket, which only a person may do, and the closing of the pull request is the decision that makes automation's closure legitimate; liveness records an observation from outside, and typing one by hand is fabricating evidence rather than operating the pipeline **Done**, and in code rather than prose: the checker holds the two exceptions with their reasons and asserts both directions, so a dispatch trigger appearing on either of them is a failure
- [x] 4.4 Note the trap found while arguing 4.3: `abandon.yml` gates on `github.event.pull_request.merged == false`, and under a dispatch that field is absent, which the expression treats as false — so the guard passes and the run dies later with an empty branch. Loud, but for the wrong reason **Recorded.**

## 5. Telling a person a change is stuck

- [x] 5.1 The window check gains one listing: a ticket has held `ready-to-release` longer than the window with no merge run since the label event. It reports and does not act **Done.**
- [x] 5.2 Verify it fires, by leaving a ticket in that state on purpose. Verify it stays quiet otherwise, which is the half that is easy to skip **Done.** Exercised against the real script with a stubbed code host: it speaks for an approval 76 minutes old and stays silent for a fresh one

## 6. Parity that something enforces

- [x] 6.1 `check-instance-stubs.py` compares triggers, not only `with:` keys and the `uses:` target. Verify against the drift that already exists — the instance's `on-pr` carries a dispatch trigger and the stub template it came from does not — and fix that drift **Done.** The checker found exactly two stubs without a manual path — `on-pr`, drifted from the instance long before today, and `on-ready-to-release` — and the other ten already had one. Better than my guess, which was that most lacked it
- [x] 6.2 A stage deliberately without a manual path is named in an exception list in the checker, so the spec's "the reason is written down" is asserted rather than hoped for **Done.**

## 7. The rehearsal, deliberately and before this merges

- [ ] 7.1 **Deferred on purpose, to the next release of a deployable change.** Doing it now would mean dispatching a release while main's head is this change itself — which touches no deployable path. The pre-deploy probe is expected to stop that release, but if it did not, the release would deploy a wiring-only commit to production and break merge guard 4 for the next change: exactly the leak this change just stopped. The next deployable change has a release anyway, its head is deployable, and a probe failure there costs nothing. `smoke-signs-in` 3.2: with a knowingly wrong credential in `secrets/ci.yaml`, dispatch a release against today's head and confirm the pre-deploy probe stops it — nothing migrated, nothing deployed, nothing rolled back, and the ticket told production is untouched **because that is what happened**
- [ ] 7.2 (same deferral) Restore the credential and confirm a release passes both probes again
- [ ] 7.3 (same deferral) Record the price honestly: two reconfigure deploys of an unchanged version, and a `blocked:rollback` label on a closed ticket, removed afterwards with the thread told it was staged

## 8. Found by wasting a validation

- [x] 8.1 **My own mistake, and the pipeline let it cost a full staging run.** I cut this change's branch from a stale local `main`, so the tree was missing the previous change's work: validation passed with eleven tests where twelve exist, and the eleven were the wrong eleven. Merge guard 5 would have caught it — a head main is not an ancestor of cannot be fast-forwarded — but only after the stand had been deployed, reset, seeded and exercised. The check now runs at the start of validation instead, with the remedy named. Verified in both directions on the two real commits: the rebased head passes, the stale one is refused

## 9. Found by watching this change merge

- [x] 9.1 **The fix introduced a dead end, and the change that introduced it walked into it.** With the release correctly not dispatched, nothing moved the ticket out of `ready-to-release`: that transition belongs to the release, and there was no release. So the change held the segment, the queue behind it would have stopped, and the new detector reported it as stuck — correctly. The merge now completes such a change itself and closes it, with no observation window, because a window is time to watch production after a change and production did not change. Written into `delivery-pipeline` as a requirement, since it is a rule about the lifecycle and not an implementation detail
- [x] 9.2 **The manual path cannot be used to deliver itself.** `workflow_dispatch` is only offered for workflows present on the default branch, so the merge stage became dispatchable only once this change had merged — by the event path. The capability prepares for the next outage, never the current one. The honest consequence is that an outage today still needs a break-glass procedure, which `08-deploy.md` now carries: run the guards by hand, fast-forward by hand, dispatch the release by hand
- [x] 9.3 Verified the invariant the release fix protects, rather than assuming it: after the merge, the last deployable commit on main and the commit production reports running are both `183bd32` — equal, so merge guard 4 holds for the next change. Before the fix they would have differed and the next merge would have been refused

## 10. The other copy of "what production should equal"

- [x] 10.1 The rollback compared production to **main's tip**; merge guard 4 has always compared it to the last **deployable** commit. Those differ whenever main carries something that must not release — an archive commit, a change to the pipeline's own wiring — so after any of those a rollback refused with "production is already behind main" while production was exactly where it belonged. Demonstrated on the live repository at the time of the fix: against the tip it refuses, against the last deployable commit it proceeds. The list now comes from the same script the guard uses, so there is one reader of it and not two

## 11. The truthfulness fix was itself untrue

- [x] 11.1 **Found by grilling the next change, in code committed hours earlier today.** The rollback reported `rewound=yes` immediately after `kamal rollback` succeeded, with a comment claiming that placing the line after the command made it report what happened. It does not: `kamal rollback` prints "the app version is not available as a container" in red and **returns normally** when the target has been pruned — it retains five — so exit 0 is compatible with nothing having moved. Verified by reading the pinned gem's own source. A release would then have told a person production was returned while it still ran the broken image, which is exactly the wrong sentence at the worst moment, and the whole point of the change that introduced it. It now asks production what it runs and compares to the target: equal is `rewound=yes`, anything else fails loudly and names both. Same lesson as the guard above it — ask the artifact, not the log of what was intended
