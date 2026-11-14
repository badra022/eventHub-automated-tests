import { test, expect } from '../../../fixtures/app';
import { formatDisplayedPrice } from '../../../helpers/bookings';
import { BOOKING_REF_PATTERN } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {

  test(
    'S01 - booking 1 ticket shows a confirmation with the reference, customer, tickets and total',
    {
      tag: ['@bookings', '@ui', '@critical', '@smoke', '@cross-browser'],
      annotation: [
        { type: 'scenarioId', description: 'S01' },
        { type: 'alsoCovers', description: 'S41 (runs on Firefox, WebKit and a mobile viewport)' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R12' },
      ],
    },
    async ({ booking, bookingsService, eventsService, dataFactory }) => {
      const customer = dataFactory.customer();
      logger.debug('Customer used for the booking', { ...customer });

      const event = await test.step('create the event to book against (API)', async () => {
        const created = await booking.setup.createEvent(dataFactory.event());
        logger.info('Step done: event ready', { scenarioId: 'S01', eventId: created.id, availableSeats: created.availableSeats });
        return created;
      });

      const { bookingRef, eventPage, requestBody } = await test.step('book 1 ticket from the event page (UI)', async () => {
        const result = await booking.ui.bookTickets(event.id, customer, 1);
        logger.info('Step done: booked through the UI', { scenarioId: 'S01', bookingRef: result.bookingRef });
        return result;
      });

      await test.step('the page sent exactly the event, customer and quantity, as numbers where expected', async () => {
        logger.debug('Booking request the page sent', { requestBody });
        // Exact match: no extra fields (e.g. a price computed in the browser) and no string-typed numbers
        expect(requestBody).toStrictEqual({
          eventId: event.id,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          customerPhone: customer.customerPhone,
          quantity: 1,
        });
        logger.info('Step done: request body verified', { scenarioId: 'S01' });
      });

      await test.step('the confirmation shows the reference, customer, tickets and total', async () => {
        const confirmation = eventPage.confirmation;
        const expectedTotal = formatDisplayedPrice(event.price);
        logger.debug('Expected confirmation values', { bookingRef, customerName: customer.customerName, tickets: '1', expectedTotal });
        expect(bookingRef).toMatch(BOOKING_REF_PATTERN);
        await expect(confirmation.getCustomerName()).toHaveText(customer.customerName);
        await expect(confirmation.getTicketCount()).toHaveText('1');
        await expect(confirmation.getTotalPrice()).toHaveText(expectedTotal);
        logger.info('Step done: confirmation verified', { scenarioId: 'S01', bookingRef, expectedTotal });
      });

      await test.step('the API holds the same booking and one seat was taken', async () => {
        const saved = await bookingsService.getBookingByRef(bookingRef);
        const expectedSeats = event.availableSeats - 1;
        logger.debug('Booking saved by the API', { saved });
        expect(saved).toMatchObject({
          eventId: event.id,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          customerPhone: customer.customerPhone,
          quantity: 1,
          totalPrice: event.price,
          status: 'confirmed',
        });
        const seatsAfter = await eventsService.getAvailableSeats(event.id);
        logger.debug('Seat accounting', { before: event.availableSeats, after: seatsAfter, expected: expectedSeats });
        expect(seatsAfter).toBe(expectedSeats);
        logger.info('Step done: API booking and seats verified', { scenarioId: 'S01', bookingId: saved.id, seatsAfter });
      });
    },
  );
});
