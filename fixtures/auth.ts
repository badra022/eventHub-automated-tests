import type { Browser, PlaywrightWorkerArgs, WorkerInfo } from '@playwright/test';
import { test as base } from './base';
import { testDataRegistry } from './data';
import { AuthService } from '../services/auth.service';
import type { UserCredentials } from '../api/types';
import type { AppEnvironment, EnvConfig } from '../config/env';
import { LoginPage } from '../pages/login.page';
import { decryptRecord } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { Navigation } from '../utils/navigation';
import { StorageStateManager } from '../utils/storageStateManager';

const logger = new Logger('Auth fixture');

const storageStates = new StorageStateManager();

/**
 * Accounts a test can act as:
 * - `worker`: this worker's own pool account (test-data/users.json). One account per worker
 *   keeps each 9-booking sandbox private to one worker (risk T2).
 * - `userB`: user B for isolation and authorisation tests, shared by all workers, so only read with it or attempt
 *   forbidden actions; never create data in its sandbox.
 * - `sandboxLimitUser`: dedicated account for S19, which pushes a sandbox past its 9-booking limit.
 */
export type AccountName = 'worker' | 'userB' | 'sandboxLimitUser';

export type AuthenticatedUser = UserCredentials & {
  id: number;
  /** JWT used by the API services */
  token: string;
};

interface ResolvedAccount {
  /** Stable name of the account, used for its session file */
  key: string;
  credentials: UserCredentials;
}

/**
 * Resolves, logs in and saves sessions of accounts, each only on first use: a test that never asks for an account
 * never decrypts, registers or logs it in.
 */
export class Accounts {
  private readonly resolved = new Map<AccountName, Promise<ResolvedAccount>>();
  private readonly apiUsers = new Map<AccountName, Promise<AuthenticatedUser>>();

  constructor(
    private readonly appEnv: AppEnvironment,
    private readonly envConfig: EnvConfig,
    private readonly playwright: PlaywrightWorkerArgs['playwright'],
    private readonly workerInfo: WorkerInfo,
  ) {}

  credentials(name: AccountName): Promise<UserCredentials> {
    return this.resolve(name).then((account) => account.credentials);
  }

  /** The account logged in through the API (once per worker). */
  login(name: AccountName): Promise<AuthenticatedUser> {
    let user = this.apiUsers.get(name);
    if (!user) {
      user = this.resolve(name).then(async ({ credentials }) => {
        const context = await this.playwright.request.newContext();
        try {
          const { token, user: me } = await new AuthService(context, { baseUrl: this.envConfig.API_BASE_URL }).login(credentials);
          logger.info('Got an API token', { account: name, userId: me.id });
          return { ...credentials, id: me.id, token };
        } finally {
          await context.dispose();
        }
      });
      this.apiUsers.set(name, user);
    }
    return user;
  }

  /** Session file of the account logged in through the UI: `.auth/<env>-<account>.json`, reused while fresh. */
  async storageState(name: AccountName, browser: Browser): Promise<string> {
    const { key, credentials } = await this.resolve(name);
    const stateName = `${this.appEnv}-${key}`;
    if (storageStates.isFresh(stateName)) {
      logger.debug('Reusing the saved session', { account: name, file: storageStates.pathFor(stateName) });
    }
    return storageStates.ensure(stateName, (filePath) => loginThroughUi(browser, this.envConfig, credentials, filePath));
  }

  private resolve(name: AccountName): Promise<ResolvedAccount> {
    let account = this.resolved.get(name);
    if (!account) {
      account = name === 'worker' ? this.resolveWorkerAccount() : Promise.resolve(this.readAccount('otherUsers', name));
      this.resolved.set(name, account);
    }
    return account;
  }

  private async resolveWorkerAccount(): Promise<ResolvedAccount> {
    const worker = this.workerInfo.parallelIndex;
    const keys = testDataRegistry.keys('users', this.appEnv);
    if (keys.length === 0) {
      logger.error('No pool accounts for this environment in test-data/users.json', { appEnv: this.appEnv });
      throw new Error(`No accounts for "${this.appEnv}" in test-data/users.json. Run "npm run users:provision".`);
    }
    // CI shards run on separate machines with the same worker indexes, so each shard gets its own block of accounts
    const shardIndex = Number(process.env.SHARD_INDEX ?? 1);
    const slot = (shardIndex - 1) * this.workerInfo.config.workers + worker;
    if (slot >= keys.length) {
      logger.warn('More concurrent workers than pool accounts: accounts are shared and bookings may be evicted', {
        shardIndex,
        workers: this.workerInfo.config.workers,
        slot,
        accounts: keys.length,
      });
    }
    const key = keys[slot % keys.length];
    const account = this.readAccount('users', key);
    logger.info('Using pool account', { account: key, worker, shardIndex });
    logger.debug('Worker account', { email: account.credentials.email, password: account.credentials.password });
    return account;
  }

  private readAccount(source: string, key: string): ResolvedAccount {
    try {
      const { email, password } = decryptRecord(testDataRegistry.resolve(source, key, this.appEnv), this.envConfig.TEST_DATA_KEY);
      if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
        throw new Error(`Account "${key}" in test-data must contain non-empty email and password values.`);
      }
      return { key, credentials: { email, password } };
    } catch (error) {
      logger.error('Could not read the account from test data', { source, account: key, error });
      throw error;
    }
  }
}

async function loginThroughUi(browser: Browser, envConfig: EnvConfig, credentials: UserCredentials, filePath: string): Promise<void> {
  const done = logger.timed('Logged in through the UI');
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const loginPage = new LoginPage(page);
    await new Navigation(page, { appBaseUrl: envConfig.APP_BASE_URL }).toLoginPage();
    await loginPage.login(credentials.email, credentials.password);
    await loginPage.waitForLoggedIn();
    await context.storageState({ path: filePath });
  } catch (error) {
    logger.error('UI login failed', { url: page.url(), email: credentials.email, error });
    throw error;
  } finally {
    await context.close();
  }
  done();
}

type AuthTestFixtures = {
  /** Account every page of the test starts logged in as; `null` starts as a guest. Set with `test.use({ user })`. */
  user: AccountName | null;
  /** Session file of any account, for extra browser contexts (e.g. user B's own page). Created on first use only. */
  storageStateFor: (name: AccountName) => Promise<string>;
};

type AuthWorkerFixtures = {
  accounts: Accounts;
  /** The worker's account logged in through the API. */
  authUser: AuthenticatedUser;
  /** User B logged in through the API. */
  otherUser: AuthenticatedUser;
  /** The S19 sandbox-limit account logged in through the API. */
  sandboxLimitUser: AuthenticatedUser;
};

export const test = base.extend<AuthTestFixtures, AuthWorkerFixtures>({
  accounts: [
    async ({ appEnv, envConfig, playwright }, use, workerInfo) => {
      await use(new Accounts(appEnv, envConfig, playwright, workerInfo));
    },
    { scope: 'worker' },
  ],

  authUser: [async ({ accounts }, use) => use(await accounts.login('worker')), { scope: 'worker' }],
  otherUser: [async ({ accounts }, use) => use(await accounts.login('userB')), { scope: 'worker' }],
  sandboxLimitUser: [async ({ accounts }, use) => use(await accounts.login('sandboxLimitUser')), { scope: 'worker' }],

  user: ['worker', { option: true }],

  storageStateFor: async ({ accounts, browser }, use) => {
    await use((name) => accounts.storageState(name, browser));
  },

  storageState: async ({ user, storageStateFor }, use) => {
    await use(user ? await storageStateFor(user) : undefined);
  },
});
