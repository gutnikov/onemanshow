# Dev

Write the change. This stage is everything that needs no running application:
implementation, `check`, and the build.

Work through `tasks.md` in the openspec change, marking items as you go. It was
written when the proposal was, and if it turns out to be wrong, say so and fix
the plan rather than quietly diverging from it.

## When check or build fails

Decide **whose failure it is** before acting, because the two go to different
places:

**The change's failure** — a type error, a broken test, a lint complaint about
code just written. Fix it and continue. This is ordinary work, not an incident.

**The environment's failure** — a dependency that will not install, a runner that
died, a registry that refused. Not the change's fault. Retry once; consult
`reference/loops.md` before a second. If it persists, `blocked:external` with
what you saw.

The distinction matters because treating an environment failure as a code failure
sends you looking for a bug that is not there, and treating a code failure as
flakiness re-runs a red pipeline until the budget runs out.

## The migration goes before the image that needs it

If the change includes a schema migration, remember the order the pipeline uses:
migrate, then deploy. The other way round leaves a window where the schema is
behind the code, and the readiness check correctly refuses to call that healthy.

## Leaving dev

The pipeline moves the change to `staging` when `check` and `build` are green.
You do not move it yourself — and if it has not moved, the pipeline is not done,
whatever the ticket says.

Note in the thread what you built and what you decided along the way. That note
is the only memory of your reasoning.
