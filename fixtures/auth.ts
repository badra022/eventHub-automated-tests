import path from 'node:path';
import type { Browser, PlaywrightWorkerArgs } from '@playwright/test';
import { test as base } from './base';
import { testDataRegistry } from './data';
import { AuthService } from '../services/auth.service';
import type { UserCredentials } from '../api/types';
import type { AppEnvironment, EnvConfig } from '../config/env';
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
  /**
   * "User B" for isolation and authorisation tests (test-data/otherUsers.json). Shared by all workers, so tests
   * only read with it or attempt forbidden actions; they never create data in its sandbox.
   */
  otherUser: AuthenticatedUser;
  /** Storage state file of `otherUser` logged in through the UI. */
  otherUserStorageStatePath: string;
};

function toCredentials(record: Record<string, unknown>, key: string): UserCredentials {
  const { email, password } = record;
  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    throw new Error(`Account "${key}" in test-data must contain non-empty email and password values.`);
  }
  return { email, password };
}

function readAccount(source: string, key: string, envConfig: EnvConfig, appEnv: AppEnvironment): UserCredentials {
  try {
    return toCredentials(decryptRecord(testDataRegistry.resolve(source, key, appEnv), envConfig.TEST_DATA_KEY), key);
  } catch (error) {
    logger.error('Could not read the account from test data', { source, account: key, error });
    throw error;
  }
}

async function loginThroughApi(
  playwright: PlaywrightWorkerArgs['playwright'],
  envConfig: EnvConfig,
  credentials: UserCredentials,
): Promise<AuthenticatedUser> {
  const context = await playwright.request.newContext();
  try {
    const { token, user } = await new AuthService(context, { baseUrl: envConfig.API_BASE_URL }).login(credentials);
    return { ...credentials, id: user.id, token };
  } finally {
    await context.dispose();
  }
}

async function loginThroughUi(browser: Browser, envConfig: EnvConfig, credentials: UserCredentials, filePath: string): Promise<void> {
  const done = logger.timed('Logged in through the UI');
  const page = await browser.newPage();
  try {
    const loginPage = new LoginPage(page);
    await new Navigation(page, { appBaseUrl: envConfig.APP_BASE_URL }).toLoginPage();
    await loginPage.login(credentials.email, credentials.password);
    await loginPage.waitForLoggedIn();
    await page.context().storageState({ path: filePath });
  } catch (error) {
    logger.error('UI login failed', { url: page.url(), email: credentials.email, error });
    throw error;
  } finally {
    await page.close();
  }
  done();
  logger.debug('Saved UI session', { filePath });
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
        logger.debug('Worker account', { email: credentials.email, password: credentials.password });
        await use(credentials);
        return;
      }

      const keys = testDataRegistry.keys('users', appEnv);
      if (keys.length === 0) {
        logger.error('No pool accounts for this environment in test-data/users.json', { appEnv });
        throw new Error(`No accounts for "${appEnv}" in test-data/users.json. Run "npm run users:provision".`);
      }
      // CI shards run on separate machines with the same worker indexes, so each shard gets its own block of accounts
      const shardIndex = Number(process.env.SHARD_INDEX ?? 1);
      const slot = (shardIndex - 1) * workerInfo.config.workers + workerInfo.parallelIndex;
      if (slot >= keys.length) {
        logger.warn('More concurrent workers than pool accounts: accounts are shared and bookings may be evicted', {
          shardIndex,
          workers: workerInfo.config.workers,
          slot,
          accounts: keys.length,
        });
      }

      const key = keys[slot % keys.length];
      const credentials = readAccount('users', key, envConfig, appEnv);
      logger.info('Using pool account', { account: key, worker: workerInfo.parallelIndex, shardIndex });
      logger.debug('Worker account', { email: credentials.email, password: credentials.password });
      await use(credentials);
    },
    { scope: 'worker' },
  ],

  authUser: [
    async ({ account, envConfig, playwright }, use) => {
      const user = await loginThroughApi(playwright, envConfig, account);
      logger.info('Got an API token for the worker account', { userId: user.id });
      await use(user);
    },
    { scope: 'worker' },
  ],

  authStorageStatePath: [
    async ({ account, envConfig, browser }, use, workerInfo) => {
      const filePath = path.join(AUTH_STATE_DIR, `${workerInfo.project.name}-worker-${workerInfo.parallelIndex}.json`);
      await loginThroughUi(browser, envConfig, account, filePath);
      await use(filePath);
    },
    { scope: 'worker' },
  ],

  otherUser: [
    async ({ appEnv, envConfig, playwright }, use) => {
      const user = await loginThroughApi(playwright, envConfig, readAccount('otherUsers', 'userB', envConfig, appEnv));
      logger.info('Got an API token for user B', { userId: user.id });
      await use(user);
    },
    { scope: 'worker' },
  ],

  otherUserStorageStatePath: [
    async ({ otherUser, envConfig, browser }, use, workerInfo) => {
      const filePath = path.join(AUTH_STATE_DIR, `${workerInfo.project.name}-worker-${workerInfo.parallelIndex}-userB.json`);
      await loginThroughUi(browser, envConfig, otherUser, filePath);
      await use(filePath);
    },
    { scope: 'worker' },
  ],

  // Every page starts logged in; guest tests opt out with test.use({ storageState: { cookies: [], origins: [] } })
  storageState: async ({ authStorageStatePath }, use) => {
    await use(authStorageStatePath);
  },
});
