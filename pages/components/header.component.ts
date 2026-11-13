import type { Locator, Page } from '@playwright/test';

export class Header {
  private readonly root: Locator;
  private readonly eventsLink: Locator;
  private readonly myBookingsLink: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation').first();
    this.eventsLink = this.root.getByRole('link', { name: 'Events' });
    this.myBookingsLink = this.root.getByRole('link', { name: 'My Bookings' });
    this.logoutButton = this.root.getByRole('button', { name: /log ?out|sign ?out/i });
  }

  getRoot(): Locator { return this.root; }

  async goToEvents(): Promise<void> {
    await this.eventsLink.click();
  }

  async goToMyBookings(): Promise<void> {
    await this.myBookingsLink.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
