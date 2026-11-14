import { test, expect } from '../../../fixtures/app';
import { expectBookingCancelled } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC4 - Cancel a booking', () => {
  test(
    'S21 - cancelling from My Bookings asks for confirmation, shows a success message and removes the booking',
    {
      tag: ['@bookings', '@ui', '@critical', '@smoke', '@visual', '@cross-browser'],
      annotation: [
        { type: 'scenarioId', description: 'S21' },
        { type: 'alsoCovers', description: 'S41 (runs on Firefox, WebKit and a mobile viewport)' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC4' },
        { type: 'risk', description: 'R5' },
        { type: 'gap', description: 'G5: today a cancelled booking is deleted, not kept as Cancelled' },
      ],
    },
    async ({ booking, bookingsService, eventsService, dataFactory }) => {
      const { event, created } = await test.step('create an event and a booking (API)', async () => {
        const createdEvent = await booking.setup.createEvent(dataFactory.event());
        return { event: createdEvent, created: await booking.setup.createBooking(createdEvent.id) };
      });

      const myBookings = await test.step('open My Bookings and click Cancel Booking', async () => {
        const page = await booking.ui.openMyBookings();
        await page.booking(created.bookingRef).clickCancel();
        return page;
      });

      await test.step('the confirmation dialog names the booking and the seats it releases', async () => {
        const dialog = myBookings.confirmDialog;
        await expect(dialog.getRoot()).toBeVisible();
        await expect(dialog.getTitle()).toHaveText('Cancel this booking?');
        await expect(dialog.getMessage()).toHaveText(
          `This will cancel ${created.bookingRef} and release ${created.quantity} seat(s) back to the event. This action cannot be undone.`,
        );
        await expect(dialog.getRoot()).toMatchAriaSnapshot({ name: 'cancel-dialog.aria.yml' });
        await expect(dialog.getRoot()).toHaveScreenshot('cancel-dialog.png', { mask: [dialog.getMessage()] });
        logger.info('Step done: dialog verified', { scenarioId: 'S21', bookingRef: created.bookingRef });
      });

      await test.step('confirming shows a success message and removes the card', async () => {
        await myBookings.confirmDialog.confirm();
        await expect(myBookings.getCancelledMessage()).toBeVisible();
        await expect(myBookings.booking(created.bookingRef).getRoot()).toHaveCount(0);
        logger.info('Step done: cancelled in the UI', { scenarioId: 'S21', bookingRef: created.bookingRef });
      });

      await test.step('the API no longer has the booking and the seat is back', async () => {
        await expectBookingCancelled(bookingsService, created);
        expect(await eventsService.getAvailableSeats(event.id)).toBe(event.availableSeats);
      });
    },
  );
});
