# Tasks

## 0. The leaked token — revoked, not rotated

Corrected by the person at the gate, and the correction is better than what it
replaced. Rotating a credential for a service we are leaving keeps a working
credential in existence for no reason; revoking it keeps none. And the images it
can read stop mattering once nothing is pushed to them.

- [ ] 0.1 **Revoke both Docker Hub tokens, and delete the Docker Hub repository**, once a release and a real rollback have both succeeded on ghcr. Deleting the repository is what makes the leak inert: the leaked token could read the application's layers, and revoking removes the key while deleting removes the thing the key opened
- [ ] 0.2 **A deadline, because "after the migration" is not a date.** The leaked token stays valid for as long as this change takes. If the migration is not finished within a week, rotate it after all — the exposure is not conditional on our plans

## 1. Stop the host being implicit, without a silent fallback

- [x] 1.1 Export `SHIP_REGISTRY_SERVER` from the workflows that run the deploy tool, and **remove its `"docker.io"` default** from `config/deploy.yml`. The default is what would let a forgotten export resolve one path to Docker Hub while another uses ghcr **Done**, in the template and in the instance — the instance keeps its own copy of the deploy config and I had edited only the template's, which would have left the fallback exactly where it mattered
- [x] 1.2 Add it to all **four** `-e` allowlists for the container Kamal runs in — the deploy action, both invocations in the rollback action, and the database retirement workflow. Verify by making each one fail with the variable removed, because the failure mode is a path that quietly disagrees with the others **Done for five allowlists, not four**: the rollback has three invocations because one was added earlier the same day. The count came from the files. The loudness half is delegated to the removed default — `ENV.fetch` without one raises — and the rollback path is exercised for real in 5.3
- [x] 1.3 The two runner-side logins name the host explicitly **Done.**

## 2. Push with the run's own token

- [x] 2.1 `packages: write` on the validate job, and the build pushes without a stored credential. Verify the push happens and the image is inspectable at the new host **Done and proven**: the build pushed to ghcr with the run's own token, and the package appeared linked to the repository, which is what lets later runs push to it
- [ ] 2.2 The artifact-existence check uses the run's own token with `packages: read`, so the pull credential stops being decrypted onto a runner there
- [x] 2.3 Record in `init.md` that an instance's workflow permission ceiling must allow `packages: write`, since the build now depends on it and a repository defaulted to `read` would fail at push time in somebody else's project **Done.**

## 3. Names

- [x] 3.1 The image path and the account name change together — owner `gutnikov`, not `agutnikov` — across twelve stub files in two repositories, and the template placeholder stops being called `REPLACE_ME_DOCKERHUB_USER` **Done**, twelve stub files across two repositories
- [x] 3.2 **The package name is derived per repository rather than typed**, so two instances under one owner do not collide on one package. Verify by reading what a second instance would resolve to **Done** — `${{ github.repository }}`, so the package is one per instance repository
- [x] 3.3 `check-instance-stubs.py` learns to refuse a stub whose registry is unset as well as one whose `image:` carries a host — it guards only the second today, and the mistake this change can make is the first **Done, and it needed no new code**: making the input required means the existing required-input check does it. Proven by removing the host from one stub and watching the checker say `does not pass required input 'registry'` — the first attempt at that proof edited nothing, because I matched the wrong indentation

## 4. A way back

- [x] 4.1 Mirror the image production runs to ghcr **before** the switch, at the exact tag, and verify by inspecting it there and confirming the `service` label survived — Kamal validates that label before booting a pulled image. **Done and verified at the destination**: `ghcr.io/gutnikov/onemanshow-testbed:183bd32…-production` exists and carries `service: onemanshow`, compared against the same label at the source. Not by the copy command's exit code

  **The target, worked out rather than guessed:** `ghcr.io/gutnikov/onemanshow-testbed:183bd3295cd2e391a2a297647742c1fe749e4600-production`. Two things make it that and not something simpler. The image **name** changes too, because it is now derived from the repository rather than typed, so the running version has no tag under the new name either. And the sha is the one production runs now, not the one being released.

  **And it is needed twice at merge, not once.** This change touches `secrets/**`, so merging it fires the reconfigure workflow as well as the release, and the reconfigure redeploys **the version already running** with the new configuration — which composes exactly the reference above. Whichever of the two wins the race, the mirror is what stops one of them failing on a pull. Neither can be avoided: the credential and the configuration have to land in the same commit, because either alone is a mismatch
- [x] 4.2 Decide whether `kamal rollback` gains an explicit registry login, given that it has none today and its pull depends on a login left on the host by the last deploy. This decides whether the machine's credential may expire **Decided: the rollback gains an explicit registry login.** It had none — the deploy path logs in as a side effect of pushing, while a rollback only boots, so it was relying on a login left in the host's docker config by the last deploy. A file nobody declares and nothing checks, needed at the exact moment it is an incident. The credential also has no expiry, but that was a mitigation for a dependency rather than a reason to keep it
- [ ] 4.3 **Keep a written list of the shas whose `-production` tag exists only on ghcr.** Started: everything built on this change's branch, and from the merge onwards everything. The mirrored `183bd32…` exists in both places and is therefore not on the list, and keep it current. Without it, undoing this change cannot be performed: the release refuses to rebuild, so each such image must be mirrored back by hand
- [ ] 4.4 Neither Docker Hub token is revoked until a release **and** a real rollback have both succeeded on ghcr

## 5. Then production

- [x] 5.1 The stand first: build, push and deploy from ghcr end to end **Done.** The stand built, pushed and deployed from ghcr end to end: `ghcr.io/gutnikov/onemanshow-testbed` appears in the deploy log and no Docker Hub app image does. Smoke 3, suite 12
- [ ] 5.2 A release deploys from ghcr, and a person reads the literal `ghcr.io/` in the deploy step's output — the commit production reports is the same either way
- [ ] 5.3 Attempt a rollback deliberately, now that its reporting has been fixed
- [ ] 5.4 The pull credential is exercised in both directions by a standing check: it can pull and it cannot push
- [ ] 5.5 `manual-path` 1.2: a commit that **does** touch a deployable path still releases. This change touches `config/`, so its release is the first chance to see that direction — and this one stays, because it is a by-product rather than an experiment that needs an unambiguous cause

## 6. Found by hitting it

- [x] 6.1 **A change that alters a stub's inputs cannot validate itself.** The staging validation is dispatched with `gh workflow run` and no `--ref`, so the stub it runs is always main's. With the reusable workflow on main already requiring the new input and main's stub not yet passing it, the run failed at startup with no log to read. The wiring therefore landed on main first, where it is inert because `.github/**` releases nothing, and the change followed. Same shape as the manual merge path that could not deliver itself
