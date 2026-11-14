import { test, expect } from '../../../fixtures/app';
import { expectBookingStillConfirmed } from '../../../helpers/bookings';
import type { DialogDismissal } from '../../../pages';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

const DISMISSALS: DialogDismissal[] = ['cancel button', 'close button', 'Escape key'];

test.describe('US-114 AC4 - Cancel a booking', () => {
  for (const how of DISMISSALS) {
    test(
      `S22 - closing the cancel dialog with the ${how} leaves the booking unchanged`,
      {
        tag: ['@bookings', '@ui', '@regression'],
        annotation: [
          { type: 'scenarioId', description: 'S22' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC4' },
          { type: 'risk', description: 'R5' },
        ],
      },
      async ({ booking, bookingsService, eventsService, dataFactory }) => {
        const { event, created } = await test.step('create an event and a booking of 2 tickets (API)', async () => {
          const createdEvent = await booking.setup.createEvent(dataFactory.event());
          return { event: createdEvent, created: await booking.setup.createBooking(createdEvent.id, { quantity: 2 }) };
        });
        const seatsBefore = await eventsService.getAvailableSeats(event.id);

        const myBookings = await test.step(`open the cancel dialog and close it with the ${how}`, async () => {
          const page = await booking.ui.openMyBookings();
          await page.booking(created.bookingRef).clickCancel();
          await page.confirmDialog.dismiss(how);
          await expect(page.confirmDialog.getRoot()).toBeHidden();
          return page;
        });

        await test.step('the booking is still listed and confirmed, and the seats are unchanged', async () => {
          await expect(myBookings.booking(created.bookingRef).getStatus()).toHaveText('confirmed');
          await expect(myBookings.getCancelledMessage()).toBeHidden();
          await expectBookingStillConfirmed(bookingsService, created);
          expect(await eventsService.getAvailableSeats(event.id)).toBe(seatsBefore);
          logger.info('Step done: dismissing the dialog changed nothing', { scenarioId: 'S22', how, bookingRef: created.bookingRef });
        });
      },
    );
  }
});
