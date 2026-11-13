import { test, expect } from '../../../fixtures/app';
import { toCustomerDetails } from '../../../helpers/bookings';
import { EventsPage, MyBookingsPage } from '../../../pages';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({ testData: { events: 'conference', bookings: 'validCustomer' } });

  test(
    'S10 - "View My Bookings" on the confirmation opens My Bookings with the new booking',
    {
      tag: ['@bookings', '@ui', '@extended'],
      annotation: [
        { type: 'scenarioId', description: 'S10' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
      ],
    },
    async ({ page, booking, data }) => {
      const result = await test.step('book 1 ticket through the UI', async () => {
        const event = await booking.setup.createEvent(data.events);
        return booking.ui.bookTickets(event.id, toCustomerDetails(data.bookings), 1);
      });

      await test.step('the link opens /bookings and lists the booking', async () => {
        await result.eventPage.confirmation.clickViewMyBookings();
        await expect(page).toHaveURL(/\/bookings$/);
        const myBookings = new MyBookingsPage(page);
        await myBookings.waitForLoaded();
        await expect(myBookings.booking(result.bookingRef).getRoot()).toBeVisible();
        logger.info('Step done: View My Bookings works', { scenarioId: 'S10', bookingRef: result.bookingRef });
      });
    },
  );

  test(
    'S10 - "Browse More Events" on the confirmation opens the events list',
    {
      tag: ['@bookings', '@ui', '@extended'],
      annotation: [
        { type: 'scenarioId', description: 'S10' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
      ],
    },
    async ({ page, booking, data }) => {
      const result = await test.step('book 1 ticket through the UI', async () => {
        const event = await booking.setup.createEvent(data.events);
        return booking.ui.bookTickets(event.id, toCustomerDetails(data.bookings), 1);
      });

      await test.step('the link opens /events', async () => {
        await result.eventPage.confirmation.clickBrowseMoreEvents();
        await expect(page).toHaveURL(/\/events$/);
        await new EventsPage(page).waitForLoaded();
        logger.info('Step done: Browse More Events works', { scenarioId: 'S10' });
      });
    },
  );
});
