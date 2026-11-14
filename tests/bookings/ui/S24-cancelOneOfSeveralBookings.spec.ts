import { test, expect } from '../../../fixtures/app';
import { expectBookingCancelled, expectBookingStillConfirmed } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC4 - Cancel a booking', () => {
  test(
    'S24 - cancelling one of several bookings affects only that booking, in the UI and the API',
    {
      tag: ['@bookings', '@ui', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S24' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R5' },
      ],
    },
    async ({ booking, bookingsService, eventsService, dataFactory }) => {
      const { event, bookings } = await test.step('create an event and three bookings of 1, 2 and 3 tickets (API)', async () => {
        const createdEvent = await booking.setup.createEvent(dataFactory.event());
        const created = [];
        for (const quantity of [1, 2, 3]) {
          created.push(await booking.setup.createBooking(createdEvent.id, { quantity }));
        }
        logger.info('Step done: bookings ready', { scenarioId: 'S24', refs: created.map((b) => b.bookingRef) });
        return { event: createdEvent, bookings: created };
      });
      const [first, target, last] = bookings;

      const myBookings = await test.step(`cancel the middle booking ${target.bookingRef} (UI)`, async () => {
        return booking.ui.cancelFromMyBookings(target.bookingRef);
      });

      await test.step('only the cancelled card is gone from My Bookings', async () => {
        await expect(myBookings.booking(target.bookingRef).getRoot()).toHaveCount(0);
        await expect(myBookings.booking(first.bookingRef).getRoot()).toBeVisible();
        await expect(myBookings.booking(last.bookingRef).getRoot()).toBeVisible();
      });

      await test.step('the API agrees: one booking cancelled, the others confirmed, only its seats released', async () => {
        await expectBookingCancelled(bookingsService, target);
        await expectBookingStillConfirmed(bookingsService, first);
        await expectBookingStillConfirmed(bookingsService, last);
        const expectedSeats = event.availableSeats - first.quantity - last.quantity;
        const seatsAfter = await eventsService.getAvailableSeats(event.id);
        logger.debug('Seat accounting', { totalSeats: event.availableSeats, kept: [first.quantity, last.quantity], expectedSeats, seatsAfter });
        expect(seatsAfter).toBe(expectedSeats);
        logger.info('Step done: only the target booking was affected', { scenarioId: 'S24', cancelled: target.bookingRef, seatsAfter });
      });
    },
  );
});
