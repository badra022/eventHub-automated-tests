import { request } from '@playwright/test';
import dotenv from 'dotenv';
import { EventsAPIClient } from '../api/events.api';
import type { Event, Paginated } from '../api/types';
import { getEnvConfig, type AppEnvironment } from '../config/env';
import { AuthService } from '../services/auth.service';
import { decryptRecord } from '../utils/crypto';
import { TestDataRegistry } from '../utils/testDataRegistry';

dotenv.config();

/**
 * Deletes events the tests left behind in every test account (e.g. after a cancelled run or a dropped connection).
 * Deleting an event also deletes its bookings. Only events of the account itself whose title starts with "QA "
 * and that are older than the minimum age are touched, so a run in progress on another branch keeps its data.
 *   npm run sandbox:cleanup               (minimum age 30 minutes)
 *   npm run sandbox:cleanup -- 0          (everything the tests created, e.g. locally when nothing else runs)
 */
const minAgeMinutes = Number(process.argv[2] ?? 30);
const appEnv = (process.env.APP_ENV ?? 'prod') as AppEnvironment;
const config = getEnvConfig(appEnv);

type OwnedEvent = Event & { userId?: number; isStatic?: boolean };

async function main(): Promise<void> {
  const registry = new TestDataRegistry();
  const accounts = ['users', 'otherUsers'].flatMap((source) => registry.keys(source, appEnv).map((key) => ({ source, key })));
  const cutoff = Date.now() - minAgeMinutes * 60_000;
  const context = await request.newContext();
  let failures = 0;

  try {
    for (const { source, key } of accounts) {
      try {
        const { email, password } = decryptRecord(registry.resolve(source, key, appEnv), config.TEST_DATA_KEY);
        const { token, user } = await new AuthService(context, { baseUrl: config.API_BASE_URL }).login({
          email: String(email),
          password: String(password),
        });
        const events = new EventsAPIClient(context, { baseUrl: config.API_BASE_URL, token });

        const leftovers: OwnedEvent[] = [];
        for (let page = 1; ; page++) {
          const response = await events.list({ page, limit: 100 });
          const body = (await response.json()) as Paginated<OwnedEvent>;
          leftovers.push(
            ...body.data.filter(
              (event) =>
                !event.isStatic && event.userId === user.id && event.title.startsWith('QA ') && Date.parse(event.createdAt) < cutoff,
            ),
          );
          if (page >= body.pagination.totalPages) break;
        }

        let deleted = 0;
        for (const event of leftovers) {
          const response = await events.delete(event.id);
          if (response.ok() || response.status() === 404) deleted++;
          else console.warn(`${key}: could not delete event ${event.id} (${response.status()})`);
        }
        console.log(`${key.padEnd(17)} leftover test events: ${leftovers.length}, deleted: ${deleted}`);
      } catch (error) {
        failures++;
        console.warn(`${key}: cleanup failed: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await context.dispose();
  }
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
