import { test, expect } from '../../../fixtures/app';
import { expectBookingCancelled } from '../../../helpers/bookings';
import { EventDetailPage } from '../../../pages';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test(
    'S40 - deleting an event also removes its bookings, and its page shows a clear "Event not found"',
    {
      tag: ['@bookings', '@ui', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S40' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R13' },
        { type: 'gap', description: 'G10: users are not told that their booking disappeared with the event' },
      ],
    },
    async ({ page, booking, bookingsService, eventsService, navigator, dataFactory }) => {
      const { event, created } = await test.step('create an event and a booking (API)', async () => {
        const createdEvent = await booking.setup.createEvent(dataFactory.event());
        return { event: createdEvent, created: await booking.setup.createBooking(createdEvent.id, { quantity: 2 }) };
      });

      await test.step('delete the event (API)', async () => {
        await eventsService.deleteEvent(event.id);
      });

      await test.step('the booking is gone from the API', async () => {
        await expectBookingCancelled(bookingsService, created);
        expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
      });

      await test.step('the event page shows "Event not found" with a way back to the events', async () => {
        await navigator.toEventPage(event.id);
        const eventPage = new EventDetailPage(page);
        await expect(eventPage.getNotFoundHeading()).toBeVisible();
        await expect(page.getByText("The event you're looking for doesn't exist or has been removed.")).toBeVisible();
        await expect(eventPage.getNotFoundBrowseLink()).toHaveAttribute('href', '/events');
      });

      await test.step('My Bookings no longer lists the booking', async () => {
        const myBookings = await booking.ui.openMyBookings();
        await expect(myBookings.getEmptyState().or(myBookings.getBookingCards().first())).toBeVisible();
        await expect(myBookings.booking(created.bookingRef).getRoot()).toHaveCount(0);
        logger.info('Step done: deleted event handled', { scenarioId: 'S40', eventId: event.id, bookingRef: created.bookingRef });
      });
    },
  );
});
