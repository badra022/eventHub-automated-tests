import type { Booking, CreateBookingInput, CreateEventInput, Event } from '../../api/types';
import type { EventHubFactories } from '../../data/factories';
import type { BookingsService, EventsService } from '../../services';
import { Logger } from '../../utils/logger';
import type { HelperLogger } from './types';

export interface SetupHelpersDependencies {
  eventsService: Pick<EventsService, 'createEvent'>;
  bookingsService: Pick<BookingsService, 'createBooking'>;
  dataFactory: Pick<EventHubFactories, 'booking'>;
  logger?: HelperLogger;
}

/** API-side arrangement: tests create exactly the events and bookings they need (hybrid pattern, step 1). */
export class BookingSetupHelpers {
  private readonly logger: HelperLogger;

  constructor(private readonly deps: SetupHelpersDependencies) {
    this.logger = deps.logger ?? new Logger('booking-setup-helpers');
  }

  /** Creates the event (e.g. `dataFactory.event('lastSeats')`); it is deleted after the test. */
  async createEvent(input: CreateEventInput): Promise<Event> {
    this.logger.info('Setting up an event through the API', { title: input.title, price: input.price, totalSeats: input.totalSeats });
    this.logger.debug('Event payload', { input });
    return this.deps.eventsService.createEvent(input);
  }

  /** Creates one booking with a generated customer; `overrides` replace any field (quantity, customer, ...). */
  async createBooking(eventId: number, overrides: Partial<CreateBookingInput> = {}): Promise<Booking> {
    const input = this.deps.dataFactory.booking(eventId, overrides);
    this.logger.info('Setting up a booking through the API', { eventId, quantity: input.quantity });
    return this.deps.bookingsService.createBooking(input);
  }

  /** Creates `count` bookings of `quantity` tickets each for an event, with generated customers. */
  async createBookings(eventId: number, count = 1, quantity = 1): Promise<Booking[]> {
    if (count > SAFE_BOOKINGS_PER_ACCOUNT) {
      this.logger.warn('More bookings than the sandbox keeps safely: the oldest bookings get evicted', {
        count,
        limit: SAFE_BOOKINGS_PER_ACCOUNT,
      });
    }
    this.logger.info('Setting up bookings through the API', { eventId, count, quantity });
    const bookings: Booking[] = [];
    for (let i = 0; i < count; i++) {
      bookings.push(await this.deps.bookingsService.createBooking(this.deps.dataFactory.booking(eventId, { quantity })));
    }
    this.logger.info('Created bookings through the API', { eventId, refs: bookings.map((b) => b.bookingRef) });
    return bookings;
  }
}

/** The sandbox holds 9 bookings per account and silently evicts the oldest; tests stay at 8 or fewer (risk T2). */
const SAFE_BOOKINGS_PER_ACCOUNT = 8;
