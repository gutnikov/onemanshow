## Purpose

Defines which transitions run without a person, what automation must never do,
and how a person is brought in when the next move needs judgment — so that the
rules the design states are enforced by something other than the actor they
constrain.

## ADDED Requirements

### Requirement: Automation performs the transitions that need no judgment
Automation SHALL perform every transition the lifecycle does not reserve for a person: moving a change to `staging` when checks and the build pass, starting the staging validation, merging when the guards pass, releasing, opening the observation window, closing it, and closing a ticket as not planned when its pull request is closed unmerged.

It SHALL NOT perform the two transitions reserved for a person — deciding a change is worth doing, and approving it — nor declare a hotfix. Those are reserved because an argument that automation should make them is an argument for removing them.

#### Scenario: Checks pass on a change in dev
- **WHEN** `check` and the build are green on the change's commit
- **THEN** automation moves it to `staging` and starts the staging validation, without being asked

#### Scenario: A person's decision is required
- **WHEN** a change is sharpened and waiting at the first gate, or validated and waiting for approval
- **THEN** automation records the state and notifies, and does not move the change

### Requirement: Automation does not wake the agent
Automation SHALL NOT attempt to invoke the agent. Writing into the thread in the expectation that the assistant's own integration responds does not work: the integration distinguishes by authorship, and a mention authored by an application is not answered, whether it is sent by a webhook or with a bot token.

What automation SHALL do instead is **record the event in the thread and notify the person**. Messages authored by an application remain visible to the agent when it next reads the thread, so a single word from a person brings it in with the whole history as context. The thread is therefore the memory of the system, and its completeness is what makes the hand-off cheap.

#### Scenario: A staging run fails
- **WHEN** the staging validation goes red and interpreting it requires judgment
- **THEN** automation writes what failed and where into the thread and notifies the person, rather than invoking the agent and reporting success at having done so

#### Scenario: The person arrives
- **WHEN** a person replies in a thread that automation has been writing to
- **THEN** the agent reads the recorded events as context and continues from the state the tools report, without needing them repeated

### Requirement: Automation's messages are prompts and are versioned as such
Because everything automation writes is read by the agent as context, its wording SHALL be versioned alongside the playbooks rather than embedded in workflow definitions.

Automation SHALL NOT interpolate a payload from an external service into a message. Only named, whitelisted fields may be included. A monitor that can put arbitrary text into the thread can put instructions there.

#### Scenario: An external monitor reports an outage
- **WHEN** an inbound signal from an uptime monitor is recorded in the thread
- **THEN** only whitelisted fields — status, time, response code — appear, and no free text from the payload is reproduced

### Requirement: The reactive layer adds no hosted service
Automation SHALL be built from the facilities the code host already provides: event-triggered workflows, a scheduled workflow, and an inbound dispatch endpoint. It SHALL NOT require an additional always-on service.

The archived design named a workflow-automation tool for four events. Three of them — the window timer, the external liveness signal, and budget accounting — are a schedule and an inbound dispatch. The fourth, approving by emoji reaction, is the only one that genuinely needs it, and an approval typed as a word costs the person nothing.

#### Scenario: A project is set up with no extra service
- **WHEN** a project wires the reactive layer
- **THEN** every transition above works, and what is missing is the convenience of reacting with an emoji rather than typing a word

#### Scenario: The window elapses while nothing is listening
- **WHEN** the observation window's duration passes
- **THEN** a scheduled run notices from the derived state, rather than a process having had to stay alive to hold a timer
