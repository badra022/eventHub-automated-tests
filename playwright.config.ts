import { defineConfig, devices } from '@playwright/test';
import type { AppEnvironment } from './config/env';
import dotenv from 'dotenv';

dotenv.config();

/** Where each worker's account comes from: the encrypted pool in test-data/users.json, or a fresh registration */
export type AccountSource = 'pool' | 'register';

export type TestOptions = {
  appEnv: AppEnvironment;
  accountSource: AccountSource;
};

const appEnv = (process.env.APP_ENV ?? 'prod') as AppEnvironment;
const accountSource = (process.env.ACCOUNT_SOURCE ?? 'pool') as AccountSource;

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
  use: {
    appEnv,
    accountSource,
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
    {
      name: 'firefox',
      testMatch: UI_SPECS,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: UI_SPECS,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: UI_SPECS,
      grep: /@smoke/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
