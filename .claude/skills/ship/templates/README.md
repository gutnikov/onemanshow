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
