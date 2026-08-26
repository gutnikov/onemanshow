import { defineConfig } from '@playwright/test';

// Fails loudly rather than defaulting: a suite that quietly targets localhost
// while it believes it is testing staging is worse than no suite.
const baseURL = process.env['SHIP_URL'];
if (baseURL === undefined || baseURL === '') {
  throw new Error('SHIP_URL is not set');
}

export default defineConfig({
  testDir: './e2e',
  reporter: process.env['CI'] === undefined ? 'list' : 'github',
  // Above the worst case of waiting out the sign-in throttle. The default 30s
  // was under it: three refusals cost about 31s, so a test that had to wait
  // died mid-wait and reported a timeout, which reads as a hung application
  // rather than as a throttle doing its job.
  timeout: 60_000,
  use: { baseURL, trace: 'retain-on-failure' },
});
