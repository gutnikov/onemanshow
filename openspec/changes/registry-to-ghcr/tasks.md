# Tasks

## 1. Decide before touching anything

- [ ] 1.1 Settle where the registry host lives: an input repeated in six stubs, or read from the deploy tool's own config. Record the answer and the reason
- [ ] 1.2 **Settle whether the run's own token can push to ghcr from a reusable workflow owned by another repository.** If it cannot, the read-write token stays and the main saving of this change is gone — so this is answered by trying it, before anything is deleted
- [ ] 1.3 Settle what the machine pulls with, and if it is an expiring token, where its expiry is recorded so a release does not fail in three months for a forgotten reason

## 2. The switch, with a way back

- [ ] 2.1 Mirror the image production currently runs to ghcr before anything changes. Verify by inspecting it on the new host, not by trusting the command's exit code
- [ ] 2.2 The registry host becomes explicit in the build, both logins, the artifact-existence check and the deploy configuration. Verify each one names ghcr rather than inheriting a default
- [ ] 2.3 The stand goes first: a validation run that builds, pushes and deploys from ghcr end to end, with the layers check passing on the new host

## 3. Production

- [ ] 3.1 A release deploys from ghcr and production reports the released commit
- [ ] 3.2 **Attempt a rollback deliberately afterwards.** This is the path the migration threatens: the previous image may live only on Docker Hub, and it may or may not be saved by already being present on the machine. Learn which, on purpose, rather than during an incident
- [ ] 3.3 Verify the promoted image and the validated one are still the same layers — seen passing, not assumed to carry over

## 4. Removing what is no longer used

- [ ] 4.1 Delete `REGISTRY_TOKEN_RW` from `secrets/ci.yaml` and confirm a build still passes. A credential that is unused but present is one nobody rotates
- [ ] 4.2 Replace `REGISTRY_TOKEN_RO` in `prod.yaml` and `staging.yaml`, and verify the old value no longer works anywhere by trying it
- [ ] 4.3 Decide and record when the Docker Hub tokens die. The leaked read-only one is a standing item; if it survives this change, rotate it in this change instead of waiting

## 5. What this change also closes

- [ ] 5.1 `manual-path` 1.2: a commit that **does** touch a deployable path still releases. This change touches `config/` and the workflows, so its release is the first chance to see the other direction of that decision
- [ ] 5.2 `smoke-signs-in` 3.2 and `manual-path` 7.1-7.3: the deferred rehearsal. With a knowingly wrong credential, the pre-deploy sign-in probe must stop this change's release before anything is migrated or deployed — and here the head is deployable, so a probe that failed to stop it would not leak a wiring-only commit to production
