import { test, expect } from '../../../fixtures/api';
import { expectBookingStillConfirmed } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const FORBIDDEN = [403, 404];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test(
    "S38 - user B cannot read or cancel user A's booking",
    {
      tag: ['@bookings', '@api', '@critical', '@security'],
      annotation: [
        { type: 'scenarioId', description: 'S38' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R6' },
        { type: 'observation', description: 'GET answers 403 while DELETE answers 404 for the same foreign booking' },
      ],
    },
    async ({ bookingSetup, bookingsService, eventsService, authUser, otherUser, dataFactory }) => {
      const asUserB = { token: otherUser.token };

      const { event, booking } = await test.step('user A creates an event and a booking (API)', async () => {
        const created = await bookingSetup.createEvent(dataFactory.event());
        const createdBooking = await bookingSetup.createBooking(created.id, { quantity: 2 });
        logger.info('Step done: user A booked', { scenarioId: 'S38', userA: authUser.id, userB: otherUser.id, bookingRef: createdBooking.bookingRef });
        return { event: created, booking: createdBooking };
      });
      const seatsBefore = await eventsService.getAvailableSeats(event.id);

      await test.step("user B cannot read the booking by id or by reference", async () => {
        const byId = await bookingsService.fetchBooking(booking.id, asUserB);
        const byRef = await bookingsService.fetchBookingByRef(booking.bookingRef, asUserB);
        expect(FORBIDDEN).toContain(byId.status());
        expect(FORBIDDEN).toContain(byRef.status());
        logger.info('Step done: user B cannot read the booking', { scenarioId: 'S38', byId: byId.status(), byRef: byRef.status() });
      });

      await test.step('user B cannot cancel the booking', async () => {
        const cancel = await bookingsService.requestCancel(booking.id, asUserB);
        expect(FORBIDDEN).toContain(cancel.status());
        logger.info('Step done: user B cannot cancel the booking', { scenarioId: 'S38', cancel: cancel.status() });
      });

      await test.step("user A's booking and the event's seats are unchanged", async () => {
        await expectBookingStillConfirmed(bookingsService, booking);
        expect(await eventsService.getAvailableSeats(event.id)).toBe(seatsBefore);
        logger.info('Step done: ownership enforced', { scenarioId: 'S38', bookingRef: booking.bookingRef });
      });
    },
  );
});
