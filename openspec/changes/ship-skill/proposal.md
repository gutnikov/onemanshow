## Why

The pipeline works and nothing drives it. A change still travels from idea to production because a person types the next command: dispatch the staging run, merge when it passes, watch production, decide what a red test meant. The machinery is proven — `openspec/specs/delivery-pipeline` holds what it guarantees — but the process around it lives only in a design document and in this conversation.

The skill is that process made executable: which state a change is in, what may move it, who is allowed to, and what to do when something fails. It is written now rather than earlier on purpose. The walking skeleton found seven defects in this design by running it. The first change actually driven by the skill found six more, and they are the more interesting half, because each one was a place where the design was right and the thing built from it was not. Staging resolved "the change's commit" to the default branch, so a change that moved a fixture was validated against the branch it was not on — green, with the stand still serving the old value. Closing the ticket was fired by the merge through a host keyword, erasing the observation window it is supposed to mark. The release trigger had no path filter, so the archive commit that closes a change would have shipped an unvalidated image every time. The six merge guards are enforced by nobody. The instance stubs a new project starts from had drifted out of contract, and they had drifted unnoticed because they sat where they executed in the template itself and failed on every push, which made red the normal colour. Each one changed what a playbook has to say — most sharply that rolling back an image restores neither configuration nor schema, and that a check which cannot fail is not a check.

## What Changes

- A **skill entry point** that determines which stage a change is in by asking the tools, then hands off to the playbook for that stage. It is re-enterable by construction: there is no session state, so being invoked halfway through is the normal case rather than recovery.
- **Nine stage playbooks plus rollback.** The ones covering stages the pipeline already automates do not perform work — they read a result and decide what it means, which is the part a workflow cannot do. A red end-to-end run is a flake, a broken test, or a real bug, and that answer decides between `dev` and `blocked`.
- **The state machine as reference**: seven statuses on an open ticket, two closing reasons, the `hotfix` and `paused` flags, exclusivity over the segment from `dev` to `released`, and the two gates where a human is not replaceable.
- **Loop safety as a rule rather than a list**: cheap iteration bounded by a per-ticket budget that human action refills, destructive iteration bounded by "once, then a person". The list of known loops would be stale within a month; the question asked of every new automated action would not.
- **`grill`** as the filter in front of the most expensive resource, run by a subagent with clean context because the agent that wrote a proposal is a poor critic of it, and always asking whether the change is revertable at all.
- **`init`**: compare the roles a project needs against the ones its configuration declares, and create ordered tickets for the difference. Including clearing the template's own planning history, which a created project inherits and does not want.
- **Thread templates** written as records rather than instructions. This is a direct consequence of a measurement: automation cannot wake the agent, but everything it writes is visible to the agent when a person does. The text has to read as context for someone arriving mid-incident, not as a command.

Out of scope: changing the pipeline, the application, or the platform. `openspec/specs/delivery-pipeline` and `app-contract` describe behaviour that is already verified and this change does not touch it.

## Capabilities

### New Capabilities
- `change-lifecycle`: the statuses a change moves through, what may move it between them, which transitions need a person, and the exclusivity that makes attribution possible.
- `loop-safety`: the bounds on repeated automated action — a refillable budget for cheap steps, a hard limit of one for destructive ones, and the rule that decides which a new action is.
- `grill`: the examination a proposal must pass before it may occupy the development slot, including the one question that never scales down.
- `project-bootstrap`: what `init` does in a fresh project, and what it must leave behind so the result is reproducible rather than merely working.

### Modified Capabilities
- `delivery-pipeline`: the requirement that a migration is applied before the image needing it is deployed. The pipeline already does this and the playbooks state it, but the spec never said so — found by checking the playbooks against the specs, which is the drift this change's design predicted. An unstated requirement is one a later change may quietly reverse.

## Impact

- **This repository** gains `SKILL.md`, `reference/`, `playbooks/`, and `templates/`. No application or pipeline files change.
- **Projects created from the template** get the skill as copied files, since a template copies everything tracked. They can edit their playbooks and will not receive later improvements to them — the arrangement is a fork you own, and only the reusable workflows arrive by reference.
- **Two things the design records as unresolved** are constraints on what the playbooks may claim: automation cannot trigger the agent, so no playbook may assume it will be woken; and the external monitor declares an outage more slowly than the observation window closes, so no playbook may treat a quiet window as proof of health.
