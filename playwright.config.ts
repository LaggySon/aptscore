import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright is the only test tool. The webServer below starts the app in test mode
 * (APTSCORE_TEST_MODE=1) so API and UI tests run against deterministic fixture adapters.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Dedicated test-mode server on its own port (3100), isolated from any dev server on
  // 3000. Reuse is safe here because only test-mode servers ever run on 3100 — and it
  // avoids a second `next dev` spawning and silently jumping to 3101 when 3100 is busy.
  webServer: {
    command: 'next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { APTSCORE_TEST_MODE: '1' },
  },
});
