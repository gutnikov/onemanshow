# Move the registry to ghcr

## Why, re-priced by the examination

The first draft gave four reasons. Three do not survive reading the files, and
saying so is the point of writing this down.

**What is actually gained.** Two things, both real:

1. `REGISTRY_TOKEN_RW` stops existing rather than being rotated: the build pushes
   with the token the run already has. That is one declared permission, not an
   experiment — see below.
2. The artifact-existence check in the release stops needing a stored credential
   at all. It logs in only to ask "does this tag exist", which on ghcr the run's
   own token answers. That removes one of the five places the pull credential is
   decrypted onto a runner — and being decrypted onto a runner is exactly how the
   current one leaked into a log.

**What was claimed and is false.**

- *"Docker Hub's pull limits stop applying."* They do not. `Dockerfile` pulls
  `node:22-alpine` on every build, and `backup.yml`, `adopt-database.yml` pull
  `postgres:18-alpine`. The app image is pulled **authenticated**, which was never
  the limited case; every anonymous pull stays where it is.
- *"Three credentials exist because the registry is somewhere else."* The pull
  credential is decrypted in five reusable workflows — release, staging,
  reconfigure, rollback, retire-database — and after the move a repository-scoped
  ghcr token is decrypted in the same five. The exposure surface does not shrink;
  the blast radius of the next leak does.
- *"64 tags with no retention."* The repository is private, so nobody reading this
  can check the number, and the tidiness argument rested on it. Retention is also
  available where the images are today.
- *Repository-scoped instead of account-wide* is available on Docker Hub. If scope
  is the argument, moving vendor is not the mechanism.

**What skipping costs, which the first draft never priced.** Rotating one leaked
token. That should happen whether or not this change happens, and it is listed
as task 0 below for that reason.

## What the examination settled, so `dev` does not reopen it

- **The registry host is not a new parameter.** `config/deploy.yml` already reads
  `ENV.fetch("SHIP_REGISTRY_SERVER", "docker.io")`, and that variable is set
  **nowhere in either repository**. So the "decision" in the first draft was a
  false choice. The real work is deciding which workflows export it — and
  **removing the default**, because a default means a forgotten export silently
  resolves to Docker Hub in one path while another uses ghcr.
- **Whether the run's own token can push: yes.** The instance's ceiling is
  `write`, no stub restricts it, and a called reusable workflow mints the
  **caller's** token. `pr.yml`'s validate job declares `permissions: { contents:
  read }`, so the answer is adding `packages: write` there. One line.
  `secrets: inherit` is unrelated — the run's token is minted, not inherited.
- **The image path and the account name both change.** The GitHub owner is
  `gutnikov`; the Docker Hub account is `agutnikov`. Twelve stub files carry
  `image:` and `registry_user:`, and the template's placeholder is literally
  called `REPLACE_ME_DOCKERHUB_USER`.
- **The package name must be derived per repository, not typed.** Two instances
  of this template under one GitHub owner would collide on one package, and the
  second instance's token cannot push to a package linked to the first. For a
  template that is a correctness requirement, not tidiness.

## The real size of it

Not "four workflows". Two runner-side logins, six workflows that take a registry
account and token, two composite actions that embed the image path in registry
commands, **four separate `-e` allowlists** for the container Kamal runs in, and
twelve stub files across two repositories. The allowlists are the dangerous part:
update the deploy path and forget the rollback path, and the release uses ghcr
while a rollback silently uses Docker Hub — a disagreement that surfaces only
during an incident.

## What is not included

- **The secrets do not move.** Refused on the ticket, with the requirement quoted
  there.
- **The rehearsal goes back where it was deferred.** The first draft claimed the
  deferred pre-deploy-probe rehearsal from `smoke-signs-in` and `manual-path`.
  That was wrong: the rehearsal's entire value is that a red probe is
  *attributable*, and running it on the release that also changes the registry
  gives a red probe two candidate causes. It was deferred to escape exactly that
  ambiguity.
- **No retention policy.** And a note for whoever writes one: any age-based rule
  must exempt what production runs **and its predecessor**, because the rollback
  target is chosen from the machine's containers and Kamal will need that
  version's image at the configured path.
- **The package stays private**, so the machine keeps needing a credential.

## The thing most likely to bite, corrected

A rollback needs the previous image, and after the switch Kamal composes a
reference that does not exist. The first draft hedged that a locally present
image might save it. It will not: Docker resolves by **reference string**, and
`ghcr.io/gutnikov/…:<sha>-production` is not what the host has tagged. So the
mirror is mandatory, not belt-and-braces.

Two consequences the first draft missed:

- **`kamal rollback` never logs into the registry.** Login happens on the deploy
  path, not the rollback path, so a rollback's pull depends on a login left on
  the host's disk from the last deploy. An expiring token therefore fails the
  *rollback during an incident*, not a release. Either the credential does not
  expire, or the rollback gains an explicit login.
- **The mirror must preserve the `service` label**, because Kamal validates it
  before booting a pulled image.

## How we will know it worked

Corrected, because three of the first draft's four criteria pass while the change
is broken.

- **A person reads the deploy step's host output for the literal `ghcr.io/`.**
  The commit production reports is identical whichever registry it came from.
- **The credential is exercised in both directions**, the way the database key
  already is: the new pull token succeeds against the package and is refused for
  write. A standing check, not a one-off.
- **A rollback is attempted for real** — now worth something, because the
  reporting defect that made it unable to fail was fixed first: the rollback used
  to report `rewound=yes` on exit 0, and `kamal rollback` exits 0 when the target
  container is gone.
- **The layers check is not evidence about the boundary.** It takes one image and
  never crosses registries. Seeing it pass on ghcr proves it still runs.

## Recommendation, since the examination changed the price

Rotate the leaked token now, as task 0, independently of everything else. Then
this change is worth doing for one credential removed, one runner-side decryption
removed, and retention becoming possible — against roughly twenty files in two
repositories. That is a fair trade but a much smaller one than the first draft
implied, and if the answer is "not now", the right outcome is the rotation alone.
