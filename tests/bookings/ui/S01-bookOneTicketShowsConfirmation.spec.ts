import { test, expect } from '../../../fixtures/app';
import { formatDisplayedPrice, toCustomerDetails } from '../../../helpers/bookings';
import { BOOKING_REF_PATTERN } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({
    testData: { events: 'conference', bookings: 'validCustomer' },
  });

  test(
    'S01 - booking 1 ticket shows a confirmation with the reference, customer, tickets and total',
    {
      tag: ['@bookings', '@ui', '@critical', '@smoke'],
      annotation: [
        { type: 'scenarioId', description: 'S01' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R12' },
      ],
    },
    async ({ booking, bookingsService, eventsService, data }) => {
      const customer = toCustomerDetails(data.bookings);

      const event = await test.step('create the event to book against (API)', async () => {
        return booking.setup.createEvent(data.events);
      });

      const { bookingRef, eventPage } = await test.step('book 1 ticket from the event page (UI)', async () => {
        return booking.ui.bookTickets(event.id, customer, 1);
      });

      await test.step('the confirmation shows the reference, customer, tickets and total', async () => {
        const confirmation = eventPage.confirmation;
        expect(bookingRef).toMatch(BOOKING_REF_PATTERN);
        await expect(confirmation.getCustomerName()).toHaveText(customer.customerName);
        await expect(confirmation.getTicketCount()).toContainText('1');
        await expect(confirmation.getTotalPrice()).toContainText(formatDisplayedPrice(event.price));
        logger.info('Confirmation verified', { scenarioId: 'S01', bookingRef });
      });

      await test.step('the API holds the same booking and one seat was taken', async () => {
        const saved = await bookingsService.getBookingByRef(bookingRef);
        expect(saved).toMatchObject({
          eventId: event.id,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          quantity: 1,
          totalPrice: event.price,
          status: 'confirmed',
        });
        expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats - 1);
      });
    },
  );
});
