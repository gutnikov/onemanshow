# Stop keeping what nothing uses

## Why, corrected twice by the examination

**The first draft's leading argument was false.** It said the rollback action
"still hands `POSTGRES_PASSWORD` to every invocation of the deploy tool". It does
not: the rollback workflow now derives what it decrypts from `.kamal/secrets`,
which names four secrets and not that one, so the two `-e POSTGRES_PASSWORD`
lines forward nothing. They are two dead words, not an exposure.

The honest reason is narrower and still worth acting on: `POSTGRES_PASSWORD` and
`DATABASE_URL_TUNNEL` sit encrypted in the secret store, inflating the set a
person believes is current. The check this project has catches a credential that
is **declared but empty**; nothing catches one that is **present but unused**,
and that is the one nobody rotates — because rotating it protects nothing anybody
can name. The credential that leaked into a log here was of exactly that kind by
the time it was noticed.

**And the first draft's central reassurance was wrong.** It said this change
merges without deploying. It does not:

> `on-secrets.yml`: *"Secrets are excluded from the release trigger because a
> secrets commit has no artifact to promote. **This is how such a change reaches
> production**: the version already running is deployed again, so only the
> configuration around it moves."*

The file explains it in its own header, and `registry-to-ghcr` task 4.1 says it
in as many words. I wrote the opposite anyway, after reading a stale list in
`gates.md` that spelled the exclusions out and told the reader not to trust it.
That prose is fixed in this change too: it now points at the script that reads
the trigger, and says plainly that "no release" and "no deploy" are different
sentences.

So the price of this change is **one production redeploy of the version already
running**, with no automatic recovery by design — the reconfigure path has none,
because what moved is the configuration. That is the whole cost, and it is not
zero.

## What is being removed

- `POSTGRES_PASSWORD` from `secrets/prod.yaml` and `secrets/staging.yaml`
- `DATABASE_URL_TUNNEL` from `secrets/prod.yaml`
- the two dead `-e POSTGRES_PASSWORD`, **by deleting the hand-written list they
  live in** rather than by removing one word from it. Those two `docker run`
  calls carry a live copy of the defect fixed this morning: four names are
  declared to the deploy tool, that list carries two of them plus a dead one, and
  misses `BETTER_AUTH_SECRET` and `SENTRY_DSN`. The shared action derives the
  list and refuses a declared-but-empty name; these two calls bypass it

## And the other half of the same debt, which the first draft missed

The example files describe a shape that is wrong in **both** directions, and they
are what a new project copies:

- three of the four still prescribe the two dead credentials;
- three of the four **omit `BETTER_AUTH_SECRET`**, which `.kamal/secrets`
  declares and the deploy fails without — the same omission that made a rollback
  unable to boot the application this morning, sitting in the file that documents
  the shape;
- the template's `staging.example.yaml` prescribes a staging `DATABASE_URL`,
  which `verify-secrets` warns is a trap: staging's database is a branch created
  per validation, so a stored value there is stale by construction.

Nothing compares examples with the real files. That is why all three defects
survived.

## Left alone, each for a stated reason

All four would look like the same string to a careless search:

- `backup.yml` sets `POSTGRES_PASSWORD: scratch` for a throwaway service
  container that proves the dump restores. Live.
- `compose.yml` sets one for local development. Live.
- `check-kamal-secrets.py` names it in a comment recording why that checker
  exists. The lesson, not the credential.
- `adopt-database.yml` reads `DATABASE_URL_TUNNEL` while adopting a managed
  database. The workflow stays. **The first draft's reason for keeping it was
  wrong**: it claimed the path is live for instances that have not moved, and the
  template's `prod.example.yaml` has never carried that name at all, so the path
  has been broken in the template since it shipped. Keeping the workflow is
  right; the fix is a line in the example and an error message that says what is
  missing, instead of failing inside `sops`.

## How we will know it worked

Dropped from the first draft, which the examination called out, and it matters
because two of the obvious criteria pass while the change is broken:

- a person reads **the reconfigure run** — because there will be one — and sees
  production redeployed at the same commit with smoke green;
- `sops -d secrets/prod.yaml` and `staging.yaml` list neither dead name, and
  both list `BETTER_AUTH_SECRET`;
- `scripts/check-kamal-secrets.py` still passes, which is the check that would
  notice if the two `.kamal/` files drifted while the list was being deleted;
- a rollback still loads its configuration. **Not** because the deploy tool would
  fail on the absent name — it never declared it, so nothing can notice, and the
  first draft's verification step said otherwise. Because the two calls now go
  through the shared action, and that action refuses a declared name with no
  value.

## One thing to check on the machine before merging

The reconfigure deploys the version already running. If that leaves two
containers at the same version, the rollback's success check compares the
second-newest to the newest and finds them equal — reporting `rewound=yes` while
production never moved. That is the defect two attempts were spent on this
morning, reachable through the trigger this change fires. It is a `docker ps -a`
question and it is cheaper to ask than to discover.
