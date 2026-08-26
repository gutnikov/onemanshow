# Roles

A vocabulary, not a plugin system. Every role below has exactly one
implementation in this template, and the words exist because they make the right
question askable: *what capability does this need?* rather than *what does this
tool do?*

The column that matters is the last one. An absent role does not stop the
pipeline; it removes a stage's teeth. Knowing which teeth is the difference
between a degraded pipeline and one that looks fine while checking nothing.

| Role | Needs to | Absent means |
|---|---|---|
| code hosting | hold the repository, run the pipeline, host review | nothing works; this one is not optional |
| task management | a status field, labels, two closing reasons | no state to read — the skill has nowhere to look |
| messenger | carry the conversation and the human decisions | no interface; the terminal becomes the only way in |
| secrets | keep credentials in the repository, encrypted | nothing can be deployed |
| database | hold each environment's data, separately | **nothing runs at all** — the one role with no degraded form |
| registry | hold one image unchanged between validation and release | promotion is unprovable; there is nothing to promote |
| server hosting | run two environments and route by host name | no environments |
| domain | give each environment its own name | names are derived from the machine's address instead — the pipeline runs |
| observability | answer "was production healthy since this release?" | the observation window becomes a timer, and says so |
| automation | react to events sooner than the next invocation | everything still happens, later, when a person asks |

## Two of these are only accelerators

**automation** and **observability** never gate a transition. Without automation,
every mechanical move still happens — just at the next invocation instead of on
the event. Without observability, the window still closes; it simply closes on
time alone, and must say that it did.

This is deliberate. It is what makes the pipeline usable on day one of a project,
before anything is configured, and it is why bootstrapping can order the work by
what reaches production first.

## What "configured" means

A role counts as configured when the repository shows it. Not when a service
exists somewhere, not when it worked once by hand — when something committed
proves it: a configuration section, an infrastructure description, an encrypted
credential.

Two consequences worth stating, because both have already been got wrong here:

**A declared-but-empty credential is not configured.** A secret named in the
config and blank in practice is the worst state: every file agrees the role is
set up while it does nothing. Check the value, not the key.

**A role set up outside the repository is not configured.** If the only record of
how the machine came to be is somebody's shell history, the project cannot be
rebuilt — which is indistinguishable from not having built it.

## Where liveness is different

Every other role may live wherever it is cheapest. Liveness may not: it has to
answer when the machine does not, so it must run somewhere else. A monitor on the
box it monitors is useless at precisely the moment it is needed.
