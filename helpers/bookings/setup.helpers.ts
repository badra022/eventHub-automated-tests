import type { Booking, CreateEventInput, Event } from '../../api/types';
import type { BookingsService, EventsService } from '../../services';
import { Logger } from '../../utils/logger';
import { buildBookingInput, buildEventInput } from './testData.helpers';
import type { HelperLogger } from './types';

export interface SetupHelpersDependencies {
  eventsService: Pick<EventsService, 'createEvent'>;
  bookingsService: Pick<BookingsService, 'createBooking'>;
  logger?: HelperLogger;
}

/** API-side arrangement: tests create exactly the events and bookings they need (hybrid pattern, step 1). */
export class BookingSetupHelpers {
  private readonly logger: HelperLogger;

  constructor(private readonly deps: SetupHelpersDependencies) {
    this.logger = deps.logger ?? new Logger('booking-setup-helpers');
  }

  /** Creates an event from a `test-data/events.json` template; it is deleted after the test. */
  async createEvent(template: Record<string, unknown>, overrides: Partial<CreateEventInput> = {}): Promise<Event> {
    return this.deps.eventsService.createEvent(buildEventInput(template, overrides));
  }

  /** Creates `count` bookings of `quantity` tickets each for an event, with generated customers. */
  async createBookings(eventId: number, count = 1, quantity = 1): Promise<Booking[]> {
    const bookings: Booking[] = [];
    for (let i = 0; i < count; i++) {
      bookings.push(await this.deps.bookingsService.createBooking(buildBookingInput(eventId, { quantity })));
    }
    this.logger.info('Created bookings through the API', { eventId, refs: bookings.map((b) => b.bookingRef) });
    return bookings;
  }
}
