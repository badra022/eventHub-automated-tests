import { test as base } from './auth';
import * as services from '../services';
import { Logger } from '../utils/logger';

const logger = new Logger('Services fixture');

type ServiceFixtures = {
  authService: services.AuthService;
  eventsService: services.EventsService;
  bookingsService: services.BookingsService;
  healthService: services.HealthService;
  /** Events and bookings services of the dedicated sandbox-limit account (S19 only); cleaned up like the others. */
  sandboxLimitServices: { eventsService: services.EventsService; bookingsService: services.BookingsService };
};

/**
 * Domain services, authenticated as the worker's account. Services that create data clean it up after each test,
 * so the account's sandbox stays below its booking and event limits.
 */
export const test = base.extend<ServiceFixtures>({
  authService: async ({ request, envConfig }, use) => {
    await use(new services.AuthService(request, { baseUrl: envConfig.API_BASE_URL }));
  },

  eventsService: async ({ request, envConfig, authUser }, use) => {
    const eventsService = new services.EventsService(request, {
      baseUrl: envConfig.API_BASE_URL,
      token: authUser.token,
    });
    logger.debug('EventsService ready', { apiBaseUrl: envConfig.API_BASE_URL, userId: authUser.id, token: authUser.token });
    await use(eventsService);
    await eventsService.cleanup();
  },

  bookingsService: async ({ request, envConfig, authUser }, use) => {
    const bookingsService = new services.BookingsService(request, {
      baseUrl: envConfig.API_BASE_URL,
      token: authUser.token,
    });
    logger.debug('BookingsService ready', { apiBaseUrl: envConfig.API_BASE_URL, userId: authUser.id, token: authUser.token });
    await use(bookingsService);
    await bookingsService.cleanup();
  },

  healthService: async ({ request, envConfig }, use) => {
    await use(new services.HealthService(request, { baseUrl: envConfig.API_BASE_URL }));
  },

  sandboxLimitServices: async ({ request, envConfig, sandboxLimitUser }, use) => {
    const config = { baseUrl: envConfig.API_BASE_URL, token: sandboxLimitUser.token };
    const eventsService = new services.EventsService(request, config);
    const bookingsService = new services.BookingsService(request, config);
    logger.debug('Sandbox-limit services ready', { userId: sandboxLimitUser.id, token: sandboxLimitUser.token });
    await use({ eventsService, bookingsService });
    await bookingsService.cleanup();
    await eventsService.cleanup();
  },
});
