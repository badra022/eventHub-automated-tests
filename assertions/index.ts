import { expect as baseExpect } from '@playwright/test';
import { apiMatchers } from './api.assertions';

export const expect = baseExpect.extend({
  ...apiMatchers,
});
