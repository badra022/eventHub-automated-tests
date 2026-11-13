import { test, expect } from '../../../fixtures/api';
import { ErrorResponseSchema } from '../../../assertions';
import { buildBookingInput } from '../../../helpers/bookings';
import type { ErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'lastSeats' } });

  test(
    'S34 - asking for more tickets than seats left returns 400, creates nothing and keeps the seats',
    {
      tag: ['@bookings', '@api', '@critical'],
      annotation: [
        { type: 'scenarioId', description: 'S34' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R2' },
        { type: 'gap', description: 'G4' },
      ],
    },
    async ({ bookingSetup, bookingsService, eventsService, data }) => {
      const event = await test.step('create an event with very few seats (API)', async () => {
        const created = await bookingSetup.createEvent(data.events);
        logger.info('Step done: event ready', { scenarioId: 'S34', eventId: created.id, availableSeats: created.availableSeats });
        return created;
      });
      const requested = event.availableSeats + 1;

      const response = await test.step(`request ${requested} tickets for ${event.availableSeats} seats`, async () => {
        return bookingsService.requestBooking(buildBookingInput(event.id, { quantity: requested }));
      });

      await test.step('400 with a message that names the seats left and the seats requested', async () => {
        await expect(response).toHaveStatus(400);
        const body = (await response.json()) as ErrorResponse;
        logger.debug('Response body', { body });
        expect(body).toMatchSchema(ErrorResponseSchema);
        expect(body.error).toBe(`Only ${event.availableSeats} seat(s) available, but ${requested} requested`);
      });

      await test.step('no booking was created and the seats are unchanged', async () => {
        expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
        expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats);
        logger.info('Step done: nothing changed', { scenarioId: 'S34', eventId: event.id });
      });
    },
  );
});
