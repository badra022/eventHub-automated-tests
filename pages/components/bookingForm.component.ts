import type { Locator, Page } from '@playwright/test';

export interface CustomerDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export type BookingField = 'name' | 'email' | 'phone';

export class BookingForm {
  private readonly root: Locator;
  private readonly decrementButton: Locator;
  private readonly incrementButton: Locator;
  private readonly quantityValue: Locator;
  private readonly maxQuantityLabel: Locator;
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly confirmButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('form').filter({ has: page.getByRole('button', { name: 'Confirm Booking' }) });
    this.decrementButton = this.root.getByRole('button', { name: '−', exact: true });
    this.incrementButton = this.root.getByRole('button', { name: '+', exact: true });
    // The counter has no test id: it is the element between the − and + buttons
    this.quantityValue = this.decrementButton.locator('xpath=following-sibling::*[1]');
    this.maxQuantityLabel = this.root.getByText(/\(max \d+\)/);
    this.nameInput = this.root.locator('#customerName');
    this.emailInput = this.root.getByTestId('customer-email');
    this.phoneInput = this.root.locator('#phone');
    this.confirmButton = this.root.getByRole('button', { name: 'Confirm Booking' });
  }

  getRoot(): Locator { return this.root; }
  getDecrementButton(): Locator { return this.decrementButton; }
  getIncrementButton(): Locator { return this.incrementButton; }
  getQuantityValue(): Locator { return this.quantityValue; }
  getMaxQuantityLabel(): Locator { return this.maxQuantityLabel; }
  getConfirmButton(): Locator { return this.confirmButton; }

  /** Validation message rendered right after a field. */
  getFieldError(field: BookingField): Locator {
    const input = { name: this.nameInput, email: this.emailInput, phone: this.phoneInput }[field];
    return input.locator('xpath=following-sibling::*[1]');
  }

  async fillCustomer(customer: CustomerDetails): Promise<void> {
    await this.nameInput.fill(customer.customerName);
    await this.emailInput.fill(customer.customerEmail);
    await this.phoneInput.fill(customer.customerPhone);
  }

  /** Clicks + / − until the counter shows `quantity` (the counter starts at 1). */
  async setQuantity(quantity: number): Promise<void> {
    let current = await this.getQuantity();
    while (current < quantity) {
      await this.incrementButton.click();
      current = await this.getQuantity();
    }
    while (current > quantity) {
      await this.decrementButton.click();
      current = await this.getQuantity();
    }
  }

  async getQuantity(): Promise<number> {
    return Number((await this.quantityValue.textContent())?.trim());
  }

  async submit(): Promise<void> {
    await this.confirmButton.click();
  }

  async waitForLoaded(): Promise<void> {
    await this.confirmButton.waitFor({ state: 'visible' });
  }
}
