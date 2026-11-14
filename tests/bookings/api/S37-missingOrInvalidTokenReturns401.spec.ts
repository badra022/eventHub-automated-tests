import { createHmac } from 'node:crypto';
import { test, expect } from '../../../fixtures/api';
import type { AuthenticatedUser } from '../../../fixtures/auth';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
const sign = (unsigned: string, key: string) => createHmac('sha256', key).update(unsigned).digest('base64url');

/** A well-formed JWT that expired in 2020, signed with a key the server does not know. */
function expiredForeignToken(): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ userId: 1, email: 'expired@example.com', iat: 1577836800, exp: 1577840400 });
  return `${header}.${payload}.${sign(`${header}.${payload}`, 'not-the-server-key')}`;
}

/** Claims of a token that has not expired, so a rejection can only come from the signature check. */
function liveClaims(user: AuthenticatedUser): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return { ...decode(user.token.split('.')[1]), iat: now, exp: now + 3600 };
}

type TokenContext = { authUser: AuthenticatedUser; otherUser: AuthenticatedUser };

const TOKENS: { label: string; build: (ctx: TokenContext) => string | null; note?: string; security?: true }[] = [
  { label: 'no token', build: () => null },
  { label: 'a malformed token', build: () => 'not-a-jwt' },
  {
    label: 'an expired token',
    build: () => expiredForeignToken(),
    note: 'A truly expired server-signed token needs the signing key or a 7-day wait; this one is expired and foreign-signed',
  },
  {
    label: 'a live token signed with a foreign key',
    build: ({ authUser }) => {
      const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(liveClaims(authUser))}`;
      return `${unsigned}.${sign(unsigned, 'not-the-server-key')}`;
    },
    security: true,
  },
  {
    label: 'an unsigned token (alg "none")',
    build: ({ authUser }) => `${encode({ alg: 'none', typ: 'JWT' })}.${encode(liveClaims(authUser))}.`,
    security: true,
  },
  {
    label: "the owner's real token with another user's id in its payload",
    build: ({ authUser, otherUser }) => {
      const [header, payload, signature] = authUser.token.split('.');
      return `${header}.${encode({ ...decode(payload), userId: otherUser.id, email: otherUser.email })}.${signature}`;
    },
    security: true,
  },
];

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  for (const { label, build, note, security } of TOKENS) {
    test(
      `S37 - booking endpoints answer 401 to ${label}`,
      {
        tag: ['@bookings', '@api', '@critical', '@security'],
        annotation: [
          { type: 'scenarioId', description: 'S37' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R6' },
          ...(security ? [{ type: 'finding', description: 'P8: proves the server verifies the token signature and algorithm (FINDINGS.md)' }] : []),
          ...(note ? [{ type: 'note', description: note }] : []),
        ],
      },
      async ({ bookingSetup, bookingsService, dataFactory, authUser, otherUser }) => {
        const options = { token: build({ authUser, otherUser }) };

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
          logger.info('Statuses without valid authentication', { scenarioId: 'S37', credentialCase: label, statuses });
          expect(statuses).toEqual({ list: 401, create: 401, getById: 401, getByRef: 401, cancel: 401 });
        });

        await test.step('the owner\'s booking is untouched and nothing new was created', async () => {
          expect((await bookingsService.getBooking(booking.id)).status).toBe('confirmed');
          expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(1);
          logger.info('Step done: unauthenticated calls changed nothing', { scenarioId: 'S37', credentialCase: label });
        });
      },
    );
  }
});
