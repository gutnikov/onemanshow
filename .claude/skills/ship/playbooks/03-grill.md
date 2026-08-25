# Grill

The examination a proposal passes before it may occupy the development slot —
the most expensive resource here, since only one change holds it at a time.

Killing a bad idea now costs a conversation. Discovering it in `staging` costs
the slot, the pipeline runs, and someone's attention.

## Conduct it with a subagent

Launch a subagent that sees **only the proposal**, with no knowledge of how it
was written, and instruct it to attack. You wrote the proposal; you are a poor
critic of it, and you will accept your own reasoning because you recognise it.

Its job is to **challenge cheap answers**, not collect them.

## The items

Every one gets an answer. "Not applicable" is legal and sufficient for all but
the last — so a change that corrects a word clears the whole examination in two
lines, while nothing gets skipped because it is late.

1. **What is this for, and what happens if we skip it?** The cheapest way not to
   do work.
2. **What is out of scope?** Explicitly. Scope creep inside `dev` is expensive
   when the slot is exclusive.
3. **How will we know it worked?** In terms of what a person will look at on the
   stand. This becomes the approval question later.
4. **Is there a cheaper way?**
5. **Can this be undone by reverting it?**

## The last item never scales down

Size does not predict reversibility. A one-line change that drops a column,
transforms data irreversibly, or calls an external service with a lasting effect
is catastrophically unrevertable; a two-thousand-line refactor reverts perfectly.

"Not applicable" is **not accepted** here. If the answer is no, the proposal
carries the manual steps recovery would need — written down now, while it is a
design question, rather than at three in the morning when it is an incident.

Remember what a revert does and does not restore: the code, yes; configuration
and schema, no. A change that looks revertable because its code is small may not
be.

## Where the answers go

Into the proposal itself, not a separate document. The person deciding whether to
develop it reads the examination as part of reading the change.

Then stop. `draft → ready-for-dev` is theirs.
