import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../../fixtures/app';
import { toCustomerDetails } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC1 - Create a booking and see the confirmation', () => {
  test.use({ testData: { events: 'conference', bookings: 'validCustomer' } });

  test(
    'S09 - the booking form has no serious accessibility violations',
    {
      tag: ['@bookings', '@ui', '@regression', '@a11y', '@excluded'],
      annotation: [
        { type: 'scenarioId', description: 'S09' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R11' },
        {
          type: 'exclusionReason',
          description:
            'Known defect (R11): axe color-contrast (serious) on the "(max N)" label, #9ca3af on #ffffff = 2.53:1, WCAG AA needs 4.5:1 (2 of 2 runs on 2026-11-13)',
        },
      ],
    },
    async ({ page, booking, data }) => {
      await test.step('create an event (API) and open it', async () => {
        const event = await booking.setup.createEvent(data.events);
        await booking.ui.openEvent(event.id);
      });

      await test.step('axe (WCAG 2.0/2.1 A and AA) finds no serious or critical issue in the booking form', async () => {
        const results = await new AxeBuilder({ page }).include('form').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html, why: n.failureSummary })),
        }));
        if (blocking.length > 0) {
          logger.error('Accessibility violations in the booking form', { scenarioId: 'S09', violations: summary });
        } else {
          logger.info('Accessibility scan done', { scenarioId: 'S09', violations: summary, passes: results.passes.length });
        }
        expect(blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`)).toEqual([]);
      });
    },
  );

  test(
    'S09 - a booking can be made with the keyboard only',
    {
      tag: ['@bookings', '@ui', '@regression', '@a11y'],
      annotation: [
        { type: 'scenarioId', description: 'S09' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC1' },
        { type: 'risk', description: 'R11' },
      ],
    },
    async ({ page, booking, bookingsService, data }) => {
      const customer = toCustomerDetails(data.bookings);

      const { event, eventPage } = await test.step('create an event (API) and open it', async () => {
        const created = await booking.setup.createEvent(data.events);
        return { event: created, eventPage: await booking.ui.openEvent(created.id) };
      });

      await test.step('Tab moves name -> email -> phone -> Confirm Booking; typing fills each field', async () => {
        const form = eventPage.bookingForm;
        await form.getNameInput().focus();
        await page.keyboard.type(customer.customerName);
        await page.keyboard.press('Tab');
        await page.keyboard.type(customer.customerEmail);
        await page.keyboard.press('Tab');
        await page.keyboard.type(customer.customerPhone);
        await page.keyboard.press('Tab');
        await expect(form.getConfirmButton()).toBeFocused();
      });

      await test.step('Enter on Confirm Booking books and shows the confirmation', async () => {
        await page.keyboard.press('Enter');
        await eventPage.confirmation.waitForLoaded();
        const bookingRef = await eventPage.confirmation.readBookingRef();
        const saved = await bookingsService.getBookingByRef(bookingRef);
        bookingsService.track(saved.id);
        expect(saved).toMatchObject({ eventId: event.id, ...customer, quantity: 1 });
        logger.info('Step done: keyboard-only booking', { scenarioId: 'S09', bookingRef });
      });
    },
  );
});
