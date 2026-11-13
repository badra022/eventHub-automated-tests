import type { Locator, Page } from '@playwright/test';
import { BookingCard } from './components/bookingCard.component';
import { ConfirmDialog } from './components/confirmDialog.component';
import { Header } from './components/header.component';

export class MyBookingsPage {
  readonly header: Header;
  readonly confirmDialog: ConfirmDialog;

  private readonly heading: Locator;
  private readonly emptyState: Locator;
  private readonly successMessage: Locator;
  private readonly clearAllButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.confirmDialog = new ConfirmDialog(page);
    this.heading = page.getByRole('heading', { name: 'My Bookings' });
    this.emptyState = page.getByText(/no bookings/i);
    this.successMessage = page.getByRole('status').or(page.getByRole('alert'));
    this.clearAllButton = page.getByRole('button', { name: 'Clear all bookings' });
  }

  getHeading(): Locator { return this.heading; }
  getEmptyState(): Locator { return this.emptyState; }
  getSuccessMessage(): Locator { return this.successMessage; }

  booking(bookingRef: string): BookingCard {
    return new BookingCard(this.page, bookingRef);
  }

  async cancelBooking(bookingRef: string): Promise<void> {
    await this.booking(bookingRef).clickCancel();
    await this.confirmDialog.confirm();
  }

  async clearAllBookings(): Promise<void> {
    await this.clearAllButton.click();
    await this.confirmDialog.confirm();
  }

  async waitForLoaded(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }
}
