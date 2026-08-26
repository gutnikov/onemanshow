## MODIFIED Requirements

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
