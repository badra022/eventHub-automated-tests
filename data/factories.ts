import type { CreateBookingInput, CreateEventInput } from '../api/types';
import type { CustomerDetails } from '../pages';
import { uniqueSuffix } from '../utils/common';
import { EventHubFaker, keepInFuture } from './generators/eventHubFaker';

/**
 * Event shapes the scenarios need. Only the fields under test are fixed here (price, seats, date window);
 * everything else is generated.
 */
export const EVENT_KINDS = {
  /** Plenty of seats; the 10-ticket maximum applies */
  standard: { price: 1500, totalSeats: 100 },
  /** Fewer seats than the per-booking maximum (S02, S08, S34, S35) */
  lastSeats: { price: 500, totalSeats: 2 },
  /** Fractional price for rounding checks (S12) */
  decimalPrice: { price: 99.99, totalSeats: 30 },
  /** Zero total (S13) */
  free: { price: 0, totalSeats: 20 },
  /** Dated in the past (S36) */
  past: { price: 300, totalSeats: 10 },
} as const satisfies Record<string, Pick<CreateEventInput, 'price' | 'totalSeats'>>;

export type EventKind = keyof typeof EVENT_KINDS;

/** Valid EventHub payloads from one seeded generator; tests override only the field under test. */
export class EventHubFactories {
  private readonly gen: EventHubFaker;

  constructor(readonly seed: number) {
    this.gen = new EventHubFaker(seed);
  }

  /**
   * Event payload of a kind. Overrides win, except that the title always gets a unique suffix (runs never collide)
   * and a fixed date is moved into the future (pinned data never expires).
   */
  event(kind: EventKind = 'standard', overrides: Partial<CreateEventInput> = {}): CreateEventInput {
    const category = overrides.category ?? this.gen.category();
    const eventDate =
      kind === 'past' ? (overrides.eventDate ?? this.gen.pastEventDate()) : overrides.eventDate ? keepInFuture(overrides.eventDate) : this.gen.futureEventDate();
    return {
      description: this.gen.description(),
      venue: this.gen.venue(),
      city: this.gen.city(),
      ...EVENT_KINDS[kind],
      ...overrides,
      category,
      eventDate,
      title: `${overrides.title ?? this.gen.eventTitle(category)} ${uniqueSuffix()}`,
    };
  }

  /** Event from a fixed test-data template, for tests whose baselines show its fields; title and date handled as in `event`. */
  pinnedEvent(template: Record<string, unknown>): CreateEventInput {
    return this.event('standard', template as Partial<CreateEventInput>);
  }

  /** Customer details accepted by both the booking form and the API. */
  customer(overrides: Partial<CustomerDetails> = {}): CustomerDetails {
    const customerName = this.gen.personName();
    return { customerName, customerEmail: this.gen.email(customerName), customerPhone: this.gen.phone(), ...overrides };
  }

  /** Booking payload for an event: a generated customer and 1 ticket unless overridden. */
  booking(eventId: number, overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
    return { eventId, ...this.customer(), quantity: 1, ...overrides };
  }
}
