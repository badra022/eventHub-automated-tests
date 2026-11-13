import type { Locator, Page } from '@playwright/test';

export class Header {
  private readonly root: Locator;
  private readonly eventsLink: Locator;
  private readonly myBookingsLink: Locator;
  private readonly userEmail: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation').first();
    this.eventsLink = page.getByTestId('nav-events');
    this.myBookingsLink = page.getByTestId('nav-bookings');
    this.userEmail = page.getByTestId('user-email-display');
    this.logoutButton = page.getByTestId('logout-btn');
  }

  getRoot(): Locator { return this.root; }
  getUserEmail(): Locator { return this.userEmail; }

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
