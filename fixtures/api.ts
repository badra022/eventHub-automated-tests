import { mergeTests } from '@playwright/test';
import { test as dataTest } from './data';
import { test as servicesTest } from './services';

export { expect } from '../assertions';

/** API-only tests: test data + API login + services. No fixture here needs a browser, so none is launched. */
export const test = mergeTests(dataTest, servicesTest);
