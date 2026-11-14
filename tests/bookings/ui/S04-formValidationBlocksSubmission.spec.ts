import { test, expect } from '../../../fixtures/app';
import type { BookingField, CustomerDetails } from '../../../pages';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const MESSAGES: Record<BookingField, string> = {
  name: 'Name must be at least 2 chars',
  email: 'Enter a valid email',
  phone: 'Enter a valid 10-digit phone',
};

const CASES: { label: string; customer: CustomerDetails }[] = [
  { label: 'all fields empty', customer: { customerName: '', customerEmail: '', customerPhone: '' } },
  { label: 'every field invalid at once', customer: { customerName: 'A', customerEmail: 'x@y', customerPhone: '123' } },
];

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  for (const { label, customer } of CASES) {
    test(
      `S04 - submitting with ${label} shows every field's message and sends no booking`,
      {
        tag: ['@bookings', '@ui', '@regression'],
        annotation: [
          { type: 'scenarioId', description: 'S04' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC1' },
          { type: 'risk', description: 'R7' },
          { type: 'related', description: 'Single invalid fields are covered field by field in S32 (booking form side)' },
        ],
      },
      async ({ booking, bookingsService, dataFactory }) => {
        const event = await test.step('create an event (API) and open it', async () => {
          const created = await booking.setup.createEvent(dataFactory.event());
          await booking.ui.openEvent(created.id);
          return created;
        });

        await test.step(`submit with ${label}: each field shows its message`, async () => {
          const submission = await booking.ui.submitInvalidBookingForm(customer);
          for (const [field, message] of Object.entries(MESSAGES) as [BookingField, string][]) {
            await expect(submission.eventPage.bookingForm.getFieldError(field)).toHaveText(message);
          }
          expect(submission.bookingRequestsSent()).toBe(0);
        });

        await test.step('no booking exists for the event', async () => {
          expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
          logger.info('Step done: form blocked the submission', { scenarioId: 'S04', case: label });
        });
      },
    );
  }
});
