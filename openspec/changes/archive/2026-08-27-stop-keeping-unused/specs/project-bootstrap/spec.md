## Purpose

The existing check catches a credential that is declared and empty. Nothing
catches one that is present and unused, and that is the one nobody rotates.

## ADDED Requirements

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
