## MODIFIED Requirements

### Requirement: Staging baseline is derived from production's commit
Before validating a change, the pipeline SHALL rebuild the staging data plane from scratch: destroy the staging data plane, start an empty database, then run `ship/migrate` and `ship/seed` at the commit production is currently running. It SHALL NOT restore a stored dump, and SHALL NOT seed directly at the commit under review.

The change's own migration SHALL then be applied **before** the image that requires it is deployed. Deploying first leaves a window in which the schema is behind the code, which readiness correctly refuses to call healthy — so the deploy fails its health check and the ordering, not the change, is at fault.

#### Scenario: Staging is prepared
- **WHEN** staging preparation completes
- **THEN** staging holds synthetic data on the schema production is running, with no residue from any previous change

#### Scenario: The migration under review is exercised
- **WHEN** the change under review contains a schema migration
- **THEN** `ship/migrate` at the change's commit runs against the production schema, so the migration path itself is executed before it can reach production

#### Scenario: A migration the previous code cannot work against
- **WHEN** a change's migration is not backward compatible with the running image
- **THEN** the migration is applied before the new image is deployed, so no deploy is attempted against a schema that is behind it

#### Scenario: The order is the same in both environments
- **WHEN** a change is released to production
- **THEN** the migration precedes the deploy there too, because two stages of one pipeline disagreeing about the order is a defect only a non-backward-compatible migration would reveal
