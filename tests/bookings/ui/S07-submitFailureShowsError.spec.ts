import { test, expect } from '../../../fixtures/app';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const FAILURES = [
  { label: 'the server answers 500', expectedMessage: 'Internal server error', mode: 'server error' as const },
  { label: 'the network request fails', expectedMessage: 'Network Error', mode: 'network failure' as const },
];

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  for (const { label, expectedMessage, mode } of FAILURES) {
    test(
      `S07 - when ${label}, the page shows an error and no confirmation`,
      {
        tag: ['@bookings', '@ui', '@regression'],
        annotation: [
          { type: 'scenarioId', description: 'S07' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC1' },
          { type: 'risk', description: 'R10' },
          { type: 'note', description: 'The messages are the raw server/axios texts; whether they are user-friendly enough is in FINDINGS.md' },
        ],
      },
      async ({ page, booking, bookingsService, dataFactory }) => {
        const { event, eventPage } = await test.step(`create an event (API), make POST /bookings fail (${mode}), open the event`, async () => {
          const created = await booking.setup.createEvent(dataFactory.event());
          await page.route(/\/api\/bookings$/, (route) => {
            if (route.request().method() !== 'POST') return route.continue();
            return mode === 'server error'
              ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Internal server error' }) })
              : route.abort('failed');
          });
          return { event: created, eventPage: await booking.ui.openEvent(created.id) };
        });

        await test.step('submit a valid form', async () => {
          await eventPage.bookingForm.fillCustomer(dataFactory.customer());
          await eventPage.bookingForm.submit();
        });

        await test.step(`"${expectedMessage}" is shown, the form stays, no confirmation`, async () => {
          await expect(eventPage.getToast(expectedMessage)).toBeVisible();
          await expect(eventPage.confirmation.getHeading()).toBeHidden();
          await expect(eventPage.bookingForm.getConfirmButton()).toBeVisible();
        });

        await test.step('no booking was created', async () => {
          expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
          logger.info('Step done: failure handled', { scenarioId: 'S07', mode, message: expectedMessage });
        });
      },
    );
  }
});
