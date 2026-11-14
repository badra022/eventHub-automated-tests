import { test, expect } from '../../../fixtures/api';
import { expectBookingCancelled } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC4 - Cancel a booking', () => {
  test(
    'S27 - after cancelling, the booking can no longer be found by id, reference or status filter',
    {
      tag: ['@bookings', '@api', '@regression', '@needs-clarification'],
      annotation: [
        { type: 'scenarioId', description: 'S27' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'G5' },
        {
          type: 'clarification',
          description:
            'G5: the API docs say cancel permanently deletes, the schema has a "cancelled" status. Today it is a hard delete; the definition lives in helpers/bookings/cancellation.helpers.ts',
        },
      ],
    },
    async ({ bookingSetup, bookingsService, dataFactory }) => {
      const booking = await test.step('create an event and a booking, then cancel it (API)', async () => {
        const event = await bookingSetup.createEvent(dataFactory.event());
        const created = await bookingSetup.createBooking(event.id);
        await bookingsService.cancelBooking(created.id);
        return created;
      });

      await test.step('lookups by id and reference behave as a cancelled booking (today: 404)', async () => {
        await expectBookingCancelled(bookingsService, booking);
      });

      await test.step('the booking is not listed, not even with status=cancelled', async () => {
        const all = await bookingsService.listBookings({ eventId: booking.eventId });
        const cancelled = await bookingsService.listBookings({ eventId: booking.eventId, status: 'cancelled' });
        logger.debug('Lists after cancel', { all: all.pagination, cancelled: cancelled.pagination });
        expect(all.data.map((b) => b.bookingRef)).not.toContain(booking.bookingRef);
        expect(cancelled.pagination.total).toBe(0);
        logger.info('Step done: cancelled booking is gone everywhere', { scenarioId: 'S27', bookingRef: booking.bookingRef });
      });
    },
  );
});
