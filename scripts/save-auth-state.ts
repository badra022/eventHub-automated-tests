import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { getEnvConfig, type AppEnvironment } from '../config/env';
import { LoginPage } from '../pages/login.page';
import { decryptRecord } from '../utils/crypto';
import { Navigation } from '../utils/navigation';
import { TestDataRegistry } from '../utils/testDataRegistry';

dotenv.config();

/**
 * Logs a pool account in through the UI and saves its storage state, for exploring the app with playwright-cli:
 *   npm run auth:state -- account01
 *   npx playwright-cli open && npx playwright-cli state-load .auth/account01.json
 */
const accountKey = process.argv[2] ?? 'account01';
const appEnv = (process.env.APP_ENV ?? 'prod') as AppEnvironment;
const config = getEnvConfig(appEnv);

async function main(): Promise<void> {
  const record = decryptRecord(new TestDataRegistry().resolve('users', accountKey, appEnv), config.TEST_DATA_KEY);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const loginPage = new LoginPage(page);
    await new Navigation(page, { appBaseUrl: config.APP_BASE_URL }).toLoginPage();
    await loginPage.login(String(record.email), String(record.password));
    await loginPage.waitForLoggedIn();
    const filePath = path.resolve('.auth', `${accountKey}.json`);
    await page.context().storageState({ path: filePath });
    console.log(`Saved storage state of ${accountKey} to ${filePath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
