import { test, expect } from '../../../fixtures/app';
import { formatDisplayedPrice, toCustomerDetails } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC2 - Total price is ticket price × number of tickets', () => {
  test.use({ testData: { events: 'conference', bookings: 'groupBooking' } });

  test(
    'S14 - the total on the confirmation equals the totalPrice the API stored for the same booking',
    {
      tag: ['@bookings', '@ui', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S14' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC2' },
        { type: 'risk', description: 'R1' },
      ],
    },
    async ({ booking, bookingsService, data }) => {
      const customer = toCustomerDetails(data.bookings);
      const quantity = Number(data.bookings.quantity);

      const event = await test.step('create the event to book against (API)', async () => {
        return booking.setup.createEvent(data.events);
      });

      const result = await test.step(`book ${quantity} tickets (UI)`, async () => {
        return booking.ui.bookTickets(event.id, customer, quantity);
      });

      await test.step('the confirmation shows the stored totalPrice and ticket count', async () => {
        const saved = await bookingsService.getBookingByRef(result.bookingRef);
        expect(saved.totalPrice).toBe(result.booking.totalPrice);
        const displayed = formatDisplayedPrice(saved.totalPrice);
        logger.debug('Totals', { posted: result.booking.totalPrice, stored: saved.totalPrice, displayed });
        await expect(result.eventPage.confirmation.getTotalPrice()).toHaveText(displayed);
        await expect(result.eventPage.confirmation.getTicketCount()).toHaveText(String(quantity));
        logger.info('Step done: UI total matches the API', { scenarioId: 'S14', bookingRef: result.bookingRef, totalPrice: saved.totalPrice, displayed });
      });
    },
  );
});
