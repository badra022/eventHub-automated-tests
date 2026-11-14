import { defineConfig, devices } from '@playwright/test';
import type { AppEnvironment } from './config/env';
import dotenv from 'dotenv';

dotenv.config();

/** Worker accounts always come from the encrypted pool in test-data/users.json: registered accounts can never be deleted. */
export type TestOptions = {
  appEnv: AppEnvironment;
};

const appEnv = (process.env.APP_ENV ?? 'prod') as AppEnvironment;

const API_SPECS = /[\\/]api[\\/].*\.spec\.ts$/;
const UI_SPECS = /[\\/]ui[\\/].*\.spec\.ts$/;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<TestOptions>({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  globalSetup: './global-setup',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: [['list'], ['junit', { outputFile: 'test-results/results.xml' }], ['html', { open: 'never' }]],
  // Known product defects are tagged @excluded (with an exclusionReason annotation); RUN_EXCLUDED=true runs them too
  grepInvert: process.env.RUN_EXCLUDED === 'true' ? undefined : /@excluded/,
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 },
  },
  use: {
    appEnv,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-first-failure',
  },

  projects: [
    {
      name: 'api',
      testMatch: API_SPECS,
    },
    {
      name: 'chromium',
      testMatch: UI_SPECS,
      use: { ...devices['Desktop Chrome'] },
    },
    // S41: the cross-browser projects run the journeys tagged @cross-browser (S01, S16, S21); visual baselines are
    // kept for desktop Chromium only, the other projects still run every functional assertion
    {
      name: 'firefox',
      testMatch: UI_SPECS,
      grep: /@cross-browser/,
      ignoreSnapshots: true,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: UI_SPECS,
      grep: /@cross-browser/,
      ignoreSnapshots: true,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: UI_SPECS,
      grep: /@cross-browser/,
      ignoreSnapshots: true,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
