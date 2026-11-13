import { test, expect } from '../../../fixtures/api';
import { ValidationErrorResponseSchema } from '../../../assertions';
import { buildBookingInput } from '../../../helpers/bookings';
import type { CreateBookingInput, ValidationErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const REQUIRED_FIELDS: (keyof CreateBookingInput)[] = ['eventId', 'customerName', 'customerEmail', 'customerPhone', 'quantity'];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'conference' } });

  for (const field of REQUIRED_FIELDS) {
    test(
      `S30 - a booking without ${field} is rejected with 400 naming ${field}`,
      {
        tag: ['@bookings', '@api', '@critical'],
        annotation: [
          { type: 'scenarioId', description: 'S30' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R7' },
        ],
      },
      async ({ bookingSetup, bookingsService, eventsService, data }) => {
        const event = await test.step('create an event (API)', async () => {
          return bookingSetup.createEvent(data.events);
        });

        const response = await test.step(`POST /bookings without ${field}`, async () => {
          const payload: Record<string, unknown> = { ...buildBookingInput(event.id) };
          delete payload[field];
          logger.debug('Payload', { missingField: field, payload });
          return bookingsService.requestBooking(payload);
        });

        await test.step(`400 with a validation detail for ${field}`, async () => {
          await expect(response).toHaveStatus(400);
          const body = (await response.json()) as ValidationErrorResponse;
          logger.debug('Response body', { body });
          expect(body).toMatchSchema(ValidationErrorResponseSchema);
          expect(body.details.map((detail) => detail.field)).toContain(field);
          logger.info('Step done: validation error names the field', { scenarioId: 'S30', field, details: body.details });
        });

        await test.step('no booking was created and no seat was taken', async () => {
          expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
          expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats);
        });
      },
    );
  }
});
