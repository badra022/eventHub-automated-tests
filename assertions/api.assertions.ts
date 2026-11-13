import type { APIResponse } from '@playwright/test';

/** Matchers for raw API responses; failures print the URL and the response body. */
export const apiMatchers = {
  async toHaveStatus(received: APIResponse, expected: number) {
    const actual = received.status();
    const pass = actual === expected;
    const body = pass ? '' : await received.text();
    return {
      pass,
      name: 'toHaveStatus',
      expected,
      actual,
      message: () =>
        pass
          ? `Expected ${received.url()} not to respond with status ${expected}`
          : `Expected ${received.url()} to respond with status ${expected}, received ${actual}\nBody: ${body}`,
    };
  },
};
