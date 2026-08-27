# project-bootstrap Specification

## Purpose
What happens the first time the skill runs in a project created from the template: establishing what is not yet configured, and turning that into work a person can pick up.

## Requirements

### Requirement: Bootstrap is a function of the current state
Bootstrapping SHALL compare the roles a project needs against those its configuration declares, and create work only for the difference. It SHALL be safe to run repeatedly, and SHALL NOT record that it has run.

#### Scenario: Run again a month later
- **WHEN** bootstrapping runs on a project that is already partly configured
- **THEN** it creates work only for what is still missing

#### Scenario: A role is claimed but not usable
- **WHEN** a configuration names a role whose credentials are absent or empty
- **THEN** the role counts as unconfigured, because a declared-but-empty secret is how a role appears to work while doing nothing

### Requirement: The work is ordered and its dependencies are legible
Created tickets SHALL be ordered so that taking them from the top works, and any that depends on another SHALL say so with a reference the tools can follow rather than in prose alone.

#### Scenario: A ticket is taken out of order
- **WHEN** a person moves a ticket whose prerequisite is still open into the development queue
- **THEN** they are told which prerequisite is outstanding, and the choice remains theirs

### Requirement: Reaching production comes before making it correct
The work SHALL be divided so that an early group is sufficient to deploy to production at all, and the rest improves it. Each absent role SHALL degrade the stage that depends on it rather than blocking the pipeline.

The database is the exception and SHALL be named as one. There is no degraded mode for an absent database: the application cannot start, readiness cannot pass, and no stage runs. It therefore belongs in the group that reaches production, and bootstrap SHALL NOT present it as something that can be deferred like a domain or error tracking.

Provisioning the machine SHALL NOT include provisioning a database. The machine runs the application; the database is a role configured with a provider, and treating it as part of the host is what put both environments on one instance divided only by a password.

#### Scenario: No domain is configured
- **WHEN** a project has no domain
- **THEN** its environments are reachable by names derived from the machine's address, and the pipeline runs

#### Scenario: No error tracking is configured
- **WHEN** a project has no error tracking
- **THEN** the observation window relies on what remains and states plainly that it is not checking for new errors

#### Scenario: No database is configured
- **WHEN** a project has no database
- **THEN** bootstrap says that nothing runs until one exists, rather than offering a degraded stage — because there is no version of this application that serves a page without one

### Requirement: A configured role leaves evidence in the repository
Configuring a role SHALL leave something committed — a configuration section, infrastructure description, or an encrypted credential — so that bootstrapping can tell a configured role from an unconfigured one by reading the repository.

#### Scenario: Something was set up by hand
- **WHEN** a person configures a service outside the repository and commits nothing
- **THEN** the role still counts as unconfigured, because a project whose state exists only in somebody's memory cannot be rebuilt

### Requirement: The template's own history does not travel
A project created from the template SHALL NOT retain the template's planning artifacts. Bootstrapping SHALL remove them on its first run.

#### Scenario: A fresh project is bootstrapped
- **WHEN** bootstrapping runs for the first time in a created project
- **THEN** the template's own change history is gone and the project's planning directory is empty and ready

### Requirement: A credential outlives its reason and SHALL be removed with it
When a role's provider changes, the credentials the previous provider needed SHALL be removed from the secret store in the same change, or the change SHALL state which are being kept and why.

An unused credential is not inert. It still decrypts on every runner that reads its file, it still appears in the set a person believes is current, and it is the one nobody thinks to rotate — because rotating it protects nothing anybody can name. The credential that leaked into a log in this project was of exactly that kind by the time anyone noticed.

Removal SHALL distinguish a credential from a string that resembles one. A password belonging to a throwaway container in a test, a value used only by local development, and a mention in a comment recording why a check exists are not credentials of the system and SHALL NOT be removed by a search for the name.

#### Scenario: A role changes provider
- **WHEN** a change moves a role from one provider to another
- **THEN** the previous provider's credentials leave the secret store in that change, or the change names each one it keeps and the reason

#### Scenario: A name that resembles a credential
- **WHEN** the same name appears in a test fixture, in local development configuration, or in a comment explaining a past failure
- **THEN** those occurrences are left alone, and the distinction is stated where somebody searching the name will meet it

#### Scenario: A credential kept deliberately
- **WHEN** a credential must survive its provider's retirement — because a path that still exists needs it
- **THEN** the reason is recorded next to it, so the next reader does not have to decide again whether it is dead

### Requirement: An environment is renamed in two steps, serving both names in between
Changing the address an environment answers on SHALL be done in two changes: first the proxy learns the new name **while keeping the old one**, then the references the pipeline uses are moved.

One step does not work, and the reason is not caution. The proxy routes by host header and refuses a name it was not told about, and its configured host is a single value — so the deploy that introduces the new name is the same deploy that stops answering for the old one. Every health URL, guard and probe in the pipeline is still asking for the old name at that moment, and they fail together, including the guard that refuses a merge when production cannot say what it runs.

Between the two changes both names SHALL answer, and that SHALL be verified by asking each name **which certificate it is served** rather than whether a page loads. A page that loads proves the old certificate still works, which was never in question.

The second change SHALL move the external monitor last, because it lives outside the repository and cannot change in the same commit. Pausing it instead SHALL NOT be used as a holding action: a paused monitor is not an active one, and a liveness declaration with no active monitor is reported as stale, which closes the next observation window unhealthy.

#### Scenario: The proxy learns the new name
- **WHEN** the first change deploys
- **THEN** both names answer, each with a certificate naming itself, and nothing in the pipeline has been asked to use the new one yet

#### Scenario: A rename attempted in one step
- **WHEN** the address is swapped in a single change
- **THEN** the old name stops being served at the deploy, and the guards and checks that still reference it fail together

#### Scenario: The monitor during the move
- **WHEN** the external monitor is repointed before the new name is served
- **THEN** it reports the environment down, and the holding action is to point it back rather than to pause it
