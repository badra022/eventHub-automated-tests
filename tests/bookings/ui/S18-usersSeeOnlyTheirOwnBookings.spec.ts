import { test, expect } from '../../../fixtures/app';
import { MyBookingsPage } from '../../../pages';
import { Logger } from '../../../utils/logger';
import { Navigation } from '../../../utils/navigation';

const logger = new Logger('Test');

test.describe('US-114 AC3 - The booking appears in My Bookings', () => {
  test(
    "S18 - user B does not see user A's booking, neither in GET /bookings nor in My Bookings",
    {
      tag: ['@bookings', '@ui', '@api', '@critical', '@security'],
      annotation: [
        { type: 'scenarioId', description: 'S18' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC3' },
        { type: 'risk', description: 'R6' },
      ],
    },
    async ({ booking, bookingsService, otherUser, storageStateFor, browser, envConfig, dataFactory }) => {
      const created = await test.step('user A creates an event and a booking (API)', async () => {
        const event = await booking.setup.createEvent(dataFactory.event());
        return booking.setup.createBooking(event.id);
      });

      await test.step("user A sees the booking in My Bookings (control)", async () => {
        const myBookings = await booking.ui.openMyBookings();
        await expect(myBookings.booking(created.bookingRef).getRoot()).toBeVisible();
      });

      await test.step("user B's GET /bookings does not contain it", async () => {
        const response = await bookingsService.requestList({ limit: 100 }, { token: otherUser.token });
        await expect(response).toHaveStatus(200);
        const refs = ((await response.json()) as { data: { bookingRef: string }[] }).data.map((b) => b.bookingRef);
        logger.debug("User B's bookings", { refs });
        expect(refs).not.toContain(created.bookingRef);
      });

      await test.step("user B's My Bookings does not show it", async () => {
        const contextB = await browser.newContext({ storageState: await storageStateFor('userB') });
        try {
          const pageB = await contextB.newPage();
          const myBookingsB = new MyBookingsPage(pageB);
          await new Navigation(pageB, { appBaseUrl: envConfig.APP_BASE_URL }).toMyBookingsPage();
          await myBookingsB.waitForLoaded();
          // Wait until the list has rendered (cards or the empty state) before checking absence
          await expect(myBookingsB.getBookingCards().first().or(myBookingsB.getEmptyState())).toBeVisible();
          await expect(myBookingsB.booking(created.bookingRef).getRoot()).toHaveCount(0);
        } finally {
          await contextB.close();
        }
        logger.info('Step done: bookings are isolated per user', { scenarioId: 'S18', bookingRef: created.bookingRef, userB: otherUser.id });
      });
    },
  );
});
