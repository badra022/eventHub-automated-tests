import { test as base } from '@playwright/test';
import { getEnvConfig, type EnvConfig } from '../config/env';
import type { TestOptions } from '../playwright.config';

type BaseWorkerFixtures = {
  envConfig: EnvConfig;
};

/**
 * Root of every fixture file: the worker-scoped options (`appEnv`, `accountSource`) and the resolved environment config.
 * Worker scope lets the auth fixtures log in once per worker.
 */
export const test = base.extend<{}, TestOptions & BaseWorkerFixtures>({
  appEnv: ['prod', { option: true, scope: 'worker' }],
  accountSource: ['pool', { option: true, scope: 'worker' }],

  envConfig: [
    async ({ appEnv }, use) => {
      await use(getEnvConfig(appEnv));
    },
    { scope: 'worker' },
  ],

  baseURL: async ({ envConfig }, use) => {
    await use(envConfig.APP_BASE_URL);
  },
});
