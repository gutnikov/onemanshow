# The deliberately irreversible migration

Inert on purpose. Nothing here is applied: this directory is not the migrations
folder, so `ship/migrate` never reads it. It exists so that the rollback cascade
guard can be exercised on demand rather than discovered during a real incident.

## Why this shape

Rolling back is implemented as reverting code and redeploying the previous
image. A schema change is not undone by that. The interesting failure is
therefore not "the migration was bad" but the cascade it causes: the new schema
is live, the old image is redeployed, the old code queries a column that no
longer exists, verification fails on the rolled-back version too, and a system
that responds by stepping further back never terminates — because the problem is
in the database, not in the image.

## Activating it

This is a real change and travels the pipeline like any other. In one commit:

1. In `shared/schema.ts`, rename the `message` column to `body`.
2. Run `npm run db:generate -- --name rename_message_to_body`. Confirm the
   generated SQL drops or renames the column rather than adding a new one — a
   generated `ADD COLUMN` plus `DROP COLUMN` pair is what makes it destructive.
3. Update the three places that read the column: `db/seed.ts`, `api/routes.ts`,
   and the assertions in `e2e/skeleton.spec.ts`.

The change deploys cleanly, because the new code matches the new schema. The
cascade appears only when production is rolled back to the previous image.

## Reverting it requires a manual step

Reverting the commit restores the code but not the column, and the dropped
values are gone. Recovery is by hand:

1. `ALTER TABLE greeting RENAME COLUMN body TO message;` — restores the name.
2. Any rows written while `body` existed keep their values, but rows whose
   `message` was dropped before this point cannot be recovered from the schema.
   In production that means a restore from backup, which the reference
   application deliberately does not have.

This note is the artifact the grill checklist asks for when it asks whether a
change is revertable. The honest answer here is no, and that is the point.
