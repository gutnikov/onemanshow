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

#### Scenario: No domain is configured
- **WHEN** a project has no domain
- **THEN** its environments are reachable by names derived from the machine's address, and the pipeline runs

#### Scenario: No error tracking is configured
- **WHEN** a project has no error tracking
- **THEN** the observation window relies on what remains and states plainly that it is not checking for new errors

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
