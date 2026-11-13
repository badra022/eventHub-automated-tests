import type { Locator, Page } from '@playwright/test';

/** In-page confirmation modal, e.g. "Cancel this booking?" (not a native browser dialog). */
export class ConfirmDialog {
  private readonly root: Locator;
  private readonly title: Locator;
  private readonly message: Locator;
  private readonly confirmButton: Locator;
  private readonly dismissButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.getByRole('heading');
    this.message = this.root.locator('p');
    this.confirmButton = page.getByTestId('confirm-dialog-yes');
    this.dismissButton = this.root.getByRole('button', { name: 'Cancel', exact: true });
  }

  getRoot(): Locator { return this.root; }
  getTitle(): Locator { return this.title; }
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
