## ADDED Requirements

### Requirement: The running artifact reports its own identity
The application SHALL report the commit it was built from, at its health endpoint, from a value supplied by the deploy tool rather than compiled in.

The pipeline has to be able to ask production what it is running, because the guard that production and the main branch agree is otherwise unenforceable. Every other source answers a different question: a deploy log and a workflow run record what was *intended*, and a rollback is precisely the case where intent and reality differ — which is the case the guard exists for.

Asking the machine over a shell connection would answer correctly and would require giving the guard the credentials that can deploy, in order to learn a fact the artifact knows about itself.

An application that does not report it SHALL cause the guard to refuse rather than pass. An absent identity is unknown, and unknown is not agreement.

#### Scenario: The guard asks what production is running
- **WHEN** the merge guards evaluate whether production and the main branch agree
- **THEN** the answer comes from production itself, so it reflects what is deployed rather than what was last deployed successfully

#### Scenario: A rollback has happened
- **WHEN** production has been rolled back to an earlier artifact
- **THEN** it reports that earlier commit, and the guard refuses the next merge until the rollback is resolved

#### Scenario: The application does not report an identity
- **WHEN** the health endpoint carries no commit
- **THEN** the guard refuses, because a missing answer is not a matching one
