import { test, expect } from '../../../fixtures/api';
import { expectBookingCancelled } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC4 - Cancel a booking', () => {
  test.use({ testData: { events: 'conference' } });

  test(
    'S23 - cancelling a booking gives its seats back to the event',
    {
      tag: ['@bookings', '@api', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S23' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R2' },
      ],
    },
    async ({ bookingSetup, bookingsService, eventsService, data }) => {
      const quantity = 3;

      const event = await test.step('create an event (API)', async () => {
        return bookingSetup.createEvent(data.events);
      });

      const booking = await test.step(`book ${quantity} tickets; seats drop by ${quantity}`, async () => {
        const created = await bookingSetup.createBooking(event.id, { quantity });
        const seatsAfterBooking = await eventsService.getAvailableSeats(event.id);
        logger.debug('Seats after booking', { before: event.availableSeats, after: seatsAfterBooking });
        expect(seatsAfterBooking).toBe(event.availableSeats - quantity);
        return created;
      });

      await test.step('cancel the booking', async () => {
        await bookingsService.cancelBooking(booking.id);
        await expectBookingCancelled(bookingsService, booking);
      });

      await test.step(`seats rise by ${quantity} again`, async () => {
        const seatsAfterCancel = await eventsService.getAvailableSeats(event.id);
        logger.debug('Seats after cancel', { expected: event.availableSeats, actual: seatsAfterCancel });
        expect(seatsAfterCancel).toBe(event.availableSeats);
        logger.info('Step done: seats restored', { scenarioId: 'S23', eventId: event.id, seatsAfterCancel });
      });
    },
  );
});
