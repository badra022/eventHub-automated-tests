import { test, expect } from '../../../fixtures/app';
import { formatDisplayedPrice } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({ testData: { events: 'conference' } });

  test(
    'S03 - the ticket counter enables and disables its buttons at 1 and at the maximum, and the summary follows it',
    {
      tag: ['@bookings', '@ui', '@regression'],
      annotation: [
        { type: 'scenarioId', description: 'S03' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'gap', description: 'G3' },
        { type: 'related', description: 'S02 covers the state at the maximum and booking it; S03 covers the transitions' },
      ],
    },
    async ({ booking, data }) => {
      const event = await test.step('create an event with more than 10 seats (API) and open it', async () => {
        return booking.setup.createEvent(data.events);
      });
      const eventPage = await booking.ui.openEvent(event.id);
      const form = eventPage.bookingForm;

      await test.step('at 1: "−" disabled, "+" enabled, "(max 10)", summary for 1 ticket', async () => {
        await expect(form.getQuantityValue()).toHaveText('1');
        await expect(form.getDecrementButton()).toBeDisabled();
        await expect(form.getIncrementButton()).toBeEnabled();
        await expect(form.getMaxQuantityLabel()).toHaveText('(max 10)');
        await expect(form.getSummaryLine()).toHaveText(`${formatDisplayedPrice(event.price)} × 1 ticket`);
      });

      await test.step('"+" once: 2 tickets, "−" enabled, summary for 2 tickets', async () => {
        await form.getIncrementButton().click();
        await expect(form.getQuantityValue()).toHaveText('2');
        await expect(form.getDecrementButton()).toBeEnabled();
        await expect(form.getSummaryLine()).toHaveText(`${formatDisplayedPrice(event.price)} × 2 tickets`);
      });

      await test.step('"−" back to 1 disables "−" again', async () => {
        await form.getDecrementButton().click();
        await expect(form.getQuantityValue()).toHaveText('1');
        await expect(form.getDecrementButton()).toBeDisabled();
      });

      await test.step('up to 10: "+" disabled, clicking it keeps 10', async () => {
        await form.setQuantity(10);
        await expect(form.getIncrementButton()).toBeDisabled();
        await form.getIncrementButton().click({ force: true });
        await expect(form.getQuantityValue()).toHaveText('10');
        logger.info('Step done: counter transitions verified', { scenarioId: 'S03', eventId: event.id });
      });
    },
  );
});
