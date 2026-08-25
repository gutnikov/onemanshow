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
