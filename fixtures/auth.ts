import path from 'node:path';
import { test as base } from './base';
import { testDataRegistry } from './data';
import { AuthService } from '../services/auth.service';
import type { UserCredentials } from '../api/types';
import { LoginPage } from '../pages/login.page';
import { decryptRecord } from '../utils/crypto';
import { generateRandomText, uniqueSuffix } from '../utils/common';
import { Logger } from '../utils/logger';
import { Navigation } from '../utils/navigation';

const logger = new Logger('Auth fixture');

const AUTH_STATE_DIR = path.resolve(process.cwd(), '.auth');

export type AuthenticatedUser = UserCredentials & {
  id: number;
  /** JWT used by the API services */
  token: string;
};

type AuthWorkerFixtures = {
  /** This worker's account. One account per worker keeps each 9-booking sandbox private to one worker (risk T2). */
  account: UserCredentials;
  /** `account` logged in through the API. */
  authUser: AuthenticatedUser;
  /** Storage state file of `account` logged in through the UI, reused by every page of the worker. */
  authStorageStatePath: string;
};

function toCredentials(record: Record<string, unknown>, key: string): UserCredentials {
  const { email, password } = record;
  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    throw new Error(`Account "${key}" in test-data/users.json must contain non-empty email and password values.`);
  }
  return { email, password };
}

export const test = base.extend<{}, AuthWorkerFixtures>({
  account: [
    async ({ appEnv, accountSource, envConfig, playwright }, use, workerInfo) => {
      if (accountSource === 'register') {
        const credentials = {
          email: `eventhub.qa.${uniqueSuffix()}@example.com`,
          password: generateRandomText(16),
        };
        const context = await playwright.request.newContext();
        await new AuthService(context, { baseUrl: envConfig.API_BASE_URL }).register(credentials);
        await context.dispose();
        logger.info('Registered a new account for this worker', { worker: workerInfo.parallelIndex });
        await use(credentials);
        return;
      }

      const keys = testDataRegistry.keys('users', appEnv);
      if (keys.length === 0) {
        throw new Error(`No accounts for "${appEnv}" in test-data/users.json. Run "npm run users:provision".`);
      }
      if (workerInfo.parallelIndex >= keys.length) {
        logger.warn('More workers than pool accounts: accounts are shared and bookings may be evicted', {
          workers: workerInfo.config.workers,
          accounts: keys.length,
        });
      }

      const key = keys[workerInfo.parallelIndex % keys.length];
      const record = decryptRecord(testDataRegistry.resolve('users', key, appEnv), envConfig.TEST_DATA_KEY);
      logger.info('Using pool account', { account: key, worker: workerInfo.parallelIndex });
      await use(toCredentials(record, key));
    },
    { scope: 'worker' },
  ],

  authUser: [
    async ({ account, envConfig, playwright }, use) => {
      const context = await playwright.request.newContext();
      const { token, user } = await new AuthService(context, { baseUrl: envConfig.API_BASE_URL }).login(account);
      await context.dispose();
      await use({ ...account, id: user.id, token });
    },
    { scope: 'worker' },
  ],

  authStorageStatePath: [
    async ({ account, envConfig, browser }, use, workerInfo) => {
      const filePath = path.join(AUTH_STATE_DIR, `${workerInfo.project.name}-worker-${workerInfo.parallelIndex}.json`);
      const done = logger.timed('Logged in through the UI');

      const page = await browser.newPage();
      const loginPage = new LoginPage(page);
      await new Navigation(page, { appBaseUrl: envConfig.APP_BASE_URL }).toLoginPage();
      await loginPage.login(account.email, account.password);
      await loginPage.waitForLoggedIn();
      await page.context().storageState({ path: filePath });
      await page.close();

      done();
      await use(filePath);
    },
    { scope: 'worker' },
  ],

  // Every page starts logged in; guest tests opt out with test.use({ storageState: { cookies: [], origins: [] } })
  storageState: async ({ authStorageStatePath }, use) => {
    await use(authStorageStatePath);
  },
});
