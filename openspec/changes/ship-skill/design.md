## Context

The pipeline is verified and archived: `openspec/specs/delivery-pipeline`, `app-contract` and `reference-app` describe behaviour that has actually run on a real machine. What does not exist is the process around it. See `proposal.md` — Why.

Two constraints come from measurements rather than preference, and both limit what a playbook may claim:

**Automation cannot wake the agent.** An app-authored message, even carrying a real mention, is ignored; a person's mention answers at once. But app messages *are* visible to the agent when a person does invoke it. So no playbook may be written as though it will be triggered, and everything automation writes has to be worth reading later.

**The observation window closes faster than the monitor speaks.** At a ten-minute interval with a two-failure threshold, an outage takes about twenty minutes to declare, against a thirty-minute window. So no playbook may treat a quiet window as evidence of health.

## Goals / Non-Goals

**Goals:**
- Make the process executable rather than described: which state a change is in, what moves it, and what to do when something fails.
- Write the interpretation rules — the part a workflow cannot do — for each stage the pipeline automates.
- Keep the entry point small, because it is loaded every time the skill is used while a playbook is loaded only when its stage is reached.

**Non-Goals:**
- Touching the pipeline, the application, or the platform. Those specs describe verified behaviour.
- The database platform. Deliberately deferred; the skill must not assume where the database runs, which the hook contract already ensures.
- Making the playbooks updatable in projects that copied them. Distribution is a fork you own; only the reusable workflows arrive by reference, and pretending otherwise would be a promise the arrangement cannot keep.

## Decisions

### The entry point determines the stage rather than being told it

`SKILL.md` asks the tools where the change is and hands off. It holds no notion of having been here before, which makes being invoked halfway through the ordinary case rather than a recovery path — the property that lets a person, automation and a fresh session all invoke it interchangeably.

It also has to stay short. It is read on every invocation while a playbook is read only when its stage is reached, so anything stage-specific in the entry point is a cost paid every time for a benefit had once.

### Playbooks for automated stages interpret rather than act

Where the pipeline already does the work, the playbook's content is the judgement the workflow cannot make. A red end-to-end run is a flake, a broken test, or a real bug — the workflow reports the failure identically in all three cases, and the answer decides between returning to `dev` and stopping at `blocked`.

This is where the skeleton's findings land hardest, because several of them are exactly the wrong inference a playbook could encourage:

- A rollback restores the artifact and nothing else. Configuration and schema both survive it, so "we rolled back, therefore production is as it was" is false. The playbook has to reach for the revert rather than stopping at the image.
- A step that reports success is not evidence it did anything. The reset destroyed nothing for an entire run while reporting success every time, and the playbook that trusted it validated against accumulated state.
- Absence is not health. An unconfigured monitor and a healthy one both report no downtime, so a playbook must distinguish "checked and fine" from "not checked".

### Templates are records, not instructions

They were designed as prompts that would wake the agent. The measurement says they will not, so their purpose changes: they are what automation writes into the thread for the agent to read when a person eventually asks. That is a different genre — the reader arrives mid-incident with no memory, so a template has to say what happened and what was already tried, not what to do.

The practical test for one: would it be useful to a person opening the thread cold? If not, it will not be useful to the agent either.

### Reference material carries the rules, not the instances

`reference/gates.md` holds the state machine and who may fire each transition. The loop rule goes there as the question asked of any new action — is it cheap to repeat a hundred times — rather than as the list of loops we have met, which would be stale in a month and would invite the belief that the listed ones are the only ones.

## Risks / Trade-offs

- **Prose cannot be tested the way the pipeline was** → The pipeline could be run; a playbook can only be used. Its failure mode is the agent doing the wrong thing, discovered later and attributed to the agent rather than to the text. The mitigation is to state each rule as the reason rather than the instruction, so a reader can tell when it does not apply — but the feedback loop is genuinely slower and worth admitting rather than papering over.
- **Playbooks will drift from the pipeline they describe** → The workflows are versioned and arrive by reference; the playbooks are copied and do not. A project can end up with a playbook describing a pipeline stage that has since changed shape.
- **The entry point will attract content** → Every stage will have something that seems worth saying up front. The cost is invisible at the time and paid on every invocation.
