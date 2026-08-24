## Context

Greenfield. This repository currently holds nothing but openspec scaffolding; no application, no pipeline, no infrastructure exists. See `proposal.md` — Why for the motivation.

Two constraints shape every decision below:

**The target user is an indie founder with almost no money.** They will pay for a VPS, and perhaps a domain, and will not pay for a stack of SaaS. The whole system has to land at roughly €10/month, which rules out anything without a workable free tier. Nothing on the path to a first production deploy may require a purchase beyond the machine itself.

**The primary author of the code is a language model.** This is not a stylistic note — it changes what a good decision looks like. Compiler feedback substitutes for the reviewer the founder does not have, and mainstream technologies with large training corpora are written measurably better than exotic ones.

## Goals / Non-Goals

**Goals:**
- Prove the invariants in `specs/delivery-pipeline` by running a real change through the whole pipeline, including the failure paths.
- Take two measurements the design currently guesses at: whether the Claude Code Slack app responds to a message authored by another application, and the cost in Actions minutes of one headless agent run.
- Leave a reference project that is safe to break deliberately.

**Non-Goals:**
- Any product feature. The reference application stays featureless; the moment it acquires real functionality, breaking it stops being safe and it loses the only property that makes it valuable.
- Supporting more than one vendor per concern. Every role had exactly one implementation, so an adapter layer would be indirection rather than abstraction.
- The `ship` skill: statuses, gates, playbooks, grill, automation flows. Those are written after this skeleton has carried three changes.
- Versioning, releases, a published plugin or any update mechanism. Distribution is "Use this template" and nothing more; workflow stubs reference `@main` rather than a tag. This is deferred deliberately, not overlooked.

## Decisions

### This repository is the template; the testbed is disposable

This repository is public and marked as a GitHub template. It holds the skill, the reusable workflows and the reference application together, and "Use this template" is the entire distribution mechanism. There is no plugin to publish and no dependency to resolve.

That raises a real conflict, because `specs/delivery-pipeline` requires the deployed commit to equal the head of main, and editing a playbook moves main without changing what is deployed. Path filters would appear to solve it, but they dilute a check that can be run in one command into "equal for the files that affect the application", which is why they were rejected for spec synchronisation too.

The resolution is that **the template is never deployed.** We create a throwaway project from it exactly as a founder would, and that project's main branch moves only when the application changes, so the invariant holds literally where it is actually tested.

This is strictly better than deploying from the framework repository, because it also exercises the copy path itself. A skeleton living in the framework repository would prove the pipeline but never prove that creating a project from the template produces a working one. Here we are our own first user, so both are proven at once.

Being public buys one further thing: a workflow in another repository can only be reused when the repository holding it is public. So the testbed — and later any real project — can point its stubs at this repository's workflows and receive pipeline improvements without any update mechanism existing. That is the single channel of updates we get for free, and it happens to cover the most volatile part of the system.

*Alternatives considered:* a separate published plugin with versioned releases, rejected as infrastructure for a user base of zero — the same reasoning that removed the role abstraction. Splitting into a framework repository and a template repository, rejected because the testbed already solves the invariant problem and a split would leave the copy path untested.

### Distribution is a fork you own, not a dependency you consume

Because the template copies everything, a project owns its copy of the skill and may edit its playbooks. The cost is that **there is no update mechanism** for anything except the reusable workflows: someone who wants our later improvements adds this repository as an upstream remote and pulls by hand. At zero users that is the right trade, but it is a decision rather than an omission.

Two consequences of publishing follow. The template must contain **no real credentials at any point in its history** — only example files and placeholder recipients — since anything committed to a public history is compromised permanently, regardless of later deletion. And projects created from it stay private, which is why Actions minutes are budgeted at the private-repository allowance.

For our own iteration the skill is wired from a local path rather than relied upon as copied files, so editing a playbook takes effect immediately instead of requiring the testbed to be recreated. The copy path is exercised once, when the testbed is created.

### TypeScript end to end

The only candidate that satisfies "one language" and "static types" simultaneously with the largest corpus.

The typing argument is economic rather than aesthetic. `ship/check` is the only cheap gate in the pipeline; anything it misses is caught either on staging — which costs the exclusive slot, a deploy and a full end-to-end run — or in production. So the reach of the type system directly determines the cost of finding a defect. Two choices are made specifically to extend that reach: **TanStack Router**, whose typed routes and search params turn a broken link into a compile error rather than a test failure, and **Hono**, whose typed client derives from the route definitions so that an API contract change breaks the frontend build instead of surfacing as a defect a human finds on staging.

*Alternatives considered:* Go would produce a 20 MB image and minimal memory use, but it is a second language beside the frontend and slower to write product code in. A Python backend has the same two-language tax. Rails is highly productive and pairs naturally with Kamal, but weak default typing works directly against the gate economics above.

### A single-page application, not a server-rendered framework

Vite + React + TanStack Router and Query + shadcn + Tailwind, for an application behind a login; marketing pages live elsewhere. Faster builds (which convert directly into Actions minutes) and a smaller image than a server-rendered framework.

