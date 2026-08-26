# Thread templates

What automation writes into the thread.

**These are records, not instructions.** They were designed as prompts that would
wake the agent; a measurement says they will not — an app-authored message is
ignored, even carrying a real mention, while the same mention from a person
answers at once.

But app messages **are** visible to the agent when a person does invoke it. So
everything here becomes the context someone arrives into, and the working shape
of this system is: automation records what happened, and a person's one-word
mention pulls the agent in with it all already there.

## The test for any template

> Would this be useful to a person opening the thread cold, with no memory of
> what led here?

If not, it will not be useful to the agent either — it arrives the same way.

That rules out two tempting styles. Do not write instructions ("interpret this
failure"): by the time anyone reads it, what needs doing may have changed. Do not
write bare status ("run 4821 failed"): the reader cannot act on an identifier.

Write what happened, what it followed, and what has already been tried.

## Never interpolate an external payload

A webhook's body may contain anything. Take named fields — a status, a timestamp,
a response code — and never paste a payload wholesale. Otherwise an outside
service can write into the context the agent reads.

## Where automation's wording actually lives

Not here. Everything automation writes into a thread lives in the scripts that
write it, under `.github/actions/*/`, one file per transition.

The requirement was that this wording be versioned alongside the playbooks
rather than buried in workflow definitions, and it is: each message sits in the
script for its own transition, next to the condition that decides to send it,
where the two cannot drift apart. Moving the text into files here would separate
a message from the rule that sends it and add a layer of indirection to read
through — the opposite of the intent.

What matters is the property, and it holds: **these messages are prompts, not
notifications.** The agent reads them as context when a person next brings it
in, so they are written for someone arriving cold, and no payload from an
external service is ever reproduced in them.
