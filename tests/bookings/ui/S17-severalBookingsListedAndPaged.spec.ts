import { test, expect } from '../../../fixtures/app';
import { formatDisplayedPrice } from '../../../helpers/bookings';
import type { Booking, Event } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC3 - The booking appears in My Bookings', () => {
  test.use({ testData: { events: 'conference' } });

  test(
    'S17 - bookings for several events are all listed, and the list pages correctly with a small limit',
    {
      tag: ['@bookings', '@ui', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S17' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC3' },
        { type: 'risk', description: 'R4' },
      ],
    },
    async ({ booking, bookingsService, data }) => {
      const created = await test.step('three events with one booking each, 1, 2 and 3 tickets (API)', async () => {
        const pairs: { event: Event; booking: Booking }[] = [];
        for (const quantity of [1, 2, 3]) {
          const event = await booking.setup.createEvent(data.events);
          pairs.push({ event, booking: await booking.setup.createBooking(event.id, { quantity }) });
        }
        return pairs;
      });

      await test.step('My Bookings lists all three with their event, tickets and total', async () => {
        const myBookings = await booking.ui.openMyBookings();
        await expect(myBookings.getBookingCards()).toHaveCount(created.length);
        for (const { event, booking: b } of created) {
          const card = myBookings.booking(b.bookingRef);
          await expect(card.getEventTitle()).toHaveText(event.title);
          await expect(card.getTicketCount()).toContainText(`${b.quantity} ticket`);
          await expect(card.getTotalPrice()).toHaveText(formatDisplayedPrice(b.totalPrice));
        }
      });

      await test.step('GET /bookings with limit=2 returns the same three bookings across two pages', async () => {
        const page1 = await bookingsService.listBookings({ limit: 2, page: 1 });
        const page2 = await bookingsService.listBookings({ limit: 2, page: 2 });
        logger.debug('Pages', { page1: page1.pagination, page2: page2.pagination });
        expect(page1.pagination).toMatchObject({ total: 3, limit: 2, totalPages: 2 });
        expect(page1.data).toHaveLength(2);
        expect(page2.data).toHaveLength(1);
        const listed = [...page1.data, ...page2.data].map((b) => b.bookingRef).sort();
        expect(listed).toEqual(created.map((c) => c.booking.bookingRef).sort());
        logger.info('Step done: all bookings listed and paged', { scenarioId: 'S17', refs: listed });
      });
    },
  );
});
