## Purpose

Moving the registry exposed a rule the design has always relied on and never
stated: a rollback needs an artifact, and nothing said that artifact has to
remain reachable.

## ADDED Requirements

### Requirement: The artifact a rollback would need stays reachable
The image production would be returned to SHALL remain pullable from wherever the deploy tool will look for it, and a change that moves where it looks SHALL bring that image along before the move takes effect.

This is not the same as keeping images for ever. It is one image: the one production is running now, which is the only one an automatic rollback can return to. A retention policy may delete anything older.

The rule exists because the failure it prevents is invisible until the worst moment. The registry a rollback pulls from is composed from configuration, not recorded with the deployment, so changing that configuration silently changes where the previous version is looked for. The deploy tool may find the image already present on the machine and succeed anyway — that SHALL NOT be relied on, because it depends on what a machine happens to still have on disk, which nothing declares and nothing checks.

A change that cannot keep the previous artifact reachable SHALL say so, and say that rollback is unavailable until the next release, rather than leaving it to be discovered by a rollback that fails.

#### Scenario: The registry changes
- **WHEN** a change moves the registry the deploy tool pulls from
- **THEN** the image production is running is mirrored to the new registry before the change takes effect, and the mirror is verified by inspecting it there rather than by the copy command's exit code

#### Scenario: A rollback after such a change
- **WHEN** production is rolled back after the registry moved
- **THEN** the artifact is found, and it is found because it was brought along rather than because the machine happened to have it

#### Scenario: The previous artifact cannot be brought along
- **WHEN** a change makes the previous artifact unreachable and cannot mirror it
- **THEN** it states that rollback is unavailable until the next release, and the observation window for that release is read in that light
