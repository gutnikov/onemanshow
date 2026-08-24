All tasks are performed in this repository or in an external service, except group 9, which runs in the disposable testbed project created from this template in task 1.5.

## 1. Repository and testbed

- [ ] 1.1 Make this repository public and mark it as a GitHub template; verify the repository page offers "Use this template"
- [ ] 1.2 Exclude our own openspec change history from what the template ships, keeping the configuration and directory structure; verify a project created from the template carries openspec config and no inherited changes
- [ ] 1.3 Confirm no real credential exists anywhere in this repository's history, only example files and placeholder recipients; verify by scanning the full history rather than the working tree
- [ ] 1.4 Wire the skill from a local path for our own iteration instead of relying on the copied files; verify that editing a playbook takes effect without recreating the testbed
- [ ] 1.5 Create the private testbed project through "Use this template" rather than by cloning, so the copy path is itself exercised; verify the resulting project builds before any change is made to it

## 2. Secrets foundation

- [ ] 2.1 Generate two age identities, one for staging and one for production; verify each private key decrypts only its own environment's file and fails on the other
- [x] 2.2 Add `.sops.yaml` with path rules binding each environment's file to its recipient; verify an encrypted test file shows only ciphertext in `git show`
- [ ] 2.3 Add the age private keys as Actions secrets; verify a throwaway workflow decrypts the staging file and prints a known value
- [x] 2.4 Document that these keys are the only secrets outside the repository; verify by grepping the template for any other plaintext credential and finding none

## 3. Registry

- [ ] 3.1 Create one private Docker Hub repository for the application image; verify it is visible and empty
- [ ] 3.2 Create two access tokens, read-write and read-only, and encrypt both with SOPS; verify the read-only token cannot push by attempting a push and receiving a permission error
- [ ] 3.3 Confirm the pull-rate and storage terms currently in force; verify the recorded figures in `design.md` still match and correct them if not

## 4. Reference application

- [x] 4.1 Scaffold a single package with `web/`, `api/` and `shared/` directories, one lockfile and one shared TypeScript configuration; verify `tsc --noEmit` passes across all three
- [x] 4.2 Add one table with its first migration; verify the migration produces readable SQL and applies to an empty database
- [x] 4.3 Add a seed writing exactly one row, and use it as the end-to-end fixture source; verify seeding twice from clean yields identical state
- [x] 4.4 Add one API route returning the seeded value through the typed client; verify changing the route's response type breaks the frontend build
- [x] 4.5 Add one page that renders the value, using typed routing and one component copied in from shadcn; verify a deliberately misspelled route parameter fails `tsc` rather than only failing at runtime
- [x] 4.6 Implement `/health` to check database reachability and migration currency; verify it returns non-2xx with the database stopped and with the schema deliberately behind
- [x] 4.7 Add the end-to-end test that opens the page and asserts the seeded value, and tag a non-mutating subset as the smoke set; verify the smoke set passes twice in a row against the same environment with no state change
- [x] 4.8 Add one unit test; verify it runs in the check hook and requires no running application
- [x] 4.9 Add the deliberate failure switch, disabled by default, that breaks the smoke set while the application still starts; verify the smoke set fails when it is enabled and passes when it is not
- [x] 4.10 Add the deliberately irreversible migration, inert until enabled, with a written note of the manual step reverting it would require; verify it is not applied while inert
- [ ] 4.11 Add a multi-stage Dockerfile producing one image that serves both the API and the built assets; verify the image runs the page end to end and measures under 150 MB

## 5. Application hooks

- [x] 5.1 Add `ship/check` running type checking, linting and unit tests; verify it succeeds with no database and no deployed application present
- [ ] 5.2 Add `ship/build`; verify it produces an image tagged with the current commit SHA
- [x] 5.3 Add `ship/migrate` and `ship/seed`; verify each is idempotent when run twice against the same state
- [x] 5.4 Add `ship/e2e` and `ship/smoke`, both reading their target from `SHIP_URL`; verify each fails cleanly when `SHIP_URL` is unset rather than defaulting to an environment
- [x] 5.5 Confirm each hook exits non-zero on failure; verify by forcing one failure in each and observing the exit code

