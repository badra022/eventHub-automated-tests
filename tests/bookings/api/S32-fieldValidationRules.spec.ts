import { test, expect } from '../../../fixtures/api';
import { ValidationErrorResponseSchema } from '../../../assertions';
import { buildBookingInput } from '../../../helpers/bookings';
import type { CreateBookingInput, ValidationErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

type FieldCase = {
  label: string;
  override: Partial<CreateBookingInput>;
  /** What the API does today */
  expectedStatus: 201 | 400;
  /** Same input in the booking form (rules read from the page validation messages) */
  uiAccepts: boolean;
  clarification?: string;
};

const CASES: FieldCase[] = [
  { label: 'name of 1 character', override: { customerName: 'A' }, expectedStatus: 400, uiAccepts: false },
  { label: 'name of 2 characters', override: { customerName: 'Al' }, expectedStatus: 201, uiAccepts: true },
  { label: 'email without @', override: { customerEmail: 'plainaddress' }, expectedStatus: 400, uiAccepts: false },
  { label: 'email without domain', override: { customerEmail: 'user@' }, expectedStatus: 400, uiAccepts: false },
  { label: 'email with a space', override: { customerEmail: 'us er@example.com' }, expectedStatus: 400, uiAccepts: false },
  { label: 'phone of 9 digits', override: { customerPhone: '987654321' }, expectedStatus: 400, uiAccepts: false },
  { label: 'phone of 10 digits', override: { customerPhone: '9876543210' }, expectedStatus: 201, uiAccepts: true },
  { label: 'phone of letters', override: { customerPhone: 'abcdefghij' }, expectedStatus: 400, uiAccepts: false },
  {
    label: 'phone with no digits (----------)',
    override: { customerPhone: '----------' },
    expectedStatus: 201,
    uiAccepts: false,
    clarification: 'G2: the API counts characters and accepts "----------", the UI needs 10 digits and rejects it (risk R7)',
  },
];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'conference' } });

  for (const { label, override, expectedStatus, uiAccepts, clarification } of CASES) {
    test(
      `S32 - ${label} is ${expectedStatus === 201 ? 'accepted' : 'rejected with 400'} by the API`,
      {
        tag: ['@bookings', '@api', '@critical', ...(clarification ? ['@needs-clarification'] : [])],
        annotation: [
          { type: 'scenarioId', description: 'S32' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R7' },
          { type: 'uiRule', description: uiAccepts ? 'the booking form accepts this value' : 'the booking form rejects this value' },
          ...(clarification ? [{ type: 'clarification', description: clarification }] : []),
        ],
      },
      async ({ bookingSetup, bookingsService, data }) => {
        const field = Object.keys(override)[0];

        const event = await test.step('create an event (API)', async () => {
          return bookingSetup.createEvent(data.events);
        });

        const response = await test.step(`POST /bookings with ${label}`, async () => {
          const payload = buildBookingInput(event.id, override);
          logger.debug('Payload', { payload });
          return bookingsService.requestBooking(payload);
        });

        await test.step(`the API answers ${expectedStatus}`, async () => {
          await expect(response).toHaveStatus(expectedStatus);
          const body: unknown = await response.json();
          logger.debug('Response body', { body });
          if (expectedStatus === 400) {
            expect(body).toMatchSchema(ValidationErrorResponseSchema);
            expect((body as ValidationErrorResponse).details.map((detail) => detail.field)).toContain(field);
          }
          const apiAccepts = expectedStatus === 201;
          if (apiAccepts !== uiAccepts) {
            logger.warn('UI and API validation rules disagree for this value', { scenarioId: 'S32', field, label, apiAccepts, uiAccepts });
          }
          logger.info('Step done: field rule verified', { scenarioId: 'S32', field, label, expectedStatus });
        });
      },
    );
  }
});
