import { test, expect } from '../../../fixtures/api';
import { calculateExpectedTotal } from '../../../helpers/bookings';
import { BOOKING_REF_PATTERN } from '../../../services';
import type { ApiSuccess, Booking } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC2 - Total price is ticket price × number of tickets', () => {
  test(
    'S15 - a client-sent totalPrice, status or reference is ignored; the server calculates the booking',
    {
      tag: ['@bookings', '@api', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S15' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC2' },
        { type: 'risk', description: 'R1' },
      ],
    },
    async ({ bookingSetup, bookingsService, dataFactory }) => {
      const quantity = 2;
      const tampered = { totalPrice: 1, status: 'cancelled', bookingRef: 'X-HACKED', userId: 1 };

      const event = await test.step('create a priced event (API)', async () => {
        return bookingSetup.createEvent(dataFactory.event());
      });

      const booking = await test.step('POST a booking with client-calculated fields', async () => {
        const payload = { ...dataFactory.booking(event.id, { quantity }), ...tampered };
        logger.debug('Tampered payload', { payload });
        const response = await bookingsService.requestBooking(payload);
        await expect(response).toHaveStatus(201);
        const { data: created } = (await response.json()) as ApiSuccess<Booking>;
        logger.debug('Created booking', { booking: created });
        return created;
      });

      await test.step('the server ignored every client-sent field', async () => {
        const expectedTotal = calculateExpectedTotal(event.price, quantity);
        expect(Number(booking.totalPrice)).toBe(expectedTotal);
        expect(booking.status).toBe('confirmed');
        expect(booking.bookingRef).not.toBe(tampered.bookingRef);
        expect(booking.bookingRef).toMatch(BOOKING_REF_PATTERN);
        logger.info('Step done: server-side values verified', {
          scenarioId: 'S15',
          sentTotal: tampered.totalPrice,
          savedTotal: booking.totalPrice,
          expectedTotal,
          bookingRef: booking.bookingRef,
        });
      });
    },
  );
});
