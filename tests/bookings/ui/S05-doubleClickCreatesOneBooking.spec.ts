import { test, expect } from '../../../fixtures/app';
import { toCustomerDetails } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({ testData: { events: 'conference', bookings: 'validCustomer' } });

  test(
    'S05 - double-clicking Confirm Booking creates only one booking',
    {
      tag: ['@bookings', '@ui', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S05' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R8' },
        { type: 'gap', description: 'G9' },
      ],
    },
    async ({ page, booking, bookingsService, eventsService, data }) => {
      let bookingRequests = 0;
      page.on('request', (request) => {
        if (request.method() === 'POST' && /\/api\/bookings$/.test(request.url())) bookingRequests++;
      });

      const { event, eventPage } = await test.step('create an event (API) and fill the form', async () => {
        const created = await booking.setup.createEvent(data.events);
        const opened = await booking.ui.openEvent(created.id);
        await opened.bookingForm.fillCustomer(toCustomerDetails(data.bookings));
        return { event: created, eventPage: opened };
      });

      await test.step('double-click Confirm Booking', async () => {
        await eventPage.bookingForm.getConfirmButton().dblclick();
        await eventPage.confirmation.waitForLoaded();
        await page.waitForLoadState('networkidle');
      });

      await test.step('one request, one booking, one seat taken', async () => {
        const list = await bookingsService.listBookings({ eventId: event.id });
        list.data.forEach((b) => bookingsService.track(b.id));
        logger.info('Double-click outcome', { scenarioId: 'S05', bookingRequests, bookings: list.pagination.total });
        expect(bookingRequests).toBe(1);
        expect(list.pagination.total).toBe(1);
        expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats - 1);
      });
    },
  );
});
