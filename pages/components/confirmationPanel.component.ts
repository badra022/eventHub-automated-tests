import type { Locator, Page } from '@playwright/test';

export const BOOKING_REF_IN_TEXT = /[A-Z0-9]-[A-Z0-9]{6}/;

/** Replaces the booking form once a booking succeeds. Values have no test ids, so they are read next to their labels. */
export class ConfirmationPanel {
  private readonly heading: Locator;
  private readonly bookingRef: Locator;
  private readonly customerName: Locator;
  private readonly ticketCount: Locator;
  private readonly totalPrice: Locator;
  private readonly viewMyBookingsLink: Locator;
  private readonly browseMoreEventsLink: Locator;

  constructor(page: Page) {
    const valueOf = (label: string) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
    this.heading = page.getByRole('heading', { name: /Booking Confirmed/i });
    this.bookingRef = valueOf('Booking Ref');
    this.customerName = valueOf('Customer');
    this.ticketCount = valueOf('Tickets');
    this.totalPrice = valueOf('Total');
    // The buttons are wrapped in links without an accessible name
    this.viewMyBookingsLink = page.getByRole('button', { name: 'View My Bookings' });
    this.browseMoreEventsLink = page.getByRole('button', { name: 'Browse More Events' });
  }

  getHeading(): Locator { return this.heading; }
  getBookingRef(): Locator { return this.bookingRef; }
  getCustomerName(): Locator { return this.customerName; }
  getTicketCount(): Locator { return this.ticketCount; }
  getTotalPrice(): Locator { return this.totalPrice; }

  /** Booking reference shown on the confirmation, e.g. `D-W6VW4J`. */
  async readBookingRef(): Promise<string> {
    const text = (await this.bookingRef.textContent()) ?? '';
    const match = text.match(BOOKING_REF_IN_TEXT);
    if (!match) {
      throw new Error(`No booking reference found in the confirmation text "${text}"`);
    }
    return match[0];
  }

  async clickViewMyBookings(): Promise<void> {
    await this.viewMyBookingsLink.click();
  }

  async clickBrowseMoreEvents(): Promise<void> {
    await this.browseMoreEventsLink.click();
  }

  async waitForLoaded(timeout = 15_000): Promise<void> {
    await this.heading.waitFor({ state: 'visible', timeout });
  }
}
