## Why

The onemanshow design is a web of invariants that only hold end to end: `prod == main`, "the deployed image is the image that passed e2e", staging reset from prod's SHA with the migration applied on top, conveyor exclusivity, the observation window closing and pulling the queue head, and waking the agent through a Slack thread. None of these can be verified by writing instructions — they either converge on a real change flowing through the whole pipeline, or they do not.

So the cheapest possible test of the design is a **walking skeleton**: an application that does nothing and a pipeline that carries it all the way to production. It must exist before the nine stage playbooks are written, because those playbooks assume the design is correct. Building the foundation first turns thirty speculative files into thirty files written against something that has actually run.

## What Changes

- A **reference application** with no features but complete in shape: one React page, one API endpoint it calls, one table with one migration, one seeded row, one Playwright test, one non-mutating `@smoke` test, and a `/health` endpoint that really checks readiness rather than returning a static 200.
- Two **deliberate-failure switches** in that application: one that reliably breaks the prod smoke check, and one irreversible migration. Half the design is failure paths — rollback, `blocked`, the revert ticket, the cascade guard, loop budgets — and without a way to break production on purpose they are untestable assertions in a document.
- The **six application hooks** (`ship/check`, `build`, `migrate`, `seed`, `e2e`, `smoke`) as the only interface between the pipeline and any application, including the rule that a missing hook degrades its stage rather than failing it.
- The **delivery pipeline** as reusable GitHub Actions workflows, referenced rather than copied, so that pipeline improvements reach every project without any update mechanism existing.
- **This repository made public and marked as a GitHub template**, holding the skill, the workflows, the reference application, its Kamal configuration, Dockerfile, hooks and a VPS provisioning script. "Use this template" is the whole distribution mechanism — there is no plugin to publish.
- A **disposable testbed project created from this template**, which is where the pipeline actually runs. The template itself is never deployed, so that the deployed commit can equal the head of main literally rather than approximately.
- **BREAKING** relative to the earlier design discussion: the role/adapter abstraction is dropped. Every role had exactly one implementation, which makes it indirection rather than abstraction. The role vocabulary survives as documentation because it earned its keep as a thinking tool; the adapter machinery and the `roles` section of `ship.yml` do not ship.

Explicitly **out of scope**: the `ship` skill itself — statuses, gates, playbooks, grill, n8n flows. Those come after the skeleton has carried three changes (a harmless string edit, a deliberate production break, and an irreversible migration). Also out of scope: any real product feature. The skeleton is a test rig, and its value is that breaking it on purpose is safe.

## Capabilities

### New Capabilities
- `app-contract`: the six executable hooks a project must expose, what each is responsible for, and how a missing hook degrades its stage instead of breaking the pipeline. This is the whole boundary between the pipeline and an application's language and stack.
- `delivery-pipeline`: the three pipeline phases (PR checks, staging validation, production release) and the invariants they enforce — one image per change, promotion instead of rebuilding, staging reset derived from prod's SHA, immutable SHA tags, smoke after deploy.
- `reference-app`: the observable behaviour of the skeleton application — its page, endpoint, migration, seed, readiness check, smoke subset, and the two deliberate-failure switches.

### Modified Capabilities
<!-- None. This is the first change in the project; openspec/specs/ is empty. -->

## Impact

- **This repository** becomes public and serves as the template: skill, reusable workflows, reference application and per-project configuration together. It is never deployed.
- **A disposable testbed**, created through "Use this template" and kept private, is where the pipeline runs and the invariants are checked. Being a copy rather than a fork, it also proves the creation path a real founder takes.
- **Publishing this repository** means no credential may ever enter its history, and our own openspec change history must not ship to projects created from it.
- **External accounts required before the pipeline can run end to end**: GitHub (repo, Actions, secrets), Docker Hub (one private repository, two tokens with different scopes), a Hetzner-class VPS running both staging and prod, Sentry, and an external uptime monitor. A domain is deliberately **not** required: the no-domain path uses host names derived from the machine's IP, so the only purchase on the way to a first production deploy is the machine. Only the age private key lives outside the repository, in exactly one place: an Actions secret.
- **Cost**: roughly €10/month, almost entirely the VPS and the domain.
- **Deliberately unverified until this change runs**: whether the Claude Code Slack app responds to a message authored by another application, and how many Actions minutes one headless agent run costs. Both are measurements this skeleton is built to take.
