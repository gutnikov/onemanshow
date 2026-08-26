# Tasks

## 1. Decide what grill is for

- [ ] 1.1 Settle whether the derived ticket needs its own refusal when more than one carries the label, or whether trusting exclusivity is sound here — and record which, because a guard that trusts another guard has bitten this project before
- [ ] 1.2 Settle whether the manual merge path needs to refuse a ticket that was never approved, or whether the existing status guard is enough
- [ ] 1.3 Settle per stage, not uniformly, which of the six event-reached stages get a manual path

## 2. The merge stage

- [ ] 2.1 `merge.yml` derives the ticket, preferring the event's value when it exists, and accepts a manual run. Verify by running it by hand on a change in `ready-to-release` and watching the same six guards report
- [ ] 2.2 Verify the guards still refuse what they refused: run it by hand on a ticket that is not in `ready-to-release` and confirm it stops

## 3. The other stages

- [ ] 3.1 Enumerate the event-reached stages and give a manual path to the ones argued for in 1.3, in the instance and in the stub templates both
- [ ] 3.2 Exercise each one by hand once. A path that has never been walked is not known to exist

## 4. What this closes for the other change

- [ ] 4.1 `smoke-signs-in` 3.2: dispatch a release with a knowingly wrong credential; confirm the pre-deploy probe stops it, that nothing was migrated, deployed or rolled back, and that the ticket is told production is untouched **because that is what happened**
- [ ] 4.2 Put the credential back and confirm the next release passes both probes
- [ ] 4.3 Record what the pipeline does to a closed ticket when a release is dispatched outside a change's lifecycle, and clean up whatever it labelled