shadcn is chosen partly for a property specific to this project: it is copy-in code rather than a dependency, so components are versioned with the project, the agent reads and edits their actual source, and a UI library major version cannot break anything.

*Alternative considered:* TanStack Start, rejected because it reintroduces the server-rendering layer this decision deliberately drops.

### One container, one image

Hono serves the built frontend assets from the same process. The reason is the invariant, not convenience: "the deployed image is the image that passed end-to-end validation" needs exactly one artifact. Two images would make promotion a coordination problem across artifacts and stop it being checkable with a single comparison.

### Postgres with plain-SQL migrations

Drizzle, chosen because `specs/delivery-pipeline` requires staging to exercise the migration path and `specs/reference-app` requires a deliberately irreversible migration to be recognisable as such. Drizzle emits readable SQL, so a human or an agent can see exactly what will run and judge whether it is reversible.

*Alternative considered:* Prisma, rejected because it carries an engine binary (tens of megabytes against a constrained registry) and hides migrations behind its own machinery, precisely where transparency is required.

### Staging baseline derived from production's commit, not from a stored dump

Preparation destroys the staging volume, starts an empty database, then migrates and seeds at the commit production is running. No dump storage, no refresh schedule, no drift — the baseline is derived from git like everything else in this design, and it makes the migration under review actually execute against the production schema.

*Trade-off:* migrating from empty grows with project age. Acceptable for a young project; when it becomes slow the remedies are squashing migrations or caching a dump keyed by commit.

**Corrected after the first trial run.** Deriving the baseline from production also brings production's *data*, while the end-to-end fixtures belong to the change's commit — so any change touching the fixtures failed validation through no fault of its own. Observed directly on the local rig: with staging holding `the skeleton walks` and the change expecting `the skeleton walks on stage`, both content-asserting tests failed while both smoke tests passed.

One run cannot answer both questions, so validation is two runs: the **content-agnostic smoke set** against the migrated production baseline, proving the migration did not break the application against real-shaped data, and then a reset and seed at the change's own commit before the **full end-to-end suite**, proving the feature.

What makes this cheap is that the tool already existed. The smoke set was made content-agnostic for production, where the data is real and nothing can be asserted about it — and that is exactly the property required here. The design element pays off a second time in a place it was not designed for. It is also evidence for building the skeleton before the playbooks: this would otherwise have been discovered by the first real schema change, on a paid machine, and debugged as a CI fault rather than fixed as a one-paragraph spec error.

### Staging and production share one VPS

Chosen for operational simplicity — one deployment target, one proxy, one firewall, one machine to patch — and because conveyor exclusivity means the two are never busy simultaneously: end-to-end validation and the post-release observation period are different stages. One adequately sized machine costs about what two small ones do, so this is not primarily a cost decision.

Because the risk therefore moves from resource contention to data, three things are mandatory: **separate data planes** (each environment its own database container and named volume, never two databases in one instance, so reset is the destruction of a volume rather than a command against a server that also serves production); **hard resource limits on staging** so it cannot starve production; and **a guard inside the reset path** that refuses any target not matching the staging identity. On a shared machine the likeliest incident is not load but an operation pointed at the wrong target.

### Builds never move to the VPS

Images are built in Actions and only the finished artifact reaches the machine. Building executes dependency install scripts from the entire tree, and the threat is a compromised package rather than an outside contributor. The same reasoning excludes a self-hosted Actions runner on this topology, since a runner with container-socket access on the production box means anything CI runs controls production.

*Consequence:* when the 2000 free Actions minutes run out, the remedy is a shorter pipeline, not relocating the runner.

### Docker Hub as the registry

The registry is the physical carrier of the promotion invariant, so it must hold the image unchanged between staging validation and production release.

GHCR was the obvious choice and was rejected on a specific mechanic: its free egress quota is consumed whenever an image is pulled *outside* GitHub, and every deploy pulls to the VPS. Storage is not what bites first. Docker Hub's single private repository fits — we need exactly one image — with pull-rate limits far above our volume.

The registry may be fragile. Production keeps the image in its local cache, so rollback survives losing the registry; only the interval between validation and promotion matters. Note that rebuilding is *not* an acceptable recovery, because builds are not bit-reproducible and a rebuilt image is not the artifact that was verified.

### Exactly one secret outside the repository

The private age key, in exactly **one** place: a GitHub Actions secret. Every other credential is encrypted in git with SOPS. That sentence is the entire trust boundary, and it means no later setup step ever adds another platform secret — configuring a new service encrypts its token into the repository, versioned with the code and detectable by reading the repository. Separate age identities per environment, so a leaked key exposes one environment rather than both.

Corrected while provisioning: this originally said two places, the second being the machine. It does not need to be there. Deployment decrypts on the deploying host — CI — and passes values to the container as environment, so the machine never holds the key. Decrypted *values* do land on it, which is unavoidable because the application needs them, but not the key that would open every other secret in the repository. One copy instead of two is a smaller blast radius for free.

### A domain is optional, a host name is not

Two environments on one machine are distinguished by the requested host, so addressing them by bare IP does not work: one address cannot route to two places, and it cannot carry a certificate. The earlier shorthand "no domain, use the IP" was therefore wrong as specified.

