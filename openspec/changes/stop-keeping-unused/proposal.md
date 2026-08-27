# Stop keeping what nothing uses

## Why

Two piles have been accumulating, and each one is a different kind of debt.

**Credentials that outlived their reason.** The database moved off the machine
three changes ago, and `POSTGRES_PASSWORD` and `DATABASE_URL_TUNNEL` are still
encrypted in `secrets/prod.yaml`, `POSTGRES_PASSWORD` still in
`secrets/staging.yaml`, and the rollback action still hands the first of them to
every invocation of the deploy tool. Nothing reads them for their purpose any
more. The check this project already has catches a credential that is
**declared but empty**; nothing catches one that is **present but unused**, and
the second is the one nobody rotates.

**Images with no retention.** Every commit produces three tags and nothing ever
deletes any. That was a chore on the old registry and it is a setting on the new
one — but a wrong setting here is worse than the pile, because deleting an image
is the one operation in this project that cannot be undone, and the image an
automatic rollback needs is one of them.

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

## Retention, constrained by a requirement that already exists

`delivery-pipeline` already says the artifact a rollback would need stays
reachable, and that finding it because the machine happens to still have it does
not count. So a retention rule is not free to be simple:

- it SHALL NOT delete what production is running, read from production rather
  than assumed;
- it SHALL keep at least as many versions as the deploy tool keeps containers,
  because the rollback target is chosen from those containers;
- and if production cannot be asked, it deletes nothing — unknown is not
  permission.

## What is not included

- No release. Everything here lives in paths excluded from the deployable set,
  so this change merges without deploying, and the eight tasks waiting across
  three other changes for a real rollback stay waiting. Said here so it is not
  discovered at the merge.
- No rotation of anything still in use.
- The Docker Hub tokens are not revoked here; that is the registry change's task
  and it waits on a completed rollback.

## What has to be decided, and is not obvious

1. **How "the previous version" is known.** The rollback target comes from the
   machine's container list, and a retention job that runs in CI cannot see it
   without asking the machine over SSH. Keeping the newest N is a proxy, and it
   is wrong in exactly the case that matters: production behind main after an
   unresolved rollback, where the version to keep is not among the newest.
2. **Whether a scheduled job may delete at all.** `loops.md` gives destructive
   actions one attempt and then a person. A retention job is destructive by
   definition and runs unattended. The alternatives are dispatch-only, or
   scheduled but reporting what it *would* delete until somebody agrees once.
3. **Whether the mirrored tag is safe.** `183bd32…-production` was copied to the
   new registry as the rollback target. By push time it is recent; by commit date
   it is not. A rule written against the wrong one of those deletes it.
