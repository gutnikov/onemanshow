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
  use: { baseURL, trace: 'retain-on-failure' },
});
