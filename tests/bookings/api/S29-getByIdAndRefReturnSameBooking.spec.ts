import { test, expect } from '../../../fixtures/api';
import { BookingSchema } from '../../../assertions';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'conference' } });

  test(
    'S29 - GET by id and GET by reference return the booking that was created',
    {
      tag: ['@bookings', '@api', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S29' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R4' },
      ],
    },
    async ({ bookingSetup, bookingsService, data }) => {
      const created = await test.step('create an event and a booking (API)', async () => {
        const event = await bookingSetup.createEvent(data.events);
        return bookingSetup.createBooking(event.id, { quantity: 2 });
      });

      await test.step('GET /bookings/{id} returns the same booking', async () => {
        const byId = await bookingsService.getBooking(created.id);
        expect(byId).toMatchSchema(BookingSchema);
        expect(byId).toEqual(created);
        logger.info('Step done: found by id', { scenarioId: 'S29', bookingId: created.id });
      });

      await test.step('GET /bookings/ref/{ref} returns the same booking', async () => {
        const byRef = await bookingsService.getBookingByRef(created.bookingRef);
        expect(byRef).toMatchSchema(BookingSchema);
        expect(byRef).toEqual(created);
        logger.info('Step done: found by reference', { scenarioId: 'S29', bookingRef: created.bookingRef });
      });
    },
  );
});
