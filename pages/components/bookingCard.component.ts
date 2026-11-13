import type { Locator, Page } from '@playwright/test';

/** One booking in the My Bookings list, located by its reference. */
export class BookingCard {
  private readonly root: Locator;
  private readonly eventTitle: Locator;
  private readonly ticketCount: Locator;
  private readonly totalPrice: Locator;
  private readonly status: Locator;
  private readonly cancelButton: Locator;

  constructor(page: Page, bookingRef: string) {
    this.root = page.getByRole('article').or(page.locator('li')).filter({ hasText: bookingRef });
    this.eventTitle = this.root.getByRole('heading');
    this.ticketCount = this.root.getByTestId('booking-tickets');
    this.totalPrice = this.root.getByTestId('booking-total');
    this.status = this.root.getByTestId('booking-status');
    this.cancelButton = this.root.getByRole('button', { name: /cancel/i });
  }

  getRoot(): Locator { return this.root; }
  getEventTitle(): Locator { return this.eventTitle; }
  getTicketCount(): Locator { return this.ticketCount; }
  getTotalPrice(): Locator { return this.totalPrice; }
  getStatus(): Locator { return this.status; }
  getCancelButton(): Locator { return this.cancelButton; }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
