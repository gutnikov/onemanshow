# Secrets

`staging.yaml`, `prod.yaml` and `ci.yaml` are committed **encrypted**. The
example files next to them show the shape and are committed in plaintext because
they contain nothing.

The split matters. `prod.yaml` and `staging.yaml` are what the container is
given; `ci.yaml` is what the pipeline uses. A value the application never reads
does not belong in the first two, because changing one of those redeploys the
application — which happened once, for a test account's password.

## The one secret that is not here

The private age key. It exists in exactly one place outside this repository: a
GitHub Actions secret, so the pipeline can decrypt during deploy.

It is deliberately **not** on the machine. Deployment decrypts on the deploying
host and passes values to the container as environment, so the machine holds
decrypted values — unavoidable, the application needs them — but never the key
that would open every other secret here.

Keep a second copy in a password manager. Losing it means every value in these
files is unrecoverable — encrypted with no way back.

## Adding a value

    sops secrets/staging.yaml

`sops` decrypts in place for editing and re-encrypts on save, so there is no
separate plaintext file to leak — the committed `staging.yaml` is the ciphertext.
The way to leak one is `sops -d secrets/prod.yaml > something`, so anything of
that shape is gitignored.

`git show` on any commit touching these paths must show ciphertext only. If it
shows a value, that value is compromised permanently: rotate it rather than
trying to remove it from history.

## Why no later setup step adds another Actions secret

Every credential a project acquires — a registry token, an error-tracking token,
a monitor's API key — is encrypted into these files instead of pasted into a
platform's settings page. The consequence is that the set of secrets is
versioned with the code, reviewable in a diff, and detectable by reading the
repository, which is how `init` can tell that a role is configured.
