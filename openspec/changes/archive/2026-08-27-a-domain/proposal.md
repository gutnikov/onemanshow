# A domain of our own — first the proxy learns the name

## What the examination changed

Four claims in the first draft were false, and one of them inverted the whole
design. Correcting them turns this from one risky change into two safe ones.

**1. As scoped, it produced no release.** The first draft said the commit touches
`config/` and therefore deploys. It did not touch `config/` at all: the domain
arrives through the environment, and the ten places are `ship.yml` and
`.github/**` — both excluded from the release trigger. The project recorded this
exact finding two changes ago and I contradicted it. The mechanical justification
for the whole change was wrong.

**2. The failure mode was inverted.** The draft said a stale reference keeps
working silently because `nip.io` keeps resolving. It is the opposite for most of
them: `proxy.host` is a single value, so the deploy that adds the new name
**stops the proxy answering for the old one** — the name resolves and then 404s.
So stale *read* paths fail loudly, and quickly:

- the merge guard that asks production what it runs, refusing every merge;
- the window check, every ten minutes;
- `verify secrets`, which reads the domain out of the release stub;
- the database retirement workflow.

What fails *silently* is the other direction, which the draft never separated:
the **write** paths. A stale domain in the rollback or reconfigure stubs means
the emergency path re-registers production on the old address, mid-incident,
while everything asking about it looks at the new one.

**3. The TLS chain was invented.** The draft said a missing certificate makes the
proxy's health check fail and the deploy fail. The proxy's health check polls the
container over plain HTTP inside the machine and has nothing to do with
certificates; a deploy succeeds with no certificate and no DNS. The real gap is
that certificates are issued lazily, on the first handshake for a host the proxy
has been told to serve — and the first handshake after a deploy lands on the
stand's migration-safety smoke, which has no retry loop.

**4. Its own release would have died before deploying.** The release asks the
running production to sign in *before* it changes anything, with `SHIP_URL` set
from the new domain. With the proxy not yet serving that name, that step fails —
and it is the very probe two other changes are waiting to rehearse deliberately.
A red probe with two candidate causes teaches nothing, which is this proposal's
own sentence about a different change.

## So: two changes, and this is the first

**The proxy learns the new names while keeping the old ones.** Kamal's proxy host
is already comma-splitting — `proxy_config["hosts"] || proxy_config["host"]&.split(",")`
— so serving both costs one optional variable and no new concept.

Nothing else moves. Every health URL, every `SHIP_URL`, every probe still points
at the old name, which the proxy still serves. Certificates for the new names are
issued under no time pressure, and can be inspected before anything depends on
them.

That makes this a genuine `config/` change, so it **does** produce a release —
the one several waiting tasks need — and it does so without asking any part of
the pipeline to talk to a name that does not answer yet.

The second change flips the ten references, adds the check that keeps them in
step, and moves the monitor last. Its decisions are recorded on its own ticket
rather than here.

## What this change is not

- It does not change any address the pipeline uses.
- It does not touch the monitor. **And the earlier advice to pause it was wrong**:
  a paused monitor is not `active`, and the window check then reports the liveness
  declaration as stale and closes the window **unhealthy**. The right holding
  action is to point it back at the old name until the second change lands.
- It does not decide apex versus subdomain. That was decided for us: the apex is
  already serving something else, so production is `app.` and the stand is
  `staging.`

## How we will know it worked

- The served certificate is **asked what it is for**, on both new names and both
  old ones. Not "the page loads" — the old certificate would serve the old name
  perfectly well and prove nothing.
- The old names keep answering, which is the property that makes the second
  change safe. Verified by asking them, not by assuming that adding a name is
  additive.
- The stand comes up serving both names too, and its migration-safety smoke — the
  step with no retry — passes on the first handshake rather than on a second
  attempt.

## What has to be decided

1. **Whether the alternate name is configuration or a one-off.** An optional
   variable that most instances leave empty is a small permanent concept; doing
   it by hand once leaves the template without the mechanism that made the move
   safe. The template is the product, so this is not obvious.
2. **Whether the stand needs the same treatment at the same time.** It is
   redeployed per validation, so it gets the new configuration for free — but its
   first handshake is on the one step that cannot retry.
3. **Whether `kamal rollback` re-renders the container's environment.** This
   change makes the answer matter: a rollback to a container built when
   `SHIP_PUBLIC_URL` was the old name would carry the old base URL, and the
   library refuses a request whose origin does not match. The evidence in this
   repository points both ways, and the verification the rollback runs cannot see
   the difference because it does not sign in.
