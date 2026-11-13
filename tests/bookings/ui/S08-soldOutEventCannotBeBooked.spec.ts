import { test, expect } from '../../../fixtures/app';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({ testData: { events: 'lastSeats' } });

  test(
    'S08 - a sold-out event says so and its booking form cannot be submitted',
    {
      tag: ['@bookings', '@ui', '@regression', '@visual'],
      annotation: [
        { type: 'scenarioId', description: 'S08' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'gap', description: 'G4' },
      ],
    },
    async ({ booking, eventsService, data }) => {
      const event = await test.step('create an event and book every seat (API)', async () => {
        const created = await booking.setup.createEvent(data.events);
        await booking.setup.createBooking(created.id, { quantity: created.availableSeats });
        expect(await eventsService.getAvailableSeats(created.id)).toBe(0);
        return created;
      });

      const eventPage = await test.step('open the event page', async () => {
        return booking.ui.openEvent(event.id);
      });

      await test.step('the page says SOLD OUT and every booking control is disabled', async () => {
        const form = eventPage.bookingForm;
        await expect(eventPage.getAvailableSeats()).toHaveText('SOLD OUT');
        await expect(form.getSoldOutButton()).toBeDisabled();
        await expect(form.getConfirmButton()).toHaveCount(0);
        await expect(form.getIncrementButton()).toBeDisabled();
        await expect(form.getDecrementButton()).toBeDisabled();
        await expect(form.getMaxQuantityLabel()).toHaveText('(max 0)');
        await expect(form.getRoot()).toMatchAriaSnapshot({ name: 'sold-out-form.aria.yml' });
        logger.info('Step done: sold-out state verified', { scenarioId: 'S08', eventId: event.id });
      });
    },
  );
});
