import type { Locator, Page } from '@playwright/test';

export class ConfirmationPanel {
  private readonly root: Locator;
  private readonly heading: Locator;
  private readonly bookingRef: Locator;
  private readonly customerName: Locator;
  private readonly ticketCount: Locator;
  private readonly totalPrice: Locator;
  private readonly viewMyBookingsLink: Locator;
  private readonly browseMoreEventsLink: Locator;

  constructor(page: Page) {
    this.root = page.locator('section, div').filter({ hasText: /Booking confirmed/i }).last();
    this.heading = this.root.getByRole('heading', { name: /Booking confirmed/i });
    this.bookingRef = this.root.getByText(/EVT-[A-Z0-9]{6}/);
    this.customerName = this.root.getByTestId('confirmation-customer');
    this.ticketCount = this.root.getByTestId('confirmation-tickets');
    this.totalPrice = this.root.getByTestId('confirmation-total');
    this.viewMyBookingsLink = this.root.getByRole('link', { name: 'View My Bookings' });
    this.browseMoreEventsLink = this.root.getByRole('link', { name: 'Browse More Events' });
  }

  getRoot(): Locator { return this.root; }
  getHeading(): Locator { return this.heading; }
  getBookingRef(): Locator { return this.bookingRef; }
  getCustomerName(): Locator { return this.customerName; }
  getTicketCount(): Locator { return this.ticketCount; }
  getTotalPrice(): Locator { return this.totalPrice; }

  /** Booking reference shown on the confirmation, e.g. `EVT-A1B2C3`. */
  async readBookingRef(): Promise<string> {
    const text = (await this.bookingRef.first().textContent()) ?? '';
    const match = text.match(/EVT-[A-Z0-9]{6}/);
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
