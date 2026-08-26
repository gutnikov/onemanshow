# Init

The first invocation in a project created from the template. Establish what is
not configured yet, and turn that into work a person can pick up.

## It is a function of the current state

Compare the roles in `reference/roles.md` against what the project's
configuration declares, and create tickets for the difference.

Nothing records that this has run. Run it again in a month and it creates work
only for what is still missing — which is the same property everything else here
has, for the same reason.

## What counts as configured

The repository has to show it. Not a service that exists somewhere, not something
that worked once by hand.

**Check the value, not the key.** A secret named in the configuration and blank
in practice is the worst state there is: every file agrees the role is set up
while it does nothing. That exact failure hid broken error reporting through a
deliberate outage here.

## Three things the pipeline needs before any of it works

None is code, all three are settings, and each fails in a way that looks like
something else.

**The labels.** Every status and every `blocked:` cause has to exist as a label,
because the whole state machine is read from them. A missing label makes the
transition that applies it fail — and if that failure is swallowed, the change
is announced as blocked in a comment while the ticket shows nothing, which the
guards then read as no incident. Create them all, including
`blocked:budget`.

**The token ceiling.** The code host's default workflow permission has to allow
write, or a workflow asking for it fails **before any job exists** — a startup
failure with no log to read. Raising the ceiling widens every job that declares
nothing, so the workflows declare their own permissions; the ceiling only makes
the request possible.

**Branch protection on the default branch.** Every merge guard is bypassed by a
direct push, and pushing directly is easier than not. Without protection the
guards constrain the automation that was going to obey them anyway, and nothing
else.

## Clear the template's history first

A created project inherits the template's own planning artifacts, because a
template copies everything tracked. They are noise in someone else's project.

Remove `openspec/changes/` on this first run, keeping the configuration and the
directory. Say that you did.

## Order the work so production comes first

Two groups. The first reaches a real deployment; the second makes it correct.

```
1. secrets      →  2. registry  →  3. the machine  →  4. the pipeline
   ══ a real production deploy is possible here ══
5. domain    6. staging data    7. observability    8. automation
```

The split is possible because absent roles degrade rather than block — without a
domain the environments use names derived from the machine's address, without
observability the window is a timer that says so. `reference/roles.md` has the
full list of what each absence costs.

Put the reward early. Eight tasks before anything works is how a person gives up
at task five; four tasks to a live deployment is a different experience of the
same work.

## Dependencies are references, not prose

Where a ticket needs another done first, say so with a link the tools can follow.
No dependency graph is needed — the ticket names its prerequisite, and the status
of that prerequisite is readable.

## These tasks look different from normal ones

Most are **a person acting in a browser while you record the result**. You cannot
create accounts, confirm emails, or enter card details. Expect to guide, then
commit what comes back: a configuration section and an encrypted credential.

Which means the rule still holds — **a task that changes the world leaves a trace
in the repository.** Provisioning a machine and committing nothing produces a
machine nobody can rebuild, which is indistinguishable from not having one.
