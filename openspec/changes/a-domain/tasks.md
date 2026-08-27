# Tasks

## 0. Outside the repository, and first

- [ ] 0.1 A domain registered, and two `A` records pointing at the machine — production and the stand. **Before** anything is deployed: Let's Encrypt validates over HTTP through the proxy, so a name that does not resolve yet means no certificate, which means the proxy's health check never passes and the deploy fails
- [ ] 0.2 Verify the records resolve from outside, and that the machine answers on the new name over plain HTTP before TLS is expected to work

## 1. One authority, and a check that reads it

- [ ] 1.1 Settle what is authoritative — `ship.yml` or the stubs — knowing that the registry host was settled the other way two changes ago, and that the pipeline reads stubs. Record the answer and why the two roles differ
- [ ] 1.2 The check fails on disagreement and names both values. **Verify by constructing the failure**: change one stub, watch it be reported, and confirm the message says which value is which
- [ ] 1.3 Verify it also fails when the stale name still resolves, because that is the case it exists for and the tempting shortcut is to test only against a name that is gone

## 2. The addresses themselves

- [ ] 2.1 Ten places change together: twice in `ship.yml` and eight times across seven stubs. Verify with the check from 1.2, not by reading the diff
- [ ] 2.2 The certificate is issued for the new names. Verify by asking the served certificate what it is for, not by observing that the page loads — the old certificate would serve the old name perfectly well
- [ ] 2.3 The uptime monitor watches the new address. The token this project holds could not change it, so either a better path is found or a person does it — and until then liveness is watching an address with no users, which the window check cannot notice
- [ ] 2.4 Verify the stand answers on its new name and its own certificate

## 3. What the change costs, exercised rather than assumed

- [ ] 3.1 Every session is invalidated by the host change. Verify the synthetic account signs in again on the release, which is the one session that matters, and that the seeded fixtures still pass on the stand
- [ ] 3.2 Decide and record whether the previous names stay configured. Keeping them is a fallback; keeping them is also how the next stale reference stays invisible

## 4. What this unblocks, and only after it has landed

- [ ] 4.1 This produces a deployable release. Once it has, take the rollback rehearsal that has been waiting: a real rollback on the new registry, with a genuine previous version to return to
- [ ] 4.2 And the bad-credential rehearsal, on its own release rather than this one — a red probe with two candidate causes teaches nothing
