# Approve

A person is being asked one question: **does this do what it was supposed to?**

Not whether the tests pass — the pipeline settled that. Whether the thing they
asked for is the thing that is there.

## Hand over the address

The stand's address is the whole artifact of this handover. Without it there is
nothing to approve, and asking someone to find it themselves is asking them to
do your job.

The address is stable for the life of the change, so it can be returned to
tomorrow.

## Hand over the question too

Go back to what the proposal said about how we would know it worked, and ask
*that*. "Open the stand and look at the pricing page — the annual toggle should
show the discounted figure." Not "please review".

The person has not been holding this change in their head. Say what changed, in
one or two sentences, and what to look at.

## Say what was already checked

So they do not repeat it: which runs passed, and — plainly — anything that was
not checked. If a source was unavailable, say so. A person assuming something was
verified because you did not mention it is a worse outcome than them checking it
twice.

## Then wait

Approval is theirs. So is rejection.

**Approved** → `ready-to-release`, then `playbooks/08-deploy.md`.

**Rejected** → back to `dev` with their comments recorded as they wrote them. Do
not translate their objection into what you think they meant; you will be wrong
in the direction of what you already built.

This change is holding the segment while it waits. That is expected and not a
reason to hurry them — but if other changes are queued, it is worth mentioning
once.
