# A domain of our own

## Why

The mail role needs one. Verification and password reset both require sending
mail, and every provider requires a sending domain it can verify with SPF and
DKIM — `nip.io` cannot be verified by anybody, because it belongs to somebody
else and resolves any address anyone asks for.

So this is the step under the step. It adds no role, depends on no provider, and
it is what makes the next two changes possible at all.

It also has a mechanical use. The commit touches `config/`, so it produces a
**deployable release** — and eight tasks across three changes are waiting for
one: the rollback that has never completed on the new registry, the rehearsal
that proves a bad credential stops a release, and the revocation of the old
registry's tokens that waits on both.

## The real risk, which is not the domain

The address lives in **ten places**: twice in `ship.yml` and eight times across
seven instance stubs, as repeated `domain`, `staging_domain` and
`production_health_url` values.

A missed one does not fail. `nip.io` keeps resolving, so a workflow left pointing
at the old name goes on working — watching, deploying to, or asking about an
address nobody uses. That is the failure mode this change has to defend against,
and it is worse than an outage because nothing reports it.

The uptime monitor is the clearest case: it will keep polling the old name
happily while production answers on the new one. Liveness would be watching an
address with no users.

So the change carries a check: **the stubs agree with `ship.yml`**. One authority
for the instance's own address, asserted rather than remembered. Nothing checks
this today — the existing stub checker compares templates against the reusable
workflows they call, and never looks at values.

## What has to happen outside the repository

- a domain registered, roughly €10 a year against €120 for the machine;
- two `A` records pointing at the machine, one for production and one for the
  stand, because Let's Encrypt validates over HTTP through the proxy and needs
  the name to resolve **before** the deploy — a name that does not resolve yet
  means no certificate, which means the proxy's health check never passes and the
  deploy fails;
- the uptime monitor's URL changed. The token this project holds could not do it,
  so it is a person's edit unless a better path is found.

## What breaks, briefly

- **Every session dies.** Cookies are host-scoped, so changing the address logs
  everybody out, including the synthetic account. Harmless — it signs in fresh on
  every release — but it is the kind of thing that should be said before it
  happens rather than explained afterwards.
- The old names keep working, which is why a missed reference is silent.

## What has to be decided, and is not obvious

1. **Apex or subdomain.** Serving from `app.example.com` leaves the apex free for
   a marketing page and for mail's own records; serving from the apex is what
   most people type. This decision reaches the next change, because the mail
   provider's records attach to the domain that sends.
2. **Whether the stand keeps living under the same domain.** `staging.example.com`
   is simplest and puts a stand behind a name that looks production-shaped, which
   is the point of the stand — but it also means a certificate for it and a name
   somebody could stumble onto.
3. **Whether `nip.io` stays configured as a second name** or is dropped
   entirely. Keeping it is a fallback if DNS breaks; keeping it is also how a
   stale reference stays invisible.
4. **What the check compares.** `ship.yml` is the natural authority, but the
   pipeline reads the stubs, not `ship.yml` — so the check makes a document
   authoritative over the wiring, which is the opposite of how the registry host
   was settled two changes ago. That inconsistency should be resolved knowingly.
