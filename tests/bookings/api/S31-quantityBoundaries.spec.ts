import { test, expect } from '../../../fixtures/api';
import { ValidationErrorResponseSchema } from '../../../assertions';
import type { ValidationErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

type QuantityCase = { label: string; quantity: unknown; expectedStatus: 201 | 400; defect?: string };

const CASES: QuantityCase[] = [
  { label: '1 (lower bound)', quantity: 1, expectedStatus: 201 },
  { label: '10 (upper bound)', quantity: 10, expectedStatus: 201 },
  { label: '0', quantity: 0, expectedStatus: 400 },
  { label: '11', quantity: 11, expectedStatus: 400 },
  { label: '-1', quantity: -1, expectedStatus: 400 },
  { label: '1.5', quantity: 1.5, expectedStatus: 400 },
  { label: 'null', quantity: null, expectedStatus: 400 },
  {
    label: 'the string "2"',
    quantity: '2',
    expectedStatus: 400,
    defect: 'The API accepts quantity sent as text ("2") and creates the booking (201); the spec requires an integer (risk R1)',
  },
];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  for (const { label, quantity, expectedStatus, defect } of CASES) {
    test(
      `S31 - quantity ${label} is ${expectedStatus === 201 ? 'accepted' : 'rejected with 400'}`,
      {
        tag: ['@bookings', '@api', '@critical', ...(defect ? ['@excluded'] : [])],
        annotation: [
          { type: 'scenarioId', description: 'S31' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R1' },
          ...(defect ? [{ type: 'exclusionReason', description: `Known defect: ${defect}` }] : []),
        ],
      },
      async ({ bookingSetup, bookingsService, eventsService, dataFactory }) => {
        const event = await test.step('create an event (API)', async () => {
          return bookingSetup.createEvent(dataFactory.event());
        });

        const response = await test.step(`POST /bookings with quantity ${label}`, async () => {
          const payload = { ...dataFactory.booking(event.id), quantity };
          logger.debug('Payload', { payload });
          return bookingsService.requestBooking(payload);
        });

        await test.step(`the API answers ${expectedStatus}`, async () => {
          await expect(response).toHaveStatus(expectedStatus);
          const body: unknown = await response.json();
          logger.debug('Response body', { body });
          if (expectedStatus === 400) {
            expect(body).toMatchSchema(ValidationErrorResponseSchema);
            expect((body as ValidationErrorResponse).details.map((detail) => detail.field)).toContain('quantity');
          }
        });

        await test.step('seats change only for an accepted quantity', async () => {
          const expectedSeats = expectedStatus === 201 ? event.availableSeats - Number(quantity) : event.availableSeats;
          expect(await eventsService.getAvailableSeats(event.id)).toBe(expectedSeats);
          logger.info('Step done: quantity rule verified', { scenarioId: 'S31', quantity: label, expectedStatus, expectedSeats });
        });
      },
    );
  }
});
