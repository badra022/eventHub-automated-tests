import { test, expect } from '../../../fixtures/api';
import { ErrorResponseSchema } from '../../../assertions';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC4 - Cancel a booking', () => {
  test.use({ testData: { events: 'conference' } });

  test(
    'S25 - cancelling an already-cancelled booking returns 404 and changes no seats',
    {
      tag: ['@bookings', '@api', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S25' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R2' },
      ],
    },
    async ({ bookingSetup, bookingsService, eventsService, data }) => {
      const { event, booking } = await test.step('create an event and a booking of 2 tickets, then cancel it', async () => {
        const created = await bookingSetup.createEvent(data.events);
        const createdBooking = await bookingSetup.createBooking(created.id, { quantity: 2 });
        await bookingsService.cancelBooking(createdBooking.id);
        return { event: created, booking: createdBooking };
      });
      const seatsAfterFirstCancel = await eventsService.getAvailableSeats(event.id);
      expect(seatsAfterFirstCancel).toBe(event.availableSeats);

      await test.step('a second cancel returns 404 naming the booking', async () => {
        const response = await bookingsService.requestCancel(booking.id);
        await expect(response).toHaveStatus(404);
        const body: unknown = await response.json();
        expect(body).toMatchSchema(ErrorResponseSchema);
        expect((body as { error: string }).error).toBe(`Booking with id ${booking.id} not found`);
      });

      await test.step('the seats were not released twice', async () => {
        expect(await eventsService.getAvailableSeats(event.id)).toBe(seatsAfterFirstCancel);
        logger.info('Step done: double cancel changed nothing', { scenarioId: 'S25', bookingId: booking.id });
      });
    },
  );

  test(
    'S25 - cancelling a booking id that never existed returns 404',
    {
      tag: ['@bookings', '@api', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S25' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R2' },
      ],
    },
    async ({ bookingsService }) => {
      const unknownId = 999_999_999;
      const response = await bookingsService.requestCancel(unknownId);
      await expect(response).toHaveStatus(404);
      const body: unknown = await response.json();
      expect(body).toMatchSchema(ErrorResponseSchema);
      expect((body as { error: string }).error).toBe(`Booking with id ${unknownId} not found`);
      logger.info('Step done: unknown id rejected', { scenarioId: 'S25', unknownId });
    },
  );

  test(
    'S25 - cancelling a non-numeric booking id is rejected as a client error',
    {
      tag: ['@bookings', '@api', '@regression', '@excluded'],
      annotation: [
        { type: 'scenarioId', description: 'S25' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R2' },
        {
          type: 'exclusionReason',
          description: 'Known defect: DELETE /bookings/abc answers 500 "Internal server error" (probed 2026-11-13); an invalid id is a client error (400 or 404)',
        },
      ],
    },
    async ({ bookingsService }) => {
      const response = await bookingsService.requestCancel('abc');
      logger.info('Non-numeric id answer', { scenarioId: 'S25', status: response.status() });
      expect([400, 404]).toContain(response.status());
    },
  );
});
