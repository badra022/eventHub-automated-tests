import { test, expect } from '../../../fixtures/app';
import { toCustomerDetails } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({ testData: { events: 'conference', bookings: 'validCustomer' } });

  test(
    'S06 - refreshing or pressing Back after the confirmation does not create a second booking',
    {
      tag: ['@bookings', '@ui', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S06' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R8' },
      ],
    },
    async ({ page, booking, bookingsService, eventsService, data }) => {
      const { event, result } = await test.step('book 1 ticket through the UI', async () => {
        const created = await booking.setup.createEvent(data.events);
        return { event: created, result: await booking.ui.bookTickets(created.id, toCustomerDetails(data.bookings), 1) };
      });

      let bookingRequests = 0;
      page.on('request', (request) => {
        if (request.method() === 'POST' && /\/api\/bookings$/.test(request.url())) bookingRequests++;
      });

      await test.step('refresh: the page shows an empty form again, no confirmation is replayed', async () => {
        await page.reload();
        await result.eventPage.bookingForm.waitForLoaded();
        await expect(result.eventPage.confirmation.getHeading()).toBeHidden();
        await expect(result.eventPage.bookingForm.getConfirmButton()).toBeVisible();
      });

      await test.step('Back: the browser leaves the event page without resubmitting', async () => {
        await page.goBack();
        await page.waitForLoadState('networkidle');
      });

      await test.step('still one booking, one seat taken, no new booking request', async () => {
        const list = await bookingsService.listBookings({ eventId: event.id });
        logger.info('After refresh and Back', { scenarioId: 'S06', bookingRequests, bookings: list.pagination.total, url: page.url() });
        expect(bookingRequests).toBe(0);
        expect(list.data.map((b) => b.bookingRef)).toEqual([result.bookingRef]);
        expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats - 1);
      });
    },
  );
});