## 6. The machine

- [ ] 6.1 Provision the VPS with a container runtime, a firewall and the production age key in place; verify the firewall exposes only the intended ports and the key decrypts the production secrets file on the box
- [ ] 6.2 Add deployment configuration with separate staging and production destinations, each with its own database container and named volume; verify the two volumes are distinct and neither environment can reach the other's database
- [ ] 6.3 Add hard CPU, memory and log-size limits to the staging containers only; verify the limits are in effect under `docker stats` while an end-to-end run is in progress
- [ ] 6.4 Configure the proxy to route the production, staging and automation host names with certificates; verify all three resolve over TLS and that each reaches only its own environment
- [ ] 6.5 Implement the no-domain path using host names derived from the machine's IP through a wildcard DNS service rather than a bare IP; verify staging and production remain separately addressable over TLS with no domain registered
- [ ] 6.6 Add the staging reset routine with a guard refusing any target whose identity does not match staging; verify it destroys the staging volume and, when pointed at the production volume, refuses and performs no action

## 7. Pipeline

- [ ] 7.1 Add the reusable pull-request workflow running `ship/check` and then building and pushing one image tagged by commit SHA; verify a failing check produces no image
- [ ] 7.2 Add the reusable staging workflow: reset, migrate and seed at the commit production is running, deploy the change's image, migrate at the change's commit, run `ship/e2e`, then reset again; verify a change containing a migration executes that migration against the production schema
- [ ] 7.3 Add the reusable release workflow: promote the validated image without rebuilding, mark the release in error tracking, deploy, then run `ship/smoke`; verify the deployed image digest equals the digest validated on staging
- [ ] 7.4 Add the reusable rollback workflow returning production one step and refusing to step further; verify that a rollback whose target also fails smoke stops and reports instead of continuing, and that a rollback of a rollback is refused
- [ ] 7.5 Add workflow stubs delegating to this repository's reusable workflows at `@main`; verify each stub is under ten lines and that changing a workflow here alters the testbed's behaviour with no edit in the testbed
- [ ] 7.6 Verify the documented degradation for every hook by temporarily removing it one at a time and confirming the pipeline reduces capability as specified rather than failing (moved here from group 5: degradation is a property of the pipeline, so it cannot be checked before one exists)
- [ ] 7.7 Verify no floating tags exist anywhere in the pipeline by grepping the workflows for `latest`, `staging` and `prod` as image tags and finding none

## 8. Observability

- [ ] 8.1 Add an external uptime monitor checking `/health` on production; verify it reports a failure when the application is stopped, from outside the machine
- [ ] 8.2 Wire error tracking with the release tagged by commit SHA; verify a deliberately raised error appears attributed to the correct release
- [ ] 8.3 Enable spike protection and client-side sampling; verify a burst of identical errors does not consume the monthly quota
- [ ] 8.4 Add a single command answering "has production been healthy since the current release was deployed?" from liveness, new issues in the release, and the smoke result; verify it returns false while the failure switch is enabled and true otherwise

## 9. Validation (in the testbed)

- [ ] 9.1 Take a harmless change (edit one visible string) through the pipeline by hand from pull request to production; verify the page shows the new string and record the Actions minutes consumed
- [ ] 9.2 Have automation post a message into a thread and observe whether the agent responds; verify the outcome either way and record which fallback from `design.md` becomes necessary
- [ ] 9.3 Take a change enabling the failure switch through to production; verify smoke fails, production returns to the previous image, and the incident is reported rather than retried
- [ ] 9.4 Take a change enabling the irreversible migration through to production; verify rollback occurs exactly once, the rolled-back state also fails, and the pipeline escalates instead of stepping further back
- [ ] 9.5 After the trial changes, confirm the deployed commit equals the head of the main branch and the running image digest equals the digest validated on staging; verify both with one command each
- [ ] 9.6 Record the measured Actions minutes per run and propose concrete values for the wake-up and retry budgets left open in `design.md`
