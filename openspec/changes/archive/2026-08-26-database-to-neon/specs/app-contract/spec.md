## ADDED Requirements

### Requirement: Liveness and readiness are separate questions
The application SHALL answer two distinct questions at two endpoints, and the pipeline SHALL ask each of the right one.

**Liveness** is whether the process is serving. It SHALL NOT touch the database. It exists to answer when the machine does not, and a check that reaches into a dependency cannot distinguish "the process is gone" from "the dependency is slow".

**Readiness** is whether the application can serve requests, which includes its database and the agreement between schema and code. It SHALL be asked at deploy time and by verification, not continuously.

The distinction is not tidiness. A managed database that is allowed to sleep is woken by whatever polls it, so a readiness check on a short interval keeps it awake permanently — the cost of watching the database closely is that it can never rest. Splitting the questions lets the frequent check be cheap and the expensive check be occasional.

What is given up SHALL be stated wherever it might be assumed: between deployments, nothing continuously observes the database. A database failure with no traffic against it will show a green liveness check and no new errors, because there were no requests to fail. That is a deliberate trade for a product whose quiet hour proves nothing anyway, and not a property to rely on later without revisiting.

#### Scenario: The external monitor asks whether production is alive
- **WHEN** the liveness endpoint is polled on a short interval
- **THEN** it answers without opening a database connection, so a sleeping database stays asleep

#### Scenario: A deploy asks whether the new container can serve
- **WHEN** a release has deployed and is deciding whether the container is fit to receive traffic
- **THEN** readiness is asked explicitly, including whether the schema and the code agree

#### Scenario: The process is up and the database is gone
- **WHEN** the application is running and cannot reach its database
- **THEN** liveness reports the process is serving and readiness reports it is not, and the two disagreeing is the information — it is the "up but broken" state that a single check cannot describe

## MODIFIED Requirements

### Requirement: The running artifact reports its own identity
The application SHALL report the commit it was built from, at its **liveness** endpoint, from a value supplied by the deploy tool rather than compiled in.

On liveness rather than readiness, because every caller that asks what is running needs the answer while production is unhealthy — that is when a rollback is unresolved and when the question matters most — and because asking it must not wake a sleeping database.

The pipeline has to be able to ask production what it is running, because the guard that production and the main branch agree is otherwise unenforceable. Every other source answers a different question: a deploy log and a workflow run record what was *intended*, and a rollback is precisely the case where intent and reality differ.

Asking the machine over a shell connection would answer correctly and would require giving the guard the credentials that can deploy, in order to learn a fact the artifact knows about itself.

An application that does not report it SHALL cause the guard to refuse rather than pass. An absent identity is unknown, and unknown is not agreement.

#### Scenario: The guard asks what production is running
- **WHEN** the merge guards evaluate whether production and the main branch agree
- **THEN** the answer comes from production itself, so it reflects what is deployed rather than what was last deployed successfully

#### Scenario: A rollback has happened
- **WHEN** production has been rolled back to an earlier artifact
- **THEN** it reports that earlier commit, and the guard refuses the next merge until the rollback is resolved

#### Scenario: The application does not report an identity
- **WHEN** the liveness endpoint carries no commit
- **THEN** the guard refuses, because a missing answer is not a matching one

#### Scenario: Production is unhealthy and must still be identified
- **WHEN** production cannot serve requests but its process is running
- **THEN** it still reports which commit it is, because deciding what to do about a broken production starts with knowing what is deployed
