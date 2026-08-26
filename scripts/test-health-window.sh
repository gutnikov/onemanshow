#!/bin/sh
# Every way the window evaluation must report unhealthy.
#
# Kept as a test rather than as a memory of one manual run. Each of these was
# checked by hand once, and one of them - an unreported smoke result - had been
# silently reported as healthy until that run: the file's own first paragraph
# says a source degrading to "fine" is worse than no check, and it did exactly
# that in the source that most directly proves a deploy worked.
#
# Needs no network: every case here fails before any request, or fails because
# the request cannot be made. The cases that require a live project - real
# downtime, a real new issue - cannot be forced from a test and are named at the
# bottom rather than pretended.
set -eu

WINDOW="$(dirname "$0")/../.github/actions/health-window/health-window"
SHA=0000000000000000000000000000000000000000
failures=0

expect() {
  want="$1"; name="$2"; shift 2
  if out="$(env "$@" sh "$WINDOW" "$SHA" 2>&1)"; then got=healthy; else got=unhealthy; fi
  if [ "$got" = "$want" ]; then
    printf '  ok    %-44s %s\n' "$name" "$got"
  else
    printf '  FAIL  %-44s wanted %s, got %s\n' "$name" "$want" "$got"
    printf '%s\n' "$out" | sed 's/^/          /'
    failures=$((failures+1))
  fi
}

# No token and no org: every remote source is unreachable, so the verdict rests
# on the smoke result alone - and an absent one must not read as healthy.
base="SENTRY_ORG= SENTRY_PROJECT= SENTRY_READ_TOKEN= LIVENESS_SOURCE="

# shellcheck disable=SC2086
expect healthy   "smoke passed, nothing else configured"  $base SMOKE_RESULT=success
# shellcheck disable=SC2086
expect unhealthy "smoke failed"                           $base SMOKE_RESULT=failure
# shellcheck disable=SC2086
expect unhealthy "smoke not reported"                     $base SMOKE_RESULT=
# shellcheck disable=SC2086
expect unhealthy "smoke result unrecognised"              $base SMOKE_RESULT=probably
# shellcheck disable=SC2086
expect unhealthy "liveness declared, cannot be queried"   $base SMOKE_RESULT=success LIVENESS_SOURCE=sentry-uptime
# shellcheck disable=SC2086
expect unhealthy "liveness source not recognised"         $base SMOKE_RESULT=success LIVENESS_SOURCE=pingdom
# shellcheck disable=SC2086
expect unhealthy "error tracking configured, unreachable" SENTRY_ORG=x SENTRY_PROJECT=y SENTRY_READ_TOKEN=invalid LIVENESS_SOURCE= SMOKE_RESULT=success

echo
echo "  not covered here, and not pretended:"
echo "    - real downtime reported by the monitor"
echo "    - a new issue attributed to the release"
echo "    - a monitor that exists while the configuration declares none"
echo "  all three need a live project, and the last was verified by hand on 2026-08-25."
echo
if [ "$failures" -gt 0 ]; then
  echo "::error::${failures} case(s) did not behave as required"
  exit 1
fi
echo "7 cases, all as required"
