import { test as base } from './base';
import { Logger } from '../utils/logger';
import type { AppEnvironment } from '../config/env';
import { TestDataRegistry } from '../utils/testDataRegistry';

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
});
