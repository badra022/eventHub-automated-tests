import { test, expect } from '../../../fixtures/app';
import { FIELD_RULE_CASES, buildCustomer, layersDisagree, toUiField } from '../../../helpers/bookings';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings (booking form side)', () => {
  test.use({ testData: { events: 'conference' } });

  for (const rule of FIELD_RULE_CASES) {
    const { label, field, value, uiError, clarification } = rule;
    test(
      `S32 - ${label} is ${uiError === null ? 'accepted' : 'rejected'} by the booking form`,
      {
        tag: ['@bookings', '@ui', '@critical', ...(clarification ? ['@needs-clarification'] : [])],
        annotation: [
          { type: 'scenarioId', description: 'S32' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R7' },
          { type: 'counterpart', description: 'tests/bookings/api/S32-fieldValidationRules.spec.ts checks the same value against POST /bookings' },
          ...(clarification ? [{ type: 'clarification', description: clarification }] : []),
        ],
      },
      async ({ booking, bookingsService, data }) => {
        const customer = buildCustomer({ [field]: value });

        const event = await test.step('create the event to book against (API) and open it', async () => {
          const created = await booking.setup.createEvent(data.events);
          await booking.ui.openEvent(created.id);
          return created;
        });

        if (uiError === null) {
          await test.step(`the form accepts ${label} and books`, async () => {
            const result = await booking.ui.bookOnOpenEventPage(customer, 1);
            expect((await bookingsService.getBooking(result.booking.id))[field]).toBe(value);
            logger.info('Step done: the form accepted the value', { scenarioId: 'S32', field, label, bookingRef: result.bookingRef });
          });
        } else {
          await test.step(`the form rejects ${label} with "${uiError}" and sends no booking`, async () => {
            const submission = await booking.ui.submitInvalidBookingForm(customer);
            await expect(submission.eventPage.bookingForm.getFieldError(toUiField(rule))).toHaveText(uiError);
            expect(submission.bookingRequestsSent()).toBe(0);
            expect((await bookingsService.listBookings({ eventId: event.id })).pagination.total).toBe(0);
            logger.info('Step done: the form rejected the value', { scenarioId: 'S32', field, label, uiError });
          });
        }

        if (layersDisagree(rule)) {
          logger.warn('The booking form and the API disagree on this value (verified by the API counterpart test)', {
            scenarioId: 'S32',
            field,
            label,
            uiError,
            apiStatus: rule.apiStatus,
          });
        }
      },
    );
  }
});
