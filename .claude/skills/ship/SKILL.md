---
name: ship
description: Drive one product change from a raw idea to a stabilised release. Use when the user wants to start work on an idea or a ticket, continue a change already in flight, respond to something the pipeline reported, or deal with a production incident. Triggers on "ship this", "take this into work", "what is the state of #N", "staging is red", "production is broken", or a ticket number with no further instruction.
---

# ship

Drives one change through the pipeline described in `openspec/specs/delivery-pipeline`.

You do not track where a change is. You **read** where it is, then open the one
playbook for that stage. Being invoked halfway through is the ordinary case: a
person, automation, or a fresh session all arrive the same way, with no memory.

## Determine the stage first, always

Never assume a stage from what the user said. "Staging is red" may arrive after
the change has already moved. Read the ticket's status, then confirm it against
the tools before acting.

1. Find the change. A ticket number, or the ticket linked from this thread.
2. Read its status label.
3. Confirm it against reality — the pull request's state, what the last workflow
   run did, what production is running. A status that disagrees with the tools
   means someone or something moved on; trust the tools.
4. Open the playbook below for that status. Read `reference/gates.md` first if
   the next move is a transition.

| Status | Playbook |
|---|---|
| no ticket yet | `playbooks/01-ticket.md` |
| `draft` | `playbooks/02-draft.md`, then `playbooks/03-grill.md` |
| `ready-for-dev` | `playbooks/04-ready-for-dev.md` |
| `dev` | `playbooks/05-dev.md` |
| `staging` | `playbooks/06-staging.md`, then `playbooks/07-approve.md` |
| `ready-to-release` | `playbooks/08-deploy.md` |
| `released` | `playbooks/09-stabilize.md` |
| `blocked` | read the `blocked:` label, then `playbooks/rollback.md` for `blocked:rollback`, otherwise `playbooks/05-dev.md` |
| nothing configured | `playbooks/init.md` |

## Four things that are true at every stage

**Two decisions are not yours.** Whether a change is worth doing
(`draft → ready-for-dev`) and whether it was done well (approval at the end of
`staging`). Prepare them, present them, wait. Everything else you may move.

**One change occupies `dev` through `released`.** If that segment is busy, a new
change waits in `ready-for-dev` — say so out loud, with its position, or the
system looks broken rather than busy.

**Never infer health from silence.** A check that was not performed is not a
check that passed. Say which sources you actually consulted, and say when one
was unavailable. `reference/loops.md` explains why this rule keeps recurring.

**Repetition is bounded.** Before repeating an automated action, consult
`reference/loops.md`. Cheap actions have a budget; destructive ones get one
attempt and then a person.

## When something fails, decide what it means

The pipeline reports failures identically whatever caused them. Deciding is your
work, and it is most of your value. A red end-to-end run is a flake, a broken
test, or a real bug, and the three go to different places —
`playbooks/06-staging.md` has the rules.

Two inferences are wrong often enough to name here:

- **A rollback restores the artifact and nothing else.** Configuration and
  schema survive it. "We rolled back, so production is as it was" is false;
  see `playbooks/rollback.md`.
- **A step reporting success is not evidence it did anything.** Prefer checking
  the effect over trusting the exit code, especially for anything destructive.

## Say what you did and what you decided

Every stage ends with a note in the thread: what happened, what you decided, and
what you are waiting for. Automation cannot wake you — but everything written in
the thread is visible to you when a person next asks, so the thread is the only
memory this system has. Write for someone opening it cold.
