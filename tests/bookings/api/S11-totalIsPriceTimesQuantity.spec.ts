import { test, expect } from '../../../fixtures/api';
import { buildBookingInput, calculateExpectedTotal } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const QUANTITIES = [1, 2, 5, 10];

test.describe('US-114 AC2 - Total price is ticket price × number of tickets', () => {
  test.use({ testData: { events: 'conference' } });

  for (const quantity of QUANTITIES) {
    test(
      `S11 - total is price × quantity for ${quantity} ticket(s)`,
      {
        tag: ['@bookings', '@api', '@critical', '@smoke'],
        annotation: [
          { type: 'scenarioId', description: 'S11' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC2' },
          { type: 'risk', description: 'R1' },
        ],
      },
      async ({ bookingSetup, bookingsService, data }) => {
        const event = await test.step('create a priced event (API)', async () => {
          const created = await bookingSetup.createEvent(data.events);
          logger.info('Step done: event ready', { scenarioId: 'S11', eventId: created.id, price: created.price });
          return created;
        });

        const booking = await test.step(`book ${quantity} ticket(s)`, async () => {
          const created = await bookingsService.createBooking(buildBookingInput(event.id, { quantity }));
          logger.info('Step done: booked', { scenarioId: 'S11', bookingRef: created.bookingRef, totalPrice: created.totalPrice });
          return created;
        });

        await test.step('the total equals price × quantity', async () => {
          const expectedTotal = calculateExpectedTotal(event.price, quantity);
          logger.debug('Total calculation', { price: event.price, quantity, expectedTotal, actual: booking.totalPrice });
          expect(Number(booking.totalPrice)).toBe(expectedTotal);
          expect(booking.quantity).toBe(quantity);
          logger.info('Step done: total verified', { scenarioId: 'S11', quantity, expectedTotal });
        });
      },
    );
  }
});
