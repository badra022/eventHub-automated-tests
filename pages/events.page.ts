import type { Locator, Page } from '@playwright/test';
import { Header } from './components/header.component';

export class EventsPage {
  readonly header: Header;

  private readonly eventCards: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.eventCards = page.getByRole('article');
  }

  getEventCards(): Locator { return this.eventCards; }

  getEventCard(title: string): Locator {
    return this.eventCards.filter({ hasText: title });
  }

  async openEvent(title: string): Promise<void> {
    await this.getEventCard(title).getByRole('link').first().click();
  }

  async waitForLoaded(): Promise<void> {
    await this.eventCards.first().waitFor({ state: 'visible' });
  }
}
