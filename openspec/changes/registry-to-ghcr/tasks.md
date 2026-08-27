# Tasks

## 0. Whether or not the rest happens

- [ ] 0.1 Rotate the leaked read-only registry token. It leaked into a CI log before masking existed, it is the cost of *skipping* this change, and it should not wait for a migration to be worth doing

## 1. Stop the host being implicit, without a silent fallback

- [ ] 1.1 Export `SHIP_REGISTRY_SERVER` from the workflows that run the deploy tool, and **remove its `"docker.io"` default** from `config/deploy.yml`. The default is what would let a forgotten export resolve one path to Docker Hub while another uses ghcr
- [ ] 1.2 Add it to all **four** `-e` allowlists for the container Kamal runs in — the deploy action, both invocations in the rollback action, and the database retirement workflow. Verify by making each one fail with the variable removed, because the failure mode is a path that quietly disagrees with the others
- [ ] 1.3 The two runner-side logins name the host explicitly

## 2. Push with the run's own token

- [ ] 2.1 `packages: write` on the validate job, and the build pushes without a stored credential. Verify the push happens and the image is inspectable at the new host
- [ ] 2.2 The artifact-existence check uses the run's own token with `packages: read`, so the pull credential stops being decrypted onto a runner there
- [ ] 2.3 Record in `init.md` that an instance's workflow permission ceiling must allow `packages: write`, since the build now depends on it and a repository defaulted to `read` would fail at push time in somebody else's project

## 3. Names

- [ ] 3.1 The image path and the account name change together — owner `gutnikov`, not `agutnikov` — across twelve stub files in two repositories, and the template placeholder stops being called `REPLACE_ME_DOCKERHUB_USER`
- [ ] 3.2 **The package name is derived per repository rather than typed**, so two instances under one owner do not collide on one package. Verify by reading what a second instance would resolve to
- [ ] 3.3 `check-instance-stubs.py` learns to refuse a stub whose registry is unset as well as one whose `image:` carries a host — it guards only the second today, and the mistake this change can make is the first

## 4. A way back

- [ ] 4.1 Mirror the image production runs to ghcr **before** the switch, at the exact tag, and verify by inspecting it there and confirming the `service` label survived — Kamal validates that label before booting a pulled image.

  **The target, worked out rather than guessed:** `ghcr.io/gutnikov/onemanshow-testbed:183bd3295cd2e391a2a297647742c1fe749e4600-production`. Two things make it that and not something simpler. The image **name** changes too, because it is now derived from the repository rather than typed, so the running version has no tag under the new name either. And the sha is the one production runs now, not the one being released.

  **And it is needed twice at merge, not once.** This change touches `secrets/**`, so merging it fires the reconfigure workflow as well as the release, and the reconfigure redeploys **the version already running** with the new configuration — which composes exactly the reference above. Whichever of the two wins the race, the mirror is what stops one of them failing on a pull. Neither can be avoided: the credential and the configuration have to land in the same commit, because either alone is a mismatch
- [ ] 4.2 Decide whether `kamal rollback` gains an explicit registry login, given that it has none today and its pull depends on a login left on the host by the last deploy. This decides whether the machine's credential may expire
- [ ] 4.3 **Keep a written list of the shas whose `-production` tag exists only on ghcr**, and keep it current. Without it, undoing this change cannot be performed: the release refuses to rebuild, so each such image must be mirrored back by hand
- [ ] 4.4 Neither Docker Hub token is revoked until a release **and** a real rollback have both succeeded on ghcr

## 5. Then production

- [ ] 5.1 The stand first: build, push and deploy from ghcr end to end
- [ ] 5.2 A release deploys from ghcr, and a person reads the literal `ghcr.io/` in the deploy step's output — the commit production reports is the same either way
- [ ] 5.3 Attempt a rollback deliberately, now that its reporting has been fixed
- [ ] 5.4 The pull credential is exercised in both directions by a standing check: it can pull and it cannot push
- [ ] 5.5 `manual-path` 1.2: a commit that **does** touch a deployable path still releases. This change touches `config/`, so its release is the first chance to see that direction — and this one stays, because it is a by-product rather than an experiment that needs an unambiguous cause
