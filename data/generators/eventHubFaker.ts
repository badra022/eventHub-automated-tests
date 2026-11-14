import { Faker, base, en, en_IN } from '@faker-js/faker';
import type { EventCategory } from '../../api/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const EVENT_CATEGORIES: EventCategory[] = ['Conference', 'Concert', 'Sports', 'Workshop', 'Festival'];

/**
 * faker narrowed to values EventHub accepts, from one seed. Formats come from the field rules both layers accept
 * (helpers/bookings/validationRules.helpers.ts), so a generated value never trips validation by accident.
 */
export class EventHubFaker {
  private readonly faker: Faker;

  constructor(readonly seed: number) {
    this.faker = new Faker({ locale: [en_IN, en, base] });
    this.faker.seed(seed);
  }

  /** First and last name only: no titles or suffixes, always at least 2 characters. */
  personName(): string {
    return `${this.faker.person.firstName()} ${this.faker.person.lastName()}`;
  }

  /** Lower-case address on example.com, a domain reserved for documentation, so no real inbox is ever used. */
  email(name: string): string {
    const [firstName, lastName] = name.split(' ');
    return this.faker.internet.email({ firstName, lastName, provider: 'example.com' }).toLowerCase();
  }

  /** A 10-digit Indian mobile number, plain or with the +91- prefix (both accepted by the form and the API). */
  phone(): string {
    const digits = this.faker.helpers.fromRegExp(/[6-9][0-9]{9}/);
    return this.faker.datatype.boolean() ? digits : `+91-${digits}`;
  }

  category(): EventCategory {
    return this.faker.helpers.arrayElement(EVENT_CATEGORIES);
  }

  /** "QA " first, so leftovers of the tests can be told apart from other events in a sandbox. */
  eventTitle(category: string): string {
    return `QA ${this.faker.word.adjective({ length: { min: 4, max: 10 } })} ${category}`.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  venue(): string {
    return `${this.faker.location.street()} ${this.faker.helpers.arrayElement(['Hall', 'Arena', 'Centre', 'Auditorium'])}`;
  }

  city(): string {
    return this.faker.location.city();
  }

  description(): string {
    return `Created by the automated tests. ${this.faker.lorem.sentence()}`;
  }

  /** A date at least `minDays` ahead, so the event stays bookable for the whole run. */
  futureEventDate(minDays = 7): string {
    const from = new Date(Date.now() + minDays * DAY_MS);
    return this.faker.date.soon({ days: 180, refDate: from }).toISOString();
  }

  pastEventDate(): string {
    return this.faker.date.past({ years: 2, refDate: new Date(Date.now() - 30 * DAY_MS) }).toISOString();
  }
}

/**
 * Moves a fixed date forward by whole years until it is at least `minDays` ahead. Pinned dates (visual baselines
 * show the month) keep their day and month and never fall into the past.
 */
export function keepInFuture(isoDate: string, minDays = 7): string {
  const date = new Date(isoDate);
  const earliest = Date.now() + minDays * DAY_MS;
  while (date.getTime() < earliest) {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return date.toISOString();
}

/** Stable 32-bit seed from a string (FNV-1a), e.g. a test id. */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
