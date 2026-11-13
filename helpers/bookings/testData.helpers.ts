import { faker } from '@faker-js/faker';
import type { CreateBookingInput, CreateEventInput } from '../../api/types';
import type { CustomerDetails } from '../../pages';
import { uniqueSuffix } from '../../utils/common';

/**
 * Valid payload builders. Tests start from a test-data template (or a generated value)
 * and override only the field under test.
 */

/** Event payload from a `test-data/events.json` template, with a unique title so runs never collide. */
export function buildEventInput(template: Record<string, unknown>, overrides: Partial<CreateEventInput> = {}): CreateEventInput {
  const event = { ...template, ...overrides } as CreateEventInput;
  return { ...event, title: overrides.title ?? `${event.title} ${uniqueSuffix()}` };
}

/** Generated customer that passes both the UI and the API validation rules. */
export function buildCustomer(overrides: Partial<CustomerDetails> = {}): CustomerDetails {
  return {
    customerName: faker.person.fullName(),
    customerEmail: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
    customerPhone: faker.string.numeric(10),
    ...overrides,
  };
}

/** Customer details from a `test-data/bookings.json` entry. */
export function toCustomerDetails(record: Record<string, unknown>): CustomerDetails {
  const { customerName, customerEmail, customerPhone } = record;
  return {
    customerName: String(customerName),
    customerEmail: String(customerEmail),
    customerPhone: String(customerPhone),
  };
}

export function buildBookingInput(eventId: number, overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return { eventId, ...buildCustomer(), quantity: 1, ...overrides };
}

/** How the UI displays a price: USD without decimals (e.g. 1500 -> "$1,500"). */
export function formatDisplayedPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
