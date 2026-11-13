import { test, expect } from '../../../fixtures/api';
import { ValidationErrorResponseSchema } from '../../../assertions';
import { buildEventInput } from '../../../helpers/bookings';
import type { ValidationErrorResponse } from '../../../services';
import { Logger } from '../../../utils/logger';

const logger = new Logger('Test');

test.describe('US-114 AC5 - The same works through POST /api/bookings', () => {
  test.use({ testData: { events: 'pastEvent' } });

  test(
    'S36 - an event dated in the past cannot be created, so it cannot be booked',
    {
      tag: ['@bookings', '@api', '@regression', '@needs-clarification'],
      annotation: [
        { type: 'scenarioId', description: 'S36' },
        { type: 'story', description: 'US-114' },
        { type: 'acceptanceCriteria', description: 'AC5' },
        { type: 'risk', description: 'R9' },
        {
          type: 'clarification',
          description:
            'G10: POST /events rejects past dates, so a past custom event cannot exist. The featured shared events are already past (e.g. 2026-10-20) and still bookable; not automated because tests must not depend on shared events (see FINDINGS.md)',
        },
      ],
    },
    async ({ eventsService, data }) => {
      const input = buildEventInput(data.events);
      logger.debug('Past event payload', { input });

      const response = await test.step('POST /events with a date in the past', async () => {
        return eventsService.requestCreate(input);
      });

      await test.step('400 naming eventDate, and no event was created', async () => {
        await expect(response).toHaveStatus(400);
        const body: unknown = await response.json();
        expect(body).toMatchSchema(ValidationErrorResponseSchema);
        expect((body as ValidationErrorResponse).details).toContainEqual({ field: 'eventDate', message: 'Event date must be in the future' });
        const found = await eventsService.listEvents({ search: input.title });
        expect(found.data.map((e) => e.title)).not.toContain(input.title);
        logger.info('Step done: past-dated event rejected', { scenarioId: 'S36', eventDate: input.eventDate });
      });
    },
  );
});
