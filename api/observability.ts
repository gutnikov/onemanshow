import * as Sentry from '@sentry/node';
import { flag } from '@shared/env';

/**
 * The release is the commit, taken from the version the deploy tool already
 * puts in the container's environment. That is what makes the observation
 * window's question answerable: "are there new issues in this release?" - which
 * stays meaningful at the traffic volume an indie product actually has, where
 * error *rates* are noise and a quiet window may just mean nobody visited.
 */
function release(): string | undefined {
  const version = process.env['KAMAL_VERSION'];
  if (version === undefined) return undefined;
  return version.replace(/-(production|staging)$/, '');
}

/** Absent DSN is a legal state: the role simply is not configured yet. */
export function startObservability(): void {
  const dsn = process.env['SENTRY_DSN'];
  if (dsn === undefined || dsn === '') {
    console.log('observability: no SENTRY_DSN, error reporting is off');
    return;
  }
  Sentry.init({
    dsn,
    release: release(),
    environment: process.env['KAMAL_DESTINATION'] ?? 'production',
    // A crash loop can exhaust a free monthly quota in minutes and leave us
    // blind exactly when we need seeing, so sampling is on by default.
    tracesSampleRate: 0,
    sampleRate: Number(process.env['SENTRY_SAMPLE_RATE'] ?? '1.0'),
  });
  console.log(`observability: reporting release ${release() ?? 'unknown'}`);
}

export function reportError(error: unknown): void {
  Sentry.captureException(error);
}

export const observabilityEnabled = (): boolean => flag('SENTRY_DSN') || process.env['SENTRY_DSN'] !== undefined;
