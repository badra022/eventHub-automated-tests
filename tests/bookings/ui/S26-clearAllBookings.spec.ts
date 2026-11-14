import { test, expect } from '../../../fixtures/app';
import { expectBookingCancelled } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC4 - Cancel a booking', () => {
  test(
    'S26 - "Clear all bookings" asks for confirmation, removes every booking and restores the seats of each event',
    {
      tag: ['@bookings', '@ui', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S26' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R2' },
        { type: 'note', description: 'The confirmation is a native browser confirm(), unlike the in-page dialog of a single cancel' },
      ],
    },
    async ({ booking, bookingsService, eventsService, dataFactory }) => {
      const { eventA, eventB, bookings } = await test.step('two events: 2 tickets on A, 1 + 3 tickets on B (API)', async () => {
        const a = await booking.setup.createEvent(dataFactory.event());
        const b = await booking.setup.createEvent(dataFactory.event());
        const created = [
          await booking.setup.createBooking(a.id, { quantity: 2 }),
          await booking.setup.createBooking(b.id, { quantity: 1 }),
          await booking.setup.createBooking(b.id, { quantity: 3 }),
        ];
        return { eventA: a, eventB: b, bookings: created };
      });

      const myBookings = await test.step('My Bookings lists the three bookings', async () => {
        const page = await booking.ui.openMyBookings();
        await expect(page.getBookingCards()).toHaveCount(bookings.length);
        return page;
      });

      await test.step('"Clear all bookings" asks "Clear all your bookings? This cannot be undone." and clears the list', async () => {
        const message = await myBookings.clearAllBookings();
        expect(message).toBe('Clear all your bookings? This cannot be undone.');
        await expect(myBookings.getEmptyState()).toBeVisible();
        await expect(myBookings.getBookingCards()).toHaveCount(0);
      });

      await test.step('the API has no bookings left and both events have all their seats back', async () => {
        expect((await bookingsService.listBookings({ limit: 100 })).pagination.total).toBe(0);
        for (const b of bookings) {
          await expectBookingCancelled(bookingsService, b);
        }
        expect(await eventsService.getAvailableSeats(eventA.id)).toBe(eventA.availableSeats);
        expect(await eventsService.getAvailableSeats(eventB.id)).toBe(eventB.availableSeats);
        logger.info('Step done: every booking cleared and every seat restored', { scenarioId: 'S26', cleared: bookings.length });
      });
    },
  );
});
