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
  private readonly notFoundHeading: Locator;
  private readonly notFoundBrowseLink: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.bookingForm = new BookingForm(page);
    this.confirmation = new ConfirmationPanel(page);
    const valueOf = (label: string) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
    this.title = page.getByRole('heading', { level: 1 });
    this.price = valueOf('Price per ticket');
    // Rendered as "<available> / <total> seats", or "SOLD OUT"
    this.availableSeats = valueOf('Available');
    this.soldOutMessage = page.getByText(/sold out/i);
    this.notFoundHeading = page.getByRole('heading', { name: 'Event not found' });
    this.notFoundBrowseLink = page.getByRole('main').getByRole('link', { name: 'Browse Events' });
  }

  getTitle(): Locator { return this.title; }
  getPrice(): Locator { return this.price; }
  getAvailableSeats(): Locator { return this.availableSeats; }
  getSoldOutMessage(): Locator { return this.soldOutMessage; }
  getNotFoundHeading(): Locator { return this.notFoundHeading; }
  getNotFoundBrowseLink(): Locator { return this.notFoundBrowseLink; }

  /** Toast message shown by the page, e.g. after a failed booking ("Internal server error", "Network Error"). */
  getToast(text: string | RegExp): Locator {
    return this.page.getByText(text, { exact: typeof text === 'string' });
  }

  /** Available seats as shown on the page ("<available> / <total> seats"). */
  async readAvailableSeats(): Promise<number> {
    const text = (await this.availableSeats.textContent()) ?? '';
    const match = text.match(/^\s*(\d+)\s*\//);
    if (!match) {
      throw new Error(`Unexpected available seats text "${text}"`);
    }
    return Number(match[1]);
  }

  async waitForLoaded(): Promise<void> {
    await this.title.waitFor({ state: 'visible' });
  }
}
