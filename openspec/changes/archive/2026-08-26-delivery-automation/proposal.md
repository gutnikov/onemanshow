## Why

Every transition the design assigns to automation is currently performed by a
person asking the agent to perform it, and the two rules meant to bound the
system — the per-ticket invocation budget and the six merge guards — are
enforced by nobody. They are addressed to the actor they constrain, which is the
one arrangement guaranteed not to hold: an agent that has gone wrong is exactly
the one that cannot be trusted to count its own wake-ups, and a merge that skips
its guards is performed by whoever was not reading them.

The run of 2026-08-25 showed both. All six guards were satisfied and none was
checked; the closing ticket was closed by the code host at merge rather than at
the end of the window; and the window itself was held open by a person watching
a clock.

## What Changes

- **Automation performs the transitions the design already assigns to it** — the
  ten events that are native code-host events become ordinary pipeline
  workflows. Nothing new is invented: the event table is from the archived
  design.
- **The six merge guards become code in the thing that merges.** Automation
  performs the merge, so it is the only place they can be enforced rather than
  recited.
- **The observation window closes itself**, on a timer, and the ticket is closed
  there — not by a closing keyword at merge. The window is the interval in which
  a change is `released` and not yet closed, so whatever closes it defines it.
- **The queue head is pulled when the segment frees.** This is a separate bullet
  because it is the failure the design flags as worst: everything looks healthy
  while work silently stops.
- **The per-ticket invocation budget is counted and enforced** outside the
  agent, by whatever wakes it. Exhausted means `blocked` and a person.
- **BREAKING for the design, not for any code:** automation **does not wake the
  agent**. Variant A of the archived design — automation writes into the thread
  and the assistant's own integration responds — was measured and does not work.
  Authorship is the discriminator: a real mention authored by an app went
  unanswered for three minutes, while the same mention typed by a person was
  answered at once, and a webhook and a bot token behaved identically. What does
  hold is that app-authored messages **are visible** to the agent when it next
  reads the thread. So automation records and notifies, and one word from a
  person brings the agent in with the whole thread as context.
- **No n8n in this change.** The archived design named it for four events. Three
  of them — the window timer, the external liveness signal, and budget
  accounting — are a scheduled workflow and an inbound dispatch. Only emoji
  reactions genuinely need it, and an approval typed as a word costs the person
  nothing and the project no container. n8n stays available as a later,
  optional change whose whole benefit is the reaction.

## Capabilities

### New Capabilities
- `automation`: which transitions automation performs, what it must never do,
  how the budget is counted and enforced, and how a person is brought in when
  judgment is required.

### Modified Capabilities
- `delivery-pipeline`: the merge guards become enforced rather than readable,
  and the merge becomes automation's action.
- `change-lifecycle`: closing and the freeing of the segment become automation's
  actions at the end of the window, including pulling the queue head.
- `loop-safety`: the budget acquires a counter and an enforcer; the rule that an
  actor never consumes what it produces has to be restated now that automation
  writes to the thread the agent reads.

## Impact

Pipeline workflows and a scheduled one; the skill's `reference/gates.md`,
`playbooks/04-ready-for-dev.md`, `07-approve.md`, `09-stabilize.md` and
`templates/` — the wake messages are prompts, so their wording is versioned with
the playbooks. No new hosted service, which is the point: the reactive layer
must not add to a ten-euro monthly bill.

**Amended during implementation: two lines of application code after all.** The
guard that production and the main branch agree cannot be enforced without
asking production what it is running, and every other source answers a
different question — a deploy log and a workflow run record what was
*intended*, while a rollback is exactly the case where intent and reality
differ. The alternative was a shell connection to the machine from inside the
guard, which would hand a guard the credentials that can deploy in order to
learn a fact the artifact knows about itself. So `/health` now reports the
commit it was deployed as. Recorded here rather than absorbed silently, because
"no application code" was this proposal's own claim.
