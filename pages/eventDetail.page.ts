import type { Locator, Page } from '@playwright/test';
import { BookingForm } from './components/bookingForm.component';
import { ConfirmationPanel } from './components/confirmationPanel.component';
import { Header } from './components/header.component';

export class EventDetailPage {
  readonly header: Header;
  readonly bookingForm: BookingForm;
  readonly confirmation: ConfirmationPanel;

  private readonly title: Locator;
  private readonly price: Locator;
  private readonly availableSeats: Locator;
  private readonly soldOutMessage: Locator;

  constructor(page: Page) {
    this.header = new Header(page);
    this.bookingForm = new BookingForm(page);
    this.confirmation = new ConfirmationPanel(page);
    const valueOf = (label: string) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
    this.title = page.getByRole('heading', { level: 1 });
    this.price = valueOf('Price per ticket');
    // Rendered as "<available> / <total> seats"
    this.availableSeats = valueOf('Available');
    this.soldOutMessage = page.getByText(/sold out/i);
  }

  getTitle(): Locator { return this.title; }
  getPrice(): Locator { return this.price; }
  getAvailableSeats(): Locator { return this.availableSeats; }
  getSoldOutMessage(): Locator { return this.soldOutMessage; }

  async waitForLoaded(): Promise<void> {
    await this.title.waitFor({ state: 'visible' });
  }
}
