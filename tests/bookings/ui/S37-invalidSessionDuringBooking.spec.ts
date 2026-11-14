import { test, expect } from '../../../fixtures/app';
import { LoginPage } from '../../../pages';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

/** Where the app keeps the session JWT (observed in the saved storage state) */
const TOKEN_KEY = 'eventhub_token';

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test(
    'S37 - when the session token is no longer valid at submit, the page sends the user to log in and books nothing',
    {
      tag: ['@bookings', '@ui', '@security', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S37' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R6, R10' },
        { type: 'note', description: 'UI counterpart of the API test: the API answers 401 and the page must not show a confirmation' },
      ],
    },
    async ({ page, booking, bookingsService, dataFactory }) => {
      const event = await test.step('open an event, then replace the session token with an invalid one', async () => {
        const created = await booking.setup.createEvent(dataFactory.event());
        await booking.ui.openEvent(created.id);
        // Only this test's browser context changes; the saved session in .auth/ stays valid
        await page.evaluate((key) => localStorage.setItem(key, 'invalid.token.value'), TOKEN_KEY);
        return created;
      });

      const attempt = await test.step('submit a valid booking', async () => {
        return booking.ui.attemptBookingOnOpenEventPage(dataFactory.customer(), 1);
      });

      await test.step('the API answers 401 and the page sends the user to the login page without the bad token', async () => {
        // The body is lost when the page navigates away at once; the API test of S37 checks the message
        expect(attempt.status).toBe(401);
        await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
        await expect(new LoginPage(page).getSignInButton()).toBeVisible();
        expect(await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)).toBeNull();
      });

      await test.step('no booking was created', async () => {
        expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
        logger.info('Step done: invalid session handled', { scenarioId: 'S37', eventId: event.id, status: attempt.status });
      });
    },
  );
});
