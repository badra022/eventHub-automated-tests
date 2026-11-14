import { createHmac } from 'node:crypto';
import { test, expect } from '../../../fixtures/api';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

/** A well-formed JWT that expired in 2020, signed with a key the server does not know. */
function expiredForeignToken(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ userId: 1, email: 'expired@example.com', iat: 1577836800, exp: 1577840400 });
  const signature = createHmac('sha256', 'not-the-server-key').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const TOKENS: { label: string; token: string | null; note?: string }[] = [
  { label: 'no token', token: null },
  { label: 'a malformed token', token: 'not-a-jwt' },
  {
    label: 'an expired token',
    token: expiredForeignToken(),
    note: 'A truly expired server-signed token needs the signing key or a 7-day wait; this one is expired and foreign-signed',
  },
];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  for (const { label, token, note } of TOKENS) {
    test(
      `S37 - booking endpoints answer 401 to ${label}`,
      {
        tag: ['@bookings', '@api', '@critical', '@security'],
        annotation: [
          { type: 'scenarioId', description: 'S37' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R6' },
          ...(note ? [{ type: 'note', description: note }] : []),
        ],
      },
      async ({ bookingSetup, bookingsService, dataFactory }) => {
        const options = { token };

        const { event, booking } = await test.step('create an event and a booking as the owner (API)', async () => {
          const created = await bookingSetup.createEvent(dataFactory.event());
          return { event: created, booking: await bookingSetup.createBooking(created.id) };
        });

        await test.step(`every booking endpoint rejects ${label} with 401`, async () => {
          const statuses = {
            list: (await bookingsService.requestList({}, options)).status(),
            create: (await bookingsService.requestBooking(dataFactory.booking(event.id), options)).status(),
            getById: (await bookingsService.fetchBooking(booking.id, options)).status(),
            getByRef: (await bookingsService.fetchBookingByRef(booking.bookingRef, options)).status(),
            cancel: (await bookingsService.requestCancel(booking.id, options)).status(),
          };
          logger.info('Statuses without valid authentication', { scenarioId: 'S37', tokenCase: label, statuses });
          expect(statuses).toEqual({ list: 401, create: 401, getById: 401, getByRef: 401, cancel: 401 });
        });

        await test.step('the owner\'s booking is untouched and nothing new was created', async () => {
          expect((await bookingsService.getBooking(booking.id)).status).toBe('confirmed');
          expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(1);
          logger.info('Step done: unauthenticated calls changed nothing', { scenarioId: 'S37', tokenCase: label });
        });
      },
    );
  }
});
