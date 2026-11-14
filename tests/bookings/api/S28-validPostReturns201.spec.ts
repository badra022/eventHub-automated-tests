import { test, expect } from '../../../fixtures/api';
import { CreateBookingResponseSchema } from '../../../assertions';
import { BOOKING_REF_PATTERN } from '../../../services';
import type { ApiSuccess, Booking } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test(
    'S28 - a valid POST returns 201 with a confirmed booking that matches the schema',
    {
      tag: ['@bookings', '@api', '@critical', '@smoke'],
      annotation: [
        { type: 'scenarioId', description: 'S28' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R12' },
        { type: 'specDeviation', description: 'bookingRef is <letter>-XXXXXX, not EVT-XXXXXX; prices are strings, not numbers' },
      ],
    },
    async ({ bookingSetup, bookingsService, dataFactory }) => {
      const event = await test.step('create an event (API)', async () => {
        return bookingSetup.createEvent(dataFactory.event());
      });

      const input = dataFactory.booking(event.id, { quantity: 2 });
      const response = await test.step('POST /bookings with a valid payload', async () => {
        logger.debug('Payload', { input });
        return bookingsService.requestBooking(input);
      });

      await test.step('201 with a body that matches the booking schema', async () => {
        await expect(response).toHaveStatus(201);
        const body = (await response.json()) as ApiSuccess<Booking>;
        logger.debug('Response body', { body });
        expect(body).toMatchSchema(CreateBookingResponseSchema);
        expect(body.data).toMatchObject({ ...input, status: 'confirmed' });
        expect(body.data.bookingRef).toMatch(BOOKING_REF_PATTERN);
        expect(body.data.event.id).toBe(event.id);
        logger.info('Step done: response verified', { scenarioId: 'S28', bookingRef: body.data.bookingRef });
      });
    },
  );
});
