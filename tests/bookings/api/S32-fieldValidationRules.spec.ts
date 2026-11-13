import { test, expect } from '../../../fixtures/api';
import { ValidationErrorResponseSchema } from '../../../assertions';
import { FIELD_RULE_CASES, buildBookingInput, layersDisagree, toOverride } from '../../../helpers/bookings';
import type { ValidationErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'conference' } });

  for (const rule of FIELD_RULE_CASES) {
    const { label, field, apiStatus, clarification } = rule;
    test(
      `S32 - ${label} is ${apiStatus === 201 ? 'accepted' : 'rejected with 400'} by the API`,
      {
        tag: ['@bookings', '@api', '@critical', ...(clarification ? ['@needs-clarification'] : [])],
        annotation: [
          { type: 'scenarioId', description: 'S32' },
          { type: 'story', description: 'US-114' },
          { type: 'acceptanceCriteria', description: 'AC5' },
          { type: 'risk', description: 'R7' },
          { type: 'counterpart', description: 'tests/bookings/ui/S32-fieldValidationRulesInForm.spec.ts checks the same value in the booking form' },
          ...(clarification ? [{ type: 'clarification', description: clarification }] : []),
        ],
      },
      async ({ bookingSetup, bookingsService, data }) => {
        const event = await test.step('create an event (API)', async () => {
          return bookingSetup.createEvent(data.events);
        });

        const response = await test.step(`POST /bookings with ${label}`, async () => {
          const payload = buildBookingInput(event.id, toOverride(rule));
          logger.debug('Payload', { payload });
          return bookingsService.requestBooking(payload);
        });

        await test.step(`the API answers ${apiStatus}`, async () => {
          await expect(response).toHaveStatus(apiStatus);
          const body: unknown = await response.json();
          logger.debug('Response body', { body });
          if (apiStatus === 400) {
            expect(body).toMatchSchema(ValidationErrorResponseSchema);
            expect((body as ValidationErrorResponse).details.map((detail) => detail.field)).toContain(field);
          }
          if (layersDisagree(rule)) {
            logger.warn('The API and the booking form disagree on this value (verified by the UI counterpart test)', {
              scenarioId: 'S32',
              field,
              label,
              apiStatus,
              uiError: rule.uiError,
            });
          }
          logger.info('Step done: API field rule verified', { scenarioId: 'S32', field, label, apiStatus });
        });
      },
    );
  }
});
