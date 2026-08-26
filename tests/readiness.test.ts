import { describe, expect, it } from 'vitest';
import { readinessFrom } from '../api/readiness';

describe('readinessFrom', () => {
  it('is ready when the schema and the code agree', () => {
    expect(readinessFrom(2, 2)).toEqual({ ready: true });
  });

  it('is not ready when the schema is behind the code', () => {
    expect(readinessFrom(1, 2)).toEqual({ ready: false, reason: 'migrations-behind' });
  });

  // The post-rollback state. Reported ready before this test existed, which kept
  // liveness green while the application served errors.
  it('is not ready when the schema is ahead of the code', () => {
    expect(readinessFrom(2, 1)).toEqual({ ready: false, reason: 'schema-ahead' });
  });

  it('is ready on a project with no migrations at all', () => {
    expect(readinessFrom(0, 0)).toEqual({ ready: true });
  });
});

describe('a database that has never been migrated', () => {
  it('is behind, not unreachable', () => {
    // The distinction is the remedy: one says run the migrations, the other
    // says look at the network. A probe against a fresh database reported
    // unreachable and meant nothing of the kind.
    expect(readinessFrom(0, 2)).toEqual({ ready: false, reason: 'migrations-behind' });
  });
});
