import type { Locator, Page } from '@playwright/test';
import { BookingCard } from './components/bookingCard.component';
import { ConfirmDialog } from './components/confirmDialog.component';
import { Header } from './components/header.component';

export class MyBookingsPage {
  readonly header: Header;
  readonly confirmDialog: ConfirmDialog;

  private readonly heading: Locator;
  private readonly bookingCards: Locator;
  private readonly emptyState: Locator;
  private readonly cancelledMessage: Locator;
  private readonly clearAllButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.confirmDialog = new ConfirmDialog(page);
    this.heading = page.getByRole('heading', { name: 'My Bookings', level: 1 });
    this.bookingCards = page.getByTestId('booking-card');
    this.emptyState = page.getByRole('heading', { name: 'No bookings yet' });
    // A toast, not role=alert: Next.js keeps an empty role=alert route announcer on every page
    this.cancelledMessage = page.getByText('Booking cancelled successfully');
    this.clearAllButton = page.getByRole('button', { name: 'Clear all bookings' });
  }

  getHeading(): Locator { return this.heading; }
  getBookingCards(): Locator { return this.bookingCards; }
  getEmptyState(): Locator { return this.emptyState; }
  getCancelledMessage(): Locator { return this.cancelledMessage; }

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
