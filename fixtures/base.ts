import { test as base } from '@playwright/test';
import { getEnvConfig, type EnvConfig } from '../config/env';
import type { TestOptions } from '../playwright.config';
import { Logger } from '../utils/logger';

const logger = new Logger('Run');

type BaseWorkerFixtures = {
  envConfig: EnvConfig;
};

type BaseTestFixtures = {
  /** Auto fixture: logs every test's start and outcome so the run log reads as evidence on its own. */
  testLifecycleLog: void;
};

/**
 * Root of every fixture file: the worker-scoped `appEnv` option and the resolved environment config.
 * Worker scope lets the auth fixtures log in once per worker.
 */
export const test = base.extend<BaseTestFixtures, TestOptions & BaseWorkerFixtures>({
  appEnv: ['prod', { option: true, scope: 'worker' }],

  envConfig: [
    async ({ appEnv }, use, workerInfo) => {
      const config = getEnvConfig(appEnv);
      logger.info('Worker started', {
        project: workerInfo.project.name,
        appEnv,
        appBaseUrl: config.APP_BASE_URL,
        apiBaseUrl: config.API_BASE_URL,
        logLevel: process.env.LOG_LEVEL ?? 'info',
      });
      if (!config.TEST_DATA_KEY) {
        logger.warn('TEST_DATA_KEY is not set: pool accounts cannot be decrypted and sensitive log values are masked');
      }
      await use(config);
    },
    { scope: 'worker' },
  ],

  baseURL: async ({ envConfig }, use) => {
    await use(envConfig.APP_BASE_URL);
  },

  testLifecycleLog: [
    async ({}, use, testInfo) => {
      const context = {
        test: testInfo.titlePath.slice(1).join(' > '),
        project: testInfo.project.name,
        location: `${testInfo.file.replace(/\\/g, '/').split('/tests/').pop()}:${testInfo.line}`,
        retry: testInfo.retry,
        tags: testInfo.tags,
        annotations: Object.fromEntries(testInfo.annotations.map((a) => [a.type, a.description])),
      };
      logger.info('Test started', context);
      if (testInfo.retry > 0) {
        logger.warn('Retrying the test: the previous attempt failed (possible flakiness)', { retry: testInfo.retry });
      }

      await use();

      const outcome = { test: context.test, status: testInfo.status, durationMs: testInfo.duration, retry: testInfo.retry };
      if (testInfo.status === testInfo.expectedStatus) {
        logger.info(`Test ${testInfo.status}`, outcome);
      } else {
        logger.error(`Test ${testInfo.status}`, {
          ...outcome,
          expectedStatus: testInfo.expectedStatus,
          errors: testInfo.errors.map((error) => error.message ?? error.value),
        });
      }
    },
    { auto: true },
  ],
});
