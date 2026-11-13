import { test, expect } from '../../../fixtures/api';
import { buildBookingInput } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const PARALLEL_REQUESTS = 6;

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'lastSeats' } });

  test(
    `S35 - ${PARALLEL_REQUESTS} parallel bookings for the last seats sell exactly the seats left`,
    {
      tag: ['@bookings', '@api', '@critical', '@excluded'],
      annotation: [
        { type: 'scenarioId', description: 'S35' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R3' },
        {
          type: 'exclusionReason',
          description:
            'Known defect (R3, overbooking): 6 parallel single-ticket bookings for a 2-seat event return 4-6 x 201 (3 of 3 runs on 2026-11-13); seat reservation is not atomic',
        },
      ],
    },
    async ({ bookingSetup, bookingsService, eventsService, data }) => {
      const event = await test.step('create an event with very few seats (API)', async () => {
        return bookingSetup.createEvent(data.events);
      });
      const seats = event.availableSeats;

      const responses = await test.step(`fire ${PARALLEL_REQUESTS} single-ticket bookings at once`, async () => {
        const all = await Promise.all(
          Array.from({ length: PARALLEL_REQUESTS }, () => bookingsService.requestBooking(buildBookingInput(event.id))),
        );
        logger.info('Step done: parallel requests answered', { scenarioId: 'S35', statuses: all.map((r) => r.status()) });
        return all;
      });

      await test.step(`exactly ${seats} succeed, the rest get 400, and the seats match the bookings`, async () => {
        const statuses = responses.map((response) => response.status());
        const availableSeats = await eventsService.getAvailableSeats(event.id);
        const listed = await bookingsService.listBookings({ eventId: event.id });
        const ticketsSold = listed.data.reduce((sum, b) => sum + b.quantity, 0);
        const accounting = { totalSeats: seats, succeeded: statuses.filter((s) => s === 201).length, ticketsSold, availableSeats };
        if (accounting.succeeded > seats || availableSeats < 0) {
          logger.error('Overbooking: more tickets sold than seats', { scenarioId: 'S35', ...accounting, refs: listed.data.map((b) => b.bookingRef) });
        } else {
          logger.info('Seat accounting', { scenarioId: 'S35', ...accounting });
        }

        expect(statuses.filter((status) => status === 201)).toHaveLength(seats);
        expect(statuses.filter((status) => status === 400)).toHaveLength(PARALLEL_REQUESTS - seats);
        expect(availableSeats).toBe(0);
        expect(ticketsSold).toBe(seats);
      });
    },
  );
});
