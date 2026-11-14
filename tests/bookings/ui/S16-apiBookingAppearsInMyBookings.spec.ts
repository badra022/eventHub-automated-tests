import { test, expect } from '../../../fixtures/app';
import { formatDisplayedPrice } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC3 - The booking appears in My Bookings', () => {
  // The card baselines show the title, city and month, so this test keeps the fixed template from test-data/events.json
  test.use({ testData: { events: 'conference' } });

  test(
    'S16 - a booking made through the API appears in My Bookings with the same reference, event, tickets and total',
    {
      tag: ['@bookings', '@ui', '@critical', '@smoke', '@visual', '@cross-browser'],
      annotation: [
        { type: 'scenarioId', description: 'S16' },
        { type: 'alsoCovers', description: 'S41 (runs on Firefox, WebKit and a mobile viewport)' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC3' },
        { type: 'risk', description: 'R4' },
      ],
    },
    async ({ booking, data, dataFactory }) => {
      const quantity = 2;

      const { event, created } = await test.step('create an event and a booking (API)', async () => {
        const createdEvent = await booking.setup.createEvent(dataFactory.pinnedEvent(data.events));
        const createdBooking = await booking.setup.createBooking(createdEvent.id, { quantity });
        logger.info('Step done: booked through the API', { scenarioId: 'S16', bookingRef: createdBooking.bookingRef });
        return { event: createdEvent, created: createdBooking };
      });

      const card = await test.step('My Bookings lists the booking', async () => {
        const myBookings = await booking.ui.openMyBookings();
        const bookingCard = myBookings.booking(created.bookingRef);
        await expect(bookingCard.getRoot()).toBeVisible();
        return bookingCard;
      });

      await test.step('the card shows the same event, tickets, total and status', async () => {
        await expect(card.getEventTitle()).toHaveText(event.title);
        await expect(card.getTicketCount()).toContainText(`${quantity} tickets`);
        await expect(card.getTotalPrice()).toHaveText(formatDisplayedPrice(created.totalPrice));
        await expect(card.getStatus()).toHaveText('confirmed');
        logger.info('Step done: card content verified', { scenarioId: 'S16', bookingRef: created.bookingRef });
      });

      await test.step('the card structure and styling match the baseline', async () => {
        await expect(card.getRoot()).toMatchAriaSnapshot({ name: 'booking-card.aria.yml' });
        // Reference, id, title and dates change on every run
        await expect(card.getRoot()).toHaveScreenshot('booking-card.png', {
          mask: [
            card.getRoot().getByText(created.bookingRef),
            card.getRoot().getByTestId('booking-id'),
            card.getEventTitle(),
            card.getRoot().getByText(/📅|🗓/),
          ],
        });
        logger.info('Step done: card snapshots verified', { scenarioId: 'S16' });
      });
    },
  );
});
