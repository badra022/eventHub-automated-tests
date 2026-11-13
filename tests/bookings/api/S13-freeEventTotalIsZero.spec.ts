import { test, expect } from '../../../fixtures/api';
import { BookingSchema } from '../../../assertions';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC2 - Total price is ticket price × number of tickets', () => {
  test.use({ testData: { events: 'freeWorkshop' } });

  test(
    'S13 - booking a free event (price 0) gives a total of 0',
    {
      tag: ['@bookings', '@api', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S13' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC2' },
        { type: 'risk', description: 'R1' },
        { type: 'gap', description: 'G7: free events are not mentioned in the story' },
      ],
    },
    async ({ bookingSetup, eventsService, data }) => {
      const quantity = 3;

      const event = await test.step('create a free event (API)', async () => {
        const created = await bookingSetup.createEvent(data.events);
        expect(Number(created.price)).toBe(0);
        return created;
      });

      const booking = await test.step(`book ${quantity} tickets`, async () => {
        return bookingSetup.createBooking(event.id, { quantity });
      });

      await test.step('the total is 0, the booking is confirmed and seats are taken', async () => {
        expect(booking).toMatchSchema(BookingSchema);
        expect(Number(booking.totalPrice)).toBe(0);
        expect(booking.status).toBe('confirmed');
        expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats - quantity);
        logger.info('Step done: free booking verified', { scenarioId: 'S13', bookingRef: booking.bookingRef, totalPrice: booking.totalPrice });
      });
    },
  );
});
