import type { Locator, Page } from '@playwright/test';

/** "Cancel this booking?"-style confirmation modal. */
export class ConfirmDialog {
  private readonly root: Locator;
  private readonly message: Locator;
  private readonly confirmButton: Locator;
  private readonly dismissButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog').or(page.getByRole('alertdialog'));
    this.message = this.root.getByRole('heading').or(this.root.locator('p')).first();
    this.confirmButton = this.root.getByRole('button', { name: /yes|confirm|cancel booking/i });
    this.dismissButton = this.root.getByRole('button', { name: /no|keep|close/i });
  }

  getRoot(): Locator { return this.root; }
  getMessage(): Locator { return this.message; }

  async confirm(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
    await this.confirmButton.click();
  }

  async dismiss(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
    await this.dismissButton.click();
  }
}