The no-domain path instead uses host names **derived from the machine's IP** through a wildcard DNS service — the form `1.2.3.4.nip.io`, with a distinct name per environment. This needs no registration and no money, routes by host exactly as a real domain does, and accepts a certificate, so the degraded path behaves like the configured one instead of being a different mechanism.

The practical effect is that a domain leaves the critical path entirely: the only purchase required to reach a first production deploy is the machine.

*Alternative considered:* separating environments by port on a single IP, rejected because it makes the degraded path structurally different from the configured one, which is exactly the sort of divergence that leaves the fallback untested.

### Observability split by what has to survive

**Liveness is external and mandatory** — self-hosted monitoring is useless exactly when needed, and with a single machine there is no second one to watch from. **Diagnostics go wherever they are cheapest**: Sentry's free tier for errors, and `kamal app logs` for logs, which adds no tool at all.

The decisive mechanism is **tagging the Sentry release with the commit SHA**, so the post-release question becomes "are there new issues in release `<SHA>`?". This matters because of a problem particular to this user: an indie product has almost no traffic, which makes error *rates* meaningless (one error in three requests is 33%) and makes a quiet observation period ambiguous — it may mean nobody visited. Asking about new issues in a specific release is robust at any traffic volume, and absolute counts are used rather than rates until there is traffic to make rates meaningful.

The complementary half is synthetic traffic, which is why `ship/smoke` is a tagged subset of the existing end-to-end suite run against production rather than a health ping — it exercises real paths and needs no new tooling.

### No monorepo tooling

A single package with `web/`, `api/` and `shared/` directories: one install, one lockfile, one Dockerfile. Turbo or nx solve problems a solo project does not have, and fewer configuration files is a direct benefit to an agent author.

### Readiness must detect drift in both directions

Found on the rig while exercising the cascade, and the more valuable of the two findings. After the irreversible migration was released and production rolled back one step, the older code failed with `column "message" does not exist` — while `/health` answered `200 {"ready":true}`, because the check asked only whether applied migrations were *fewer* than expected. In the database there were two; the running code expected one.

That is the worst possible moment to look healthy. Our own design makes the external liveness check the one mandatory signal, precisely because it survives when the machine does not — and a one-sided readiness check keeps it green through a rollback that left the schema ahead of the code. Smoke catches this, but smoke runs once after a deploy while liveness runs continuously, so the observation window would have watched a broken production and closed green.

Readiness therefore compares in both directions and names the two states separately: `migrations-behind` and `schema-ahead`. The comparison was extracted into a pure function so `check` covers it, which is the same argument as everywhere else — the cheapest gate should hold as much as it can.

## Risks / Trade-offs

- **The Claude Code Slack app may ignore messages authored by another application** → This is the one unknown that could change the shape of the automation layer, which is why measuring it is a goal of this change rather than an assumption. Fallbacks in order: post with a user token so the message is an ordinary human one; failing that, run the agent headless in an Actions workflow for the small number of events that need judgment. Either way the pipeline itself is unaffected.
- **A crash loop can exhaust the free error-tracking quota and blind us** → Spike protection and client-side sampling are mandatory, not optional. This is a loop that burns an external quota rather than our own resources, so "is it cheap to repeat this a hundred times?" must be read as covering exhaustible resources, not only destructive ones.
- **A free monitoring tier typically checks every five minutes**, which bounds detection latency regardless of how short the observation period is → Accepted, but it must be stated rather than discovered: the guarantee is "within about five minutes", not "immediately".
- **Synthetic staging cannot reveal defects that depend on real data** → Accepted deliberately, and it is why post-release verification carries more weight than staging does. Staging proves the code and the migration path; production behaviour is proven only in production.
- **Free-tier terms change** → Every dependency is either self-hosted or trivially replaceable, and the only irreplaceable one, GitHub, is also the least likely to change. Verify current quotas before committing rather than trusting the numbers recorded here.
- **A shared machine means a staging fault can affect production** → Mitigated by the three rules above, and structurally limited by exclusivity, which keeps the two from being busy at once.

## Migration Plan

Nothing exists yet, so this is a bootstrap rather than a migration. The ordering is forced by dependency: secrets, then registry, then the machine, then the pipeline. That sequence reaches a real production deploy; a domain, staging preparation, observability and automation follow afterwards and each merely lights up another stage.

The skeleton itself is built **by hand, outside the pipeline** — the single legitimate exception to "every change travels the full pipeline", because at that moment the pipeline does not exist. From then on the exception is closed, and the first three changes through the pipeline are: a harmless string edit (proving the happy path and taking both measurements), a deliberate production break (proving smoke, rollback and escalation), and the irreversible migration (proving the cascade guard).

Rollback for this change is trivial: the testbed is disposable and nothing depends on the template yet.

## Open Questions

- The per-ticket budget of automatic agent wake-ups, and the retry budget for a failed end-to-end run. Both were named illustratively (roughly fifteen and two) and both want data from the three trial changes rather than a guess. Neither affects the specs or the task breakdown.
- Whether centralised log collection is worth adding later. `kamal app logs` is sufficient for one machine, so this is deferrable without consequence.
