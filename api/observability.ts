import { randomUUID } from 'node:crypto';

/**
 * Errors are posted to Sentry's envelope endpoint directly rather than through
 * the SDK.
 *
 * The SDK pulls in OpenTelemetry, whose CommonJS/ESM interop does not survive
 * being bundled by esbuild - the container crashed at startup on exactly that.
 * The alternatives were shipping node_modules into the runtime image, which the
 * registry budget argues against, or asking for the one capability we actually
 * need. We do not use tracing, metrics or profiling; we need "report this
 * exception, attributed to this release". That is one HTTP request.
 */

type Dsn = { host: string; projectId: string; key: string };

/** Exported for its own sake: parsing is the part that can be wrong quietly. */
export function parseDsn(dsn: string): Dsn | undefined {
  const match = /^https:\/\/([0-9a-f]+)@([^/]+)\/(\d+)$/.exec(dsn.trim());
  if (match === null) return undefined;
  const [, key, host, projectId] = match;
  if (key === undefined || host === undefined || projectId === undefined) return undefined;
  return { key, host, projectId };
}

/** The commit, taken from the version the deploy tool puts in the container. */
export function releaseFromVersion(version: string | undefined): string | undefined {
  if (version === undefined || version === '') return undefined;
  return version.replace(/-(production|staging)$/, '');
}

let target: Dsn | undefined;
let release: string | undefined;
let environment = 'production';
let sampleRate = 1;

export function startObservability(): void {
  const dsn = process.env['SENTRY_DSN'];
  if (dsn === undefined || dsn === '') {
    console.log('observability: no SENTRY_DSN, error reporting is off');
    return;
  }
  target = parseDsn(dsn);
  if (target === undefined) {
    console.log('observability: SENTRY_DSN is malformed, error reporting is off');
    return;
  }
  release = releaseFromVersion(process.env['KAMAL_VERSION']);
  environment = process.env['KAMAL_DESTINATION'] ?? 'production';
  // A crash loop can exhaust a free monthly quota in minutes and leave us blind
  // exactly when seeing matters, so sampling is available without a redeploy.
  sampleRate = Number(process.env['SENTRY_SAMPLE_RATE'] ?? '1');
  console.log(`observability: reporting release ${release ?? 'unknown'} (${environment})`);
}

export function reportError(error: unknown): void {
  if (target === undefined) return;
  if (Math.random() > sampleRate) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = randomUUID().replace(/-/g, '');
  const header = JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() });
  const item = JSON.stringify({ type: 'event' });
  const payload = JSON.stringify({
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    release,
    environment,
    exception: {
      values: [{ type: err.name, value: err.message, stacktrace: { frames: [] } }],
    },
  });

  // Deliberately not awaited: reporting must never delay or fail a response.
  void fetch(`https://${target.host}/api/${target.projectId}/envelope/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${target.key}`,
    },
    body: `${header}\n${item}\n${payload}\n`,
  }).catch((sendFailure: unknown) => {
    console.error('observability: could not report error', sendFailure);
  });
}
