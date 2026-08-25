# Draft

Turn an idea into something that can be argued with. The output is an openspec
change and a draft pull request, and the reason for both is `03-grill.md`: you
cannot examine a sentence.

## Do this

1. **Create the branch and the draft pull request.** Name the branch after the
   ticket. The pull request stays draft until the change leaves `dev`.
2. **Create the openspec change** and write its proposal there.
3. **Commit the proposal as the first commit.** Grill then happens in a
   reviewable diff, and the person can see how the framing changed rather than
   reconstructing it from the conversation.
4. **Complete the change's planning artifacts** — the plan is what the person
   approves at the gate, and `dev` opens by working through the task list. A
   proposal alone leaves the next stage nothing to execute.

Size the artifacts to the change, and let each one's own instructions tell you
when it is not warranted. A change that moves one constant marks *no spec
delta* rather than writing one that restates an unchanged contract, and skips
the design document its instructions call conditional. Producing every artifact
at full length for a one-line change is not thoroughness — it buries the thing
the person has to read.

The change lives only on the branch. That matters at the other end: if the idea
is abandoned, closing the pull request removes it entirely — nothing to archive,
no litter in main.

## Sharpen with the person, not for them

Ask what the change is for and what happens if it is not done. Ask what is *not*
included. Ask how they will know it worked, in terms of what they will look at on
the stand — if that cannot be described, the change is not ready, and finding
out here costs a conversation instead of a slot.

Record their answers, not your paraphrase of them.

## Then grill

`draft` is outside exclusivity, so several changes may sit here. Do not treat a
crowded `draft` as pressure to move something along.

Continue into `playbooks/03-grill.md`. Leaving a proposal unexamined and asking
the person to approve it defeats the gate that follows.
