import { z } from 'zod';

export const schemaMatchers = {
  /** Validates a parsed response body against a Zod schema; failures list every violated path. */
  toMatchSchema(received: unknown, schema: z.ZodType) {
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      name: 'toMatchSchema',
      message: () =>
        result.success
          ? 'Expected the value not to match the schema'
          : `Expected the value to match the schema:\n${z.prettifyError(result.error)}`,
    };
  },
};
