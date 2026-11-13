import { expect as baseExpect } from '@playwright/test';
import { apiMatchers } from './api.assertions';
import { schemaMatchers } from './schema.assertions';

export * from './schemas';

export const expect = baseExpect.extend({
  ...apiMatchers,
  ...schemaMatchers,
});
