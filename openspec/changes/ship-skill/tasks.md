## 1. The entry point

- [x] 1.1 Write `SKILL.md`: what the skill is for, and the procedure that determines a change's stage from the tools and hands off; verify it names every one of the seven statuses and routes each to exactly one playbook
- [x] 1.2 Keep it short enough to be worth loading every time; verify it stays under 150 lines and contains nothing stage-specific that a playbook could hold instead
- [x] 1.3 Wire the skill from a local path for our own iteration rather than relying on the copied files; verify that editing a playbook takes effect without recreating the testbed

## 2. Reference material

- [x] 2.1 Write `reference/gates.md`: the seven statuses, the two closing reasons, the `hotfix` and `paused` flags, and which actor may fire each transition; verify every transition in the state machine appears exactly once and names its actor
- [x] 2.2 Record the exclusivity invariant and how to check it from the tools; verify the check is a single command and that it counts a `paused` change as inactive
- [x] 2.3 Write `reference/loops.md` as the classification rule rather than a list of known loops; verify it states the question asked of a new action, both bounds, and that an exhaustible external allowance counts as expensive
- [x] 2.4 Write `reference/roles.md` as the vocabulary and each role's contract; verify each role says what degrades when it is absent, since that is what the pipeline actually does

## 3. Stage playbooks

- [x] 3.1 `playbooks/01-ticket.md` and `02-draft.md`: taking a raw idea to a proposal and a draft pull request, with the openspec artifacts created in `draft` because grill needs something to attack; verify the branch and draft pull request exist before grill begins
- [x] 3.2 `playbooks/03-grill.md`: the examination, its items, and the subagent that conducts it; verify revertability cannot be answered "not applicable" and that the answers land in the proposal itself
- [x] 3.3 `playbooks/04-ready-for-dev.md`: the queue, what the human gate is deciding, and how to report queue position; verify it says what to tell someone whose change is third in line
- [x] 3.4 `playbooks/05-dev.md`: implementation against `tasks.md`, and what to do when `check` or `build` fails; verify it distinguishes a failure of the change from a failure of the environment
- [x] 3.5 `playbooks/06-staging.md`: the two verification runs and what each proves, plus the interpretation rules for a red end-to-end run; verify it names all three readings — flake, broken test, real bug — and the route each takes
- [x] 3.6 `playbooks/07-approve.md`: what a person is being asked to look at, and what the agent should have prepared for them; verify it requires the stand's address to be handed over, since that is the only artifact of the handover
- [x] 3.7 `playbooks/08-deploy.md`: the merge guards, why the merge must be a fast-forward, and the promotion; verify it states that a rebuilt image is not the artifact that was validated
- [x] 3.8 `playbooks/09-stabilize.md`: the observation window, what closing it green means and what it does not; verify it forbids treating an unchecked source as healthy and states the monitor's declaration delay against the window
- [x] 3.9 `playbooks/rollback.md`: both steps, why the second is not bookkeeping, and the cascade guard; verify it says that configuration and schema survive an image rollback, and that automation does not fix its own fix

## 4. Bootstrap

- [x] 4.1 `playbooks/init.md`: comparing needed roles against declared ones and creating ordered work for the difference; verify running it twice produces no duplicate work
- [x] 4.2 Make it clear the template's planning history on first run; verify a fresh project created from the template ends with an empty planning directory
- [x] 4.3 Treat a declared-but-empty credential as unconfigured; verify with a role whose secret exists and is blank, which is how a role appears configured while doing nothing

## 5. Templates

- [x] 5.1 Write the thread templates as records for a reader arriving cold, not as instructions; verify each one would be useful to a person opening the thread with no memory of the incident
- [x] 5.2 Cover the five events that need judgement and the events that only need recording; verify no template implies the agent will be woken by it, since it will not

## 6. Verification

- [ ] 6.1 Drive one change end to end with the skill rather than by hand, in the testbed; verify the skill determined each stage from the tools without being told where it was
- [ ] 6.2 Interrupt that change mid-flight and invoke the skill fresh; verify it resumes from the tools rather than from anything it remembered
- [ ] 6.3 Exhaust a change's invocation budget deliberately; verify it lands in `blocked` and that a human action refills it
- [ ] 6.4 Check every playbook against the archived pipeline specs; verify no playbook claims behaviour the pipeline does not have, which is the drift the design flags as likely
