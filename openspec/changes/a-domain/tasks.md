# Tasks

## 0. Before anything, undo the wrong advice

- [ ] 0.1 The monitor points back at the old name until the second change lands. **Not paused** — a paused monitor is not `active`, and the window check then reports the liveness declaration as stale and closes the window unhealthy. Verified today that the monitor is still `active` and merely failing, and that no unresolved uptime issue exists yet
- [ ] 0.2 If an unresolved uptime issue has appeared by then, resolve it before any release. The window check counts them over 24 hours and calls any non-zero unhealthy, so one left open closes the next window unhealthy for a reason that is already over

## 1. The proxy serves both names

- [x] 1.1 An optional alternate host, defaulting to nothing, so instances that need one name are unaffected. Kamal already comma-splits its proxy host, so this adds a variable and not a concept **Done**, as a comma in both destinations' configs rather than an input threaded through six workflows
- [x] 1.2 Settle 1 from the proposal: configuration or a one-off. The template is the product, so a mechanism used once and not shipped leaves the next project without the thing that made this safe **Decided: both.** The instance carries the literal names, because during a rename what the proxy serves and what the pipeline addresses are different facts rather than two copies of one — they are *meant* to differ until the flip. The template carries the same move as a documented example, so the next project finds the mechanism instead of inventing it
- [ ] 1.3 Verify the old names still answer. Adding a name looks additive; that is an assumption about someone else's routing table and this change rests on it

## 2. Certificates, asked rather than assumed

- [ ] 2.1 Ask the served certificate what it is for, on both new names. `openssl s_client -servername`, not a page that loads — the old certificate serves the old name perfectly and proves nothing about the new one
- [ ] 2.2 Ask the same of both old names afterwards, because the property this change exists to establish is that they still work
- [ ] 2.3 The stand's first handshake lands on its migration-safety smoke, which has no retry loop. Verify it passes on the first attempt, and if it does not, that is a defect in this change rather than a flake to re-run

## 3. The question this change makes matter

- [x] 3.1 Establish whether `kamal rollback` re-renders the container's environment or starts the container it finds. The rollback's own verification does not sign in, so it cannot see the difference — and after the second change a rollback would return production to a container built with the previous public URL, which the auth library refuses as a cross-origin request. Read the deploy tool's source; the repository's own records point both ways **Established by reading the deploy tool's source, and the answer is the safe one.** `rollback` invokes the same boot path as a deploy, and the container's environment comes from `role.env_args(host)` — rendered from the configuration the tool is running with, not preserved from the old container. So a rollback after the flip gives the old image the **current** public URL, and the origin the auth library checks matches. The concern was real and the answer removes it

## 4. What this unblocks, stated correctly

- [ ] 4.1 This produces a release, so take `registry-to-ghcr` 5.3 afterwards: a real rollback with a genuine previous version to return to. **One** waiting task, not eight — the earlier count was wrong, and the project's own accounting already said six of them wait on a release while two wait on the rollback succeeding
- [ ] 4.2 And drop `registry-to-ghcr` 0.2 from anything that waits on this. It is a deadline on a leaked credential — a week from 2026-08-26 — and hanging it on our delivery is how a rotation slips
