# Stop keeping what nothing uses

## Why

**Credentials that outlived their reason.** The database moved off the machine
three changes ago, and `POSTGRES_PASSWORD` and `DATABASE_URL_TUNNEL` are still
encrypted in `secrets/prod.yaml`, `POSTGRES_PASSWORD` still in
`secrets/staging.yaml`, and the rollback action still hands the first of them to
every invocation of the deploy tool. Nothing reads them for their purpose any
more. The check this project already has catches a credential that is
**declared but empty**; nothing catches one that is **present but unused**, and
the second is the one nobody rotates.

This change was proposed with a second half — retention for the images nothing
ever deletes — and it was **split off at the gate**, deliberately. Every open
question the pair had lived in that half, all of them about an irreversible
operation, and the segment holds one change at a time: bundling them would have
made the cheap and unambiguous half wait for decisions about the dangerous one.
Retention is its own ticket, with the three answers already argued there.

## What is being removed, and what only looks removable

Removed:

- `POSTGRES_PASSWORD` from `secrets/prod.yaml` and `secrets/staging.yaml`
- `DATABASE_URL_TUNNEL` from `secrets/prod.yaml`
- the two `-e POSTGRES_PASSWORD` the rollback action still passes
- the stale entries in the instance's own `secrets/*.example.yaml`

**Left alone, and each for a reason worth stating**, because all four would look
like the same string to a careless search:

- `backup.yml` sets `POSTGRES_PASSWORD: scratch` — that is a throwaway service
  container's own password, used to prove the dump restores. Live.
- `compose.yml` sets one for local development. Live.
- `check-kamal-secrets.py` names it in a comment recording why the checker
  exists. That is the lesson, not the credential.
- `adopt-database.yml` reads `DATABASE_URL_TUNNEL` to dump from an on-machine
  database while adopting a managed one. Historical **for this instance**, live
  for any instance that has not moved yet. So the value leaves our secrets and
  the workflow stays — and it should say what is missing rather than failing
  inside `sops`.

## What is not included

- No release. Everything here lives in paths excluded from the deployable set,
  so this change merges without deploying, and the eight tasks waiting across
  three other changes for a real rollback stay waiting. Said here so it is not
  discovered at the merge.
- No rotation of anything still in use.
- The Docker Hub tokens are not revoked here; that is the registry change's task
  and it waits on a completed rollback.

## What has to be decided, and is not obvious

Almost nothing, which is the point of the split. One thing:

1. **The asymmetry the exemptions create.** `adopt-database.yml` stays and keeps
   reading `DATABASE_URL_TUNNEL`, while the value leaves this instance's secrets.
   So the workflow is live code that cannot run here any more. Either it says so
   clearly when the value is absent, or it is a trap for whoever runs it next —
   and "it fails inside `sops`" is not saying so.
