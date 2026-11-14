import { test as base } from './base';
import { Logger } from '../utils/logger';
import type { AppEnvironment } from '../config/env';
import { TestDataRegistry } from '../utils/testDataRegistry';
import { EventHubFactories } from '../data/factories';
import { seedFrom } from '../data/generators/eventHubFaker';

const logger = new Logger('TestData');

/** Every `test-data/*.json` file is a source named after the file: `events`, `bookings`, `users`. */
export const testDataRegistry = new TestDataRegistry();

/** Resolves `test.use({ testData })` keys from the registry; shared by the UI and the API-only fixtures. */
export function resolveTestData(testData: TestDataKeys | undefined, appEnv: AppEnvironment): ResolvedData<TestDataKeys> {
  if (!testData) {
    logger.debug('No data keys specified. Use test.use({ testData: { events: "conference", bookings: "validCustomer" } })');
    return {} as ResolvedData<TestDataKeys>;
  }
  return testDataRegistry.resolveAll(testData, appEnv) as ResolvedData<TestDataKeys>;
}

export type TestDataKeys = Record<string, string>;
export type ResolvedData<T extends TestDataKeys> = {
  [K in keyof T]: Record<string, unknown>;
};

type DataFixtures = {
  data: ResolvedData<TestDataKeys>;
  /**
   * Generated, valid EventHub data (events, customers, bookings), seeded per test: the same test gets the same
   * values on every run and retry. Replay any test's values with DATA_SEED=<seed from its annotations>.
   */
  dataFactory: EventHubFactories;
};

type DataOptions = {
  testData: TestDataKeys | undefined;
};

export const test = base.extend<DataFixtures & DataOptions>({
  testData: [undefined, { option: true }],

  data: async ({ appEnv, testData }, use) => {
    const data = resolveTestData(testData, appEnv);
    if (testData) {
      logger.info('Resolved test data', { keys: testData });
      logger.debug('Test data values', { data });
    }
    await use(data);
  },

  dataFactory: async ({}, use, testInfo) => {
    const seed = process.env.DATA_SEED ? Number(process.env.DATA_SEED) : seedFrom(testInfo.testId);
    testInfo.annotations.push({ type: 'dataSeed', description: String(seed) });
    logger.debug('Data generator seeded', { seed });
    await use(new EventHubFactories(seed));
  },
});
