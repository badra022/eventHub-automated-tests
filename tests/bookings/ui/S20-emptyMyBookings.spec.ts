import { test, expect } from '../../../fixtures/app';
import { EventsPage } from '../../../pages';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC3 - The booking appears in My Bookings', () => {
  test(
    'S20 - a user with no bookings sees a clear empty state with a way to browse events',
    {
      tag: ['@bookings', '@ui', '@extended'],
      annotation: [
        { type: 'scenarioId', description: 'S20' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC3' },
      ],
    },
    async ({ page, booking, bookingsService }) => {
      await test.step("the worker account has no bookings (every test cleans up its own)", async () => {
        expect((await bookingsService.listBookings()).pagination.total).toBe(0);
      });

      const myBookings = await test.step('open My Bookings', async () => {
        return booking.ui.openMyBookings();
      });

      await test.step('the empty state explains there are no bookings and links to the events', async () => {
        await expect(myBookings.getEmptyState()).toBeVisible();
        await expect(page.getByText("You haven't booked any events yet. Browse upcoming events and grab your tickets!")).toBeVisible();
        await expect(myBookings.getBookingCards()).toHaveCount(0);
        await myBookings.getEmptyStateBrowseLink().click();
        await expect(page).toHaveURL(/\/events$/);
        await new EventsPage(page).waitForLoaded();
        logger.info('Step done: empty state verified', { scenarioId: 'S20' });
      });
    },
  );
});
