import { test, expect } from '../../../fixtures/api';
import { ErrorResponseSchema, ValidationErrorResponseSchema } from '../../../assertions';
import type { ValidationErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const INVALID_EVENT_IDS: { label: string; eventId: unknown }[] = [
  { label: 'text ("abc")', eventId: 'abc' },
  { label: 'a decimal (1.5)', eventId: 1.5 },
  { label: 'a negative number (-1)', eventId: -1 },
];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test(
    'S33 - booking an eventId that does not exist returns 404',
    {
      tag: ['@bookings', '@api', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S33' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R9' },
      ],
    },
    async ({ bookingsService, dataFactory }) => {
      const unknownEventId = 999_999_999;
      const response = await bookingsService.requestBooking(dataFactory.booking(unknownEventId));
      await expect(response).toHaveStatus(404);
      const body: unknown = await response.json();
      expect(body).toMatchSchema(ErrorResponseSchema);
      expect((body as { error: string }).error).toBe(`Event with id ${unknownEventId} not found`);
      logger.info('Step done: unknown event rejected', { scenarioId: 'S33', unknownEventId });
    },
  );

  for (const { label, eventId } of INVALID_EVENT_IDS) {
    test(
      `S33 - an eventId that is ${label} returns 400 naming eventId`,
      {
        tag: ['@bookings', '@api', '@regression'],
        annotation: [
          { type: 'scenarioId', description: 'S33' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R9' },
        ],
      },
      async ({ bookingsService, dataFactory }) => {
        const response = await bookingsService.requestBooking({ ...dataFactory.booking(1), eventId });
        await expect(response).toHaveStatus(400);
        const body: unknown = await response.json();
        expect(body).toMatchSchema(ValidationErrorResponseSchema);
        expect((body as ValidationErrorResponse).details).toContainEqual({ field: 'eventId', message: 'Event ID must be a positive integer' });
        logger.info('Step done: invalid eventId rejected', { scenarioId: 'S33', eventId: label });
      },
    );
  }
});
