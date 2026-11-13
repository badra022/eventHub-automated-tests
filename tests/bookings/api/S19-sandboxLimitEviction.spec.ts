import { test, expect } from '../../../fixtures/api';
import { buildBookingInput, buildEventInput } from '../../../helpers/bookings';
import type { ApiSuccess, Booking, BookingsService, Event, EventsService } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const SANDBOX_LIMIT = 9;

type SandboxServices = { eventsService: EventsService; bookingsService: BookingsService };

/** Empties the dedicated account, creates an event and fills the sandbox with 9 bookings; returns the oldest. */
async function fillSandbox({ eventsService, bookingsService }: SandboxServices, template: Record<string, unknown>) {
  const leftover = await bookingsService.listBookings({ limit: 100 });
  if (leftover.pagination.total > 0) {
    logger.warn('The sandbox-limit account still holds bookings from an earlier run; cancelling them', {
      scenarioId: 'S19',
      refs: leftover.data.map((b) => b.bookingRef),
    });
    for (const old of leftover.data) {
      await bookingsService.cancelBooking(old.id);
    }
  }
  expect((await bookingsService.listBookings()).pagination.total).toBe(0);

  const event = await eventsService.createEvent(buildEventInput(template));
  const bookings: Booking[] = [];
  for (let i = 0; i < SANDBOX_LIMIT; i++) {
    bookings.push(await bookingsService.createBooking(buildBookingInput(event.id)));
  }
  expect((await bookingsService.listBookings({ limit: 100 })).pagination.total).toBe(SANDBOX_LIMIT);
  logger.info('Sandbox filled to its limit', { scenarioId: 'S19', eventId: event.id, oldest: bookings[0].bookingRef });
  return { event, oldest: bookings[0] };
}

async function bookTenth(bookingsService: BookingsService, event: Event): Promise<ApiSuccess<Booking> & Record<string, unknown>> {
  const response = await bookingsService.requestBooking(buildBookingInput(event.id));
  await expect(response).toHaveStatus(201);
  return (await response.json()) as ApiSuccess<Booking> & Record<string, unknown>;
}

test.describe('US-114 AC3 - The booking appears in My Bookings (sandbox limit)', () => {
  // Both tests use the one dedicated account, so they must never run at the same time
  test.describe.configure({ mode: 'serial' });
  test.use({ testData: { events: 'conference' } });

  test(
    'S19 - a 10th booking in one sandbox replaces the oldest one; the user is not warned',
    {
      tag: ['@bookings', '@api', '@regression', '@needs-clarification'],
      annotation: [
        { type: 'scenarioId', description: 'S19' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC3' },
        { type: 'risk', description: 'T2' },
        {
          type: 'clarification',
          description: "G11: is the silent 9-booking eviction a product rule or a sandbox limit? Asserts today's behaviour (no warning)",
        },
        { type: 'account', description: 'Runs on the dedicated sandboxLimitUser (test-data/otherUsers.json), never on a worker account' },
      ],
    },
    async ({ sandboxLimitServices, data }) => {
      const { event, oldest } = await test.step(`fill the sandbox with ${SANDBOX_LIMIT} bookings`, async () => {
        return fillSandbox(sandboxLimitServices, data.events);
      });

      const tenth = await test.step('the 10th booking is accepted without any warning', async () => {
        const body = await bookTenth(sandboxLimitServices.bookingsService, event);
        logger.info('10th booking response', { scenarioId: 'S19', message: body.message, keys: Object.keys(body) });
        expect(body.message).toBe('Booking confirmed!');
        expect(Object.keys(body).sort()).toEqual(['data', 'message', 'success']);
        return body.data;
      });

      await test.step('the oldest booking was evicted and the sandbox still holds 9', async () => {
        const list = await sandboxLimitServices.bookingsService.listBookings({ limit: 100 });
        const refs = list.data.map((b) => b.bookingRef);
        logger.debug('Sandbox after the 10th booking', { total: list.pagination.total, refs });
        expect(list.pagination.total).toBe(SANDBOX_LIMIT);
        expect(refs).toContain(tenth.bookingRef);
        expect(refs).not.toContain(oldest.bookingRef);
        await expect(await sandboxLimitServices.bookingsService.fetchBooking(oldest.id)).toHaveStatus(404);
        logger.info('Step done: oldest booking evicted silently', { scenarioId: 'S19', evicted: oldest.bookingRef });
      });
    },
  );

  test(
    "S19 - the evicted booking's seat goes back to the event",
    {
      tag: ['@bookings', '@api', '@regression', '@excluded'],
      annotation: [
        { type: 'scenarioId', description: 'S19' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC3' },
        { type: 'risk', description: 'R2, T2' },
        {
          type: 'exclusionReason',
          description:
            'Known defect (R2, seat leak): after the 10th booking evicts the oldest, the event has 90 of 100 seats free while only 9 bookings exist; the evicted seat is never released (3 of 3 runs on 2026-11-13)',
        },
        { type: 'account', description: 'Runs on the dedicated sandboxLimitUser (test-data/otherUsers.json), never on a worker account' },
      ],
    },
    async ({ sandboxLimitServices, data }) => {
      const { event } = await test.step(`fill the sandbox with ${SANDBOX_LIMIT} bookings and add a 10th`, async () => {
        const filled = await fillSandbox(sandboxLimitServices, data.events);
        await bookTenth(sandboxLimitServices.bookingsService, filled.event);
        return filled;
      });

      await test.step('available seats match the 9 bookings that still exist', async () => {
        const seats = await sandboxLimitServices.eventsService.getAvailableSeats(event.id);
        const held = (await sandboxLimitServices.bookingsService.listBookings({ eventId: event.id, limit: 100 })).data.reduce((sum, b) => sum + b.quantity, 0);
        const accounting = { scenarioId: 'S19', totalSeats: event.availableSeats, seats, ticketsHeld: held };
        if (seats !== event.availableSeats - held) {
          logger.error('Seat leak: seats do not match the bookings that exist', accounting);
        } else {
          logger.info('Seat accounting after eviction', accounting);
        }
        expect(seats).toBe(event.availableSeats - held);
      });
    },
  );
});
