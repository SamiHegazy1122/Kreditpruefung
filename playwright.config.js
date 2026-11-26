import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'de-CH',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  /* Die Seite muss ueber HTTP ausgeliefert werden: unter file:// ist
     localStorage in Chromium nicht nutzbar und das Regelwerk waere nicht testbar. */
  webServer: {
    command: 'node tests/e2e/server.mjs',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore'
  }
});
