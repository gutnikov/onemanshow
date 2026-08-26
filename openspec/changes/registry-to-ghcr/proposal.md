# Move the registry to ghcr

## Why

Three credentials exist today because the registry is somewhere else: a
read-write token in `secrets/ci.yaml` that the build uses, a read-only token in
`secrets/prod.yaml` and `secrets/staging.yaml` that the machine uses, and the
account they belong to. One of them — the read-only token — leaked into a CI log
before masking existed and is still unrotated.

On ghcr the build pushes with the token the run already has, so the read-write
token stops existing rather than being rotated. The machine still needs
something to pull with, so that one does not disappear; it becomes a
repository-scoped token instead of an account-wide one.

Two smaller things come with it: Docker Hub's pull limits stop applying, and the
64 tags now sitting there with no retention policy get a place where retention is
a setting rather than a chore.

**The reason this is safe to concentrate at one vendor** — while the secrets are
not, which was refused on the ticket — is that the image is rebuildable from
source. Losing the account costs a rebuild, not data. That is not true of a
credential or a database.

## No spec delta

Nothing in `openspec/specs` names a registry. `ship.yml` records `registry:
docker-hub` as a role's provider, and this changes the provider. The
requirements about promoting rather than rebuilding, and about the deployed image
being the validated artifact, are unchanged and still have to hold across the
move — which is most of the work below.

## What is being built

1. **The registry host stops being implicit.** Every `docker login`, every build
   tag and the artifact-existence check assume Docker Hub today by saying nothing:
   `docker login -u user` with no host is Docker Hub. The host becomes explicit
   in the four reusable workflows and in the deploy tool's own config.
2. **The build pushes with the run's own token**, with `packages: write`
   declared where it is needed, and `REGISTRY_TOKEN_RW` is deleted from
   `secrets/ci.yaml` rather than left to rot.
3. **The machine pulls with a repository-scoped token**, replacing
   `REGISTRY_TOKEN_RO` in both `prod.yaml` and `staging.yaml`.
4. **The last known-good image is mirrored to ghcr before the switch**, so a
   rollback across the boundary has somewhere to roll back to. See below.

## What is not included

- **The secrets do not move.** Refused on the ticket, with the requirement that
  forbids it quoted there.
- **No retention policy yet.** It is worth having and it is a separate change:
  deleting images is the one operation here that cannot be undone.
- **The package stays private.** Making it public would remove the machine's
  need for a credential entirely, and would publish the application's layers.
  For a template that might be acceptable; for the product this instance stands
  in for, it is not.

## The thing most likely to bite

**A rollback needs the previous image, and the previous image is on Docker Hub.**
After the switch, `kamal rollback` composes the image name from the configured
registry, so it would look on ghcr for a tag that only exists on Docker Hub.

It may work anyway: the previous image is already pulled on the machine, and a
rollback of a version whose image is present locally does not need the registry.
"May" is not good enough for the path that exists for incidents, so the change
mirrors the current production image to ghcr — one `imagetools create` — and the
Docker Hub credential stays alive for one release cycle rather than being deleted
in the same breath.

## How we will know it worked

- A release deploys an image pulled from ghcr and production reports the released
  commit. That is the ordinary evidence.
- The validated artifact and the deployed one are still the same layers, which the
  pipeline already checks — and the check has to be seen passing on the new host,
  not assumed to carry over.
- **A rollback is attempted deliberately after the switch**, because that is the
  path the boundary threatens and the only way to learn whether the local image
  saves us.
- `REGISTRY_TOKEN_RW` is gone from `ci.yaml` and nothing fails, which is the
  evidence that the build really stopped using it.

## What has to be decided, and is not obvious

1. **Where the registry host lives.** A new input threaded through four reusable
   workflows means six stub files repeat it, next to `image` and `registry_user`
   which they already repeat. The alternative is to read it from the deploy
   tool's own configuration, which is the authority on it anyway — fewer copies,
   at the cost of the pipeline reading a file that belongs to the deploy tool.
   The existing design says the pipeline must not infer things about the
   project's tooling; it also already runs that tooling by name.
2. **Whether the run's own token can push at all here.** The build happens in a
   reusable workflow owned by the template and called by the instance, so the
   permissions that apply are the caller's. If that turns out not to be enough, the
   read-write token does not disappear and the main saving of this change goes with
   it. This should be settled before anything is deleted.
3. **What the machine's pull credential is.** A fine-grained token scoped to one
   package is the tidy answer and expires; a classic token with `read:packages`
   does not expire and is broader. An expiring credential in a place nothing
   watches is a release that fails in three months for a reason nobody remembers.
4. **Whether this change should also delete the Docker Hub tokens.** Doing it in
   the same change is tidy and removes the rollback path across the boundary.
   Doing it later leaves two live credentials for a while, one of them the leaked
   one — which is an argument for rotating that one now rather than waiting for
   the cleanup.
