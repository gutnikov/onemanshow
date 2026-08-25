import { describe, expect, it } from 'vitest';
import { parseDsn, releaseFromVersion } from '../api/observability';

describe('parseDsn', () => {
  it('splits a real dsn into its parts', () => {
    expect(parseDsn('https://abc123@o1.ingest.de.sentry.io/456')).toEqual({
      key: 'abc123',
      host: 'o1.ingest.de.sentry.io',
      projectId: '456',
    });
  });

  it.each(['', 'not-a-dsn', 'http://abc@host/1', 'https://abc@host', 'https://@host/1'])(
    'rejects %o rather than half-working',
    (bad) => {
      expect(parseDsn(bad)).toBeUndefined();
    },
  );
});

describe('releaseFromVersion', () => {
  it.each([
    ['abc123-production', 'abc123'],
    ['abc123-staging', 'abc123'],
    ['abc123', 'abc123'],
  ])('reads %o as %o', (version, expected) => {
    expect(releaseFromVersion(version)).toBe(expected);
  });

  it('is undefined when the deploy tool set nothing', () => {
    expect(releaseFromVersion(undefined)).toBeUndefined();
  });
});
