import { test, expect } from '../../../fixtures/app';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test(
    'S34 - when the seats run out after the page loaded, the page shows the API rejection and books nothing',
    {
      tag: ['@bookings', '@ui', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S34' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R2, R10' },
        { type: 'note', description: 'UI counterpart of the API test: the form allows the booking, the API rejects it' },
        { type: 'finding', description: 'U6: the page keeps showing the stale seat count until it is reloaded (FINDINGS.md)' },
      ],
    },
    async ({ page, booking, bookingsService, eventsService, dataFactory }) => {
      const { event, eventPage } = await test.step('open an event with 2 seats, then take both seats through the API', async () => {
        const created = await booking.setup.createEvent(dataFactory.event('lastSeats'));
        const opened = await booking.ui.openEvent(created.id);
        await booking.setup.createBooking(created.id, { quantity: created.availableSeats });
        expect(await eventsService.getAvailableSeats(created.id)).toBe(0);
        return { event: created, eventPage: opened };
      });

      const attempt = await test.step('book 1 ticket from the page that still offers seats', async () => {
        return booking.ui.attemptBookingOnOpenEventPage(dataFactory.customer(), 1);
      });

      await test.step("the API answers 400 and the page shows the API's message, no confirmation", async () => {
        const message = 'Only 0 seat(s) available, but 1 requested';
        expect(attempt.status).toBe(400);
        expect(attempt.body).toMatchObject({ success: false, error: message });
        await expect(eventPage.getToast(message)).toBeVisible();
        await expect(eventPage.confirmation.getHeading()).toBeHidden();
        await expect(eventPage.bookingForm.getConfirmButton()).toBeVisible();
      });

      await test.step('only the API booking exists; after a reload the event shows as sold out', async () => {
        expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(1);
        await page.reload();
        await expect(eventPage.getAvailableSeats()).toHaveText('SOLD OUT');
        logger.info('Step done: rejection shown and nothing booked', { scenarioId: 'S34', eventId: event.id, status: attempt.status });
      });
    },
  );
});
