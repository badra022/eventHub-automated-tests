import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly signInButton: Locator;
  private readonly registerLink: Locator;
  private readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.registerLink = page.getByRole('link', { name: 'Register' });
    this.errorMessage = page.getByRole('alert');
  }

  getErrorMessage(): Locator { return this.errorMessage; }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /** Resolves once the app has left the login page, i.e. the session is established. */
  async waitForLoggedIn(timeout = 15_000): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout });
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async waitForLoaded(): Promise<void> {
    await this.signInButton.waitFor({ state: 'visible' });
  }
}
