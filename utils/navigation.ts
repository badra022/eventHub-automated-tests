import type { Page, Response } from '@playwright/test';
import { Logger } from './logger';

const logger = new Logger('navigation');

export type QueryParams = Record<string, string | number | boolean>;

export interface NavigationOptions {
  params?: QueryParams;
  referer?: string;
}

export interface NavigationConfig {
  appBaseUrl: string;
}

// Routes are taken from the app's links; verify them when the matching page object is first used
const ROUTES = {
  login: '/login',
  register: '/register',
  events: '/events',
  event: (id: number) => `/events/${id}`,
  myBookings: '/bookings',
} as const;

export class Navigation {
  constructor(
    private readonly page: Page,
    private readonly config: NavigationConfig,
  ) {}

  async toLoginPage(options?: NavigationOptions): Promise<Response | null> {
    return this.to(ROUTES.login, options);
  }

  async toRegisterPage(options?: NavigationOptions): Promise<Response | null> {
    return this.to(ROUTES.register, options);
  }

  async toEventsPage(options?: NavigationOptions): Promise<Response | null> {
    return this.to(ROUTES.events, options);
  }

  async toEventPage(eventId: number, options?: NavigationOptions): Promise<Response | null> {
    return this.to(ROUTES.event(eventId), options);
  }

  async toMyBookingsPage(options?: NavigationOptions): Promise<Response | null> {
    return this.to(ROUTES.myBookings, options);
  }

  getUrl(path = '/', options?: NavigationOptions): string {
    return this.buildUrl(path, options?.params);
  }

  async to(path: string, options?: NavigationOptions): Promise<Response | null> {
    return this.page.goto(this.buildUrl(path, options?.params), { referer: options?.referer });
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const url = path.startsWith('http') ? new URL(path) : new URL(path, this.config.appBaseUrl);
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const destination = url.toString();
    logger.info(`Navigating to: ${destination}`);
    return destination;
  }
}
