## MODIFIED Requirements

### Requirement: Merging must preserve the validated commit
The commit that reaches the main branch SHALL be the same commit that was built and validated, so merging SHALL be a fast-forward. A merge that produces a new commit - a merge commit, a squash, or a rebase - discards the identity the promoted artifact was built against, leaving nothing to promote without rebuilding.

This is why a branch must be up to date with main before merging: up to date plus fast-forward means the validated commit becomes main's head unchanged.

The merge SHALL be performed by automation, and automation SHALL refuse it unless all six guards hold: approval recorded; the pipeline green on the commit being merged; the branch a fast-forward from main; production equal to the last deployable commit on main; no other change in `released` with an open window; no active incident. All six are readable from the tools, and reading them is not the same as checking them — until the merge is performed by something that refuses, they are advice to whoever merges.

The guard for a green pipeline SHALL be checked against the commit that was validated, not against the commit a run reports. A validation run started by dispatch reports the branch it was dispatched from, so a run's own commit is not evidence about the change.

#### Scenario: The branch is up to date
- **WHEN** an approved change whose branch is up to date with main is merged
- **THEN** main's new head is the commit that was validated, and the artifact built for it is the one promoted

#### Scenario: The merge would create a new commit
- **WHEN** merging would produce a commit that was never built or validated
- **THEN** the merge is refused, because promoting would require rebuilding and rebuilding produces an artifact nobody verified

#### Scenario: A guard does not hold
- **WHEN** a change is approved but production is behind the last deployable commit on main
- **THEN** automation refuses the merge and says which guard failed, rather than merging and leaving an unresolved rollback buried

#### Scenario: A run is mistaken for evidence
- **WHEN** the green-pipeline guard is evaluated for a change whose validation was dispatched
- **THEN** the sha the run was given is what is checked, and the branch the run reports as its own commit is not accepted in its place

### Requirement: Production and the main branch agree
After a successful release the commit running in production SHALL equal the most recent commit on main that touched a **deployable** path. Commits that touch only documentation, planning artifacts, pipeline wiring, project configuration or provisioning scripts SHALL NOT release.

This corrects an overstatement in the previous version of this requirement, which said that releasing on a documentation commit deployed an unvalidated image to production. It does not, and cannot: the release promotes a pre-validated artifact and refuses to build one, so a commit that never went through a pull request has no image and the release **fails** at the promotion check. What actually happens is a red release on every close, and production left unequal to main's tip — which then trips this very guard and blocks the next change until someone reconciles it by hand.

That is still worth preventing, and for a reason the overstatement obscured: a release that is red every time a change closes is red as a matter of routine, and routine red is not read. The pipeline's own history contains a stretch where production sat three commits behind main behind exactly this signal.

The set of ignored paths SHALL be expressed as an exclusion list rather than a list of deployable paths, because the two constructions fail differently. A path missing from an exclusion list produces a release that fails loudly at promotion. A path missing from a list of deployable paths produces a real change that never deploys, while this guard — computing the last deployable commit from the same list — reports agreement. One failure announces itself; the other is silent and satisfies the check meant to catch it.

#### Scenario: Checking pipeline health
- **WHEN** the deployed image tag is compared with the most recent deployable commit on main
- **THEN** they are equal whenever no release is in flight and no rollback is unresolved

#### Scenario: The closing archive commit
- **WHEN** a change is archived after its observation window closes
- **THEN** no release runs, and production continues to run the artifact that was validated

#### Scenario: A change follows a documentation commit
- **WHEN** the next change's merge guards are checked and main's tip is a documentation commit
- **THEN** production matching the last deployable commit satisfies the guard, and the tip being ahead is not treated as an unresolved rollback

#### Scenario: A non-deployable path was not excluded
- **WHEN** a commit touching only project configuration is pushed and the exclusion list does not cover it
- **THEN** the release fails at the promotion check because no validated image exists for that commit, rather than an image being built for it
