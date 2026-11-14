import { test, expect } from '../../../fixtures/app';
import { calculateExpectedTotal } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

// Baselines show the price, so it comes from the kind (standard $1,500, lastSeats $500), never generated
const CASES = [
  { kind: 'standard', label: '10 tickets, the per-booking maximum', expectedMax: 10 },
  { kind: 'lastSeats', label: 'every seat left when fewer than 10 remain', expectedMax: 2 },
] as const;

for (const { kind, label, expectedMax } of CASES) {
  test.describe(`US-114 AC1 - Create a booking and see the confirmation (${kind})`, () => {
    test(
      `S02 - booking ${label} succeeds and takes that many seats`,
      {
        tag: ['@bookings', '@ui', '@critical', '@smoke', '@visual'],
        annotation: [
          { type: 'scenarioId', description: 'S02' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC1' },
          { type: 'risk', description: 'R1, R2' },
          { type: 'gap', description: 'G3: max = min(10, seats left)' },
        ],
      },
      async ({ booking, bookingsService, eventsService, dataFactory }) => {
        const customer = dataFactory.customer();

        const event = await test.step('create the event to book against (API)', async () => {
          const created = await booking.setup.createEvent(dataFactory.event(kind));
          logger.info('Step done: event ready', { scenarioId: 'S02', eventId: created.id, availableSeats: created.availableSeats });
          return created;
        });

        const eventPage = await test.step(`the form allows at most ${expectedMax} tickets`, async () => {
          const page = await booking.ui.openEvent(event.id);
          await expect(page.bookingForm.getMaxQuantityLabel()).toHaveText(`(max ${expectedMax})`);
          await expect(page.bookingForm.getDecrementButton()).toBeDisabled();
          return page;
        });

        await test.step(`at ${expectedMax} the + button is disabled and the summary shows the total`, async () => {
          const form = eventPage.bookingForm;
          await form.setQuantity(expectedMax);
          await expect(form.getQuantityValue()).toHaveText(String(expectedMax));
          await expect(form.getIncrementButton()).toBeDisabled();
          await expect(form.getDecrementButton()).toBeEnabled();
          await expect(form.getRoot()).toMatchAriaSnapshot({ name: `booking-form-at-max-${expectedMax}.aria.yml` });
          await expect(form.getRoot()).toHaveScreenshot(`booking-form-at-max-${expectedMax}.png`);
          logger.info('Step done: counter limits verified', { scenarioId: 'S02', expectedMax });
        });

        const { booking: created } = await test.step(`book ${expectedMax} tickets (UI)`, async () => {
          return booking.ui.bookOnOpenEventPage(customer, expectedMax);
        });

        await test.step(`the API holds ${expectedMax} tickets and the seats dropped by ${expectedMax}`, async () => {
          const saved = await bookingsService.getBooking(created.id);
          expect(saved.quantity).toBe(expectedMax);
          expect(Number(saved.totalPrice)).toBe(calculateExpectedTotal(event.price, expectedMax));
          const seatsAfter = await eventsService.getAvailableSeats(event.id);
          logger.debug('Seat accounting', { before: event.availableSeats, after: seatsAfter, booked: expectedMax });
          expect(seatsAfter).toBe(event.availableSeats - expectedMax);
          logger.info('Step done: booking and seats verified', { scenarioId: 'S02', bookingRef: saved.bookingRef, seatsAfter });
        });
      },
    );
  });
}
