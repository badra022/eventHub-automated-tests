import { request } from '@playwright/test';
import dotenv from 'dotenv';
import { getEnvConfig, type AppEnvironment } from '../config/env';
import { AuthService } from '../services/auth.service';
import { generateRandomText, uniqueSuffix } from '../utils/common';
import { encrypt } from '../utils/crypto';

dotenv.config();

/**
 * Registers a pool of accounts (one per CI worker) and prints them encrypted, ready to paste into
 * test-data/users.json under the environment key. Accounts cannot be deleted, so run it only when the pool changes.
 *   npm run users:provision -- 4
 * Plain-text credentials are never printed.
 */
const count = Number(process.argv[2] ?? 4);
const appEnv = (process.env.APP_ENV ?? 'prod') as AppEnvironment;
const config = getEnvConfig(appEnv);

if (!Number.isInteger(count) || count < 1) {
  console.error('Usage: tsx scripts/provision-users.ts <count>');
  process.exit(1);
}

async function main(): Promise<void> {
  const context = await request.newContext();
  const authService = new AuthService(context, { baseUrl: config.API_BASE_URL });
  const accounts: Record<string, { email: string; password: string }> = {};

  try {
    for (let i = 1; i <= count; i++) {
      const credentials = { email: `eventhub.qa.pool.${uniqueSuffix()}@example.com`, password: generateRandomText(16) };
      await authService.register(credentials);
      accounts[`account${String(i).padStart(2, '0')}`] = {
        email: encrypt(credentials.email, config.TEST_DATA_KEY),
        password: encrypt(credentials.password, config.TEST_DATA_KEY),
      };
    }
  } finally {
    await context.dispose();
  }

  console.log(JSON.stringify({ [appEnv]: accounts }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
