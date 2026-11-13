import { test, expect } from '../../../fixtures/app';
import { BookingSchema } from '../../../assertions';
import { calculateExpectedTotal, formatDisplayedPrice, toCustomerDetails } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC2 - Total price is ticket price × number of tickets', () => {
  test.use({ testData: { events: 'decimalPriceWorkshop', bookings: 'groupBooking' } });

  test(
    'S12 - a decimal price gives an exact total in the API; the UI shows it rounded to whole dollars',
    {
      tag: ['@bookings', '@ui', '@critical', '@needs-clarification'],
      annotation: [
        { type: 'scenarioId', description: 'S12' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC2' },
        { type: 'risk', description: 'R1' },
        {
          type: 'clarification',
          description: 'G7: the UI shows USD without decimals, so 299.97 is displayed as $300. Asserts the current behaviour until the PO decides',
        },
      ],
    },
    async ({ booking, bookingsService, data }) => {
      const customer = toCustomerDetails(data.bookings);
      const quantity = Number(data.bookings.quantity);

      const event = await test.step('create an event with a decimal price (API)', async () => {
        const created = await booking.setup.createEvent(data.events);
        logger.info('Step done: event ready', { scenarioId: 'S12', eventId: created.id, price: created.price });
        return created;
      });
      const expectedTotal = calculateExpectedTotal(event.price, quantity);

      const { bookingRef, eventPage } = await test.step(`book ${quantity} tickets (UI)`, async () => {
        return booking.ui.bookTickets(event.id, customer, quantity);
      });

      await test.step(`the API total is exactly ${expectedTotal}`, async () => {
        const saved = await bookingsService.getBookingByRef(bookingRef);
        logger.debug('Total calculation', { price: event.price, quantity, expectedTotal, saved: saved.totalPrice });
        expect(Number(saved.totalPrice)).toBe(expectedTotal);
        expect(saved).toMatchSchema(BookingSchema);
      });

      await test.step('the confirmation shows the total rounded to whole dollars', async () => {
        const displayed = formatDisplayedPrice(expectedTotal);
        await expect(eventPage.confirmation.getTotalPrice()).toHaveText(displayed);
        logger.info('Step done: totals verified', { scenarioId: 'S12', apiTotal: expectedTotal, displayed });
      });
    },
  );
});
