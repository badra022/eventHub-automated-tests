import { test as base } from './auth';
import * as services from '../services';

type ServiceFixtures = {
  authService: services.AuthService;
  eventsService: services.EventsService;
  bookingsService: services.BookingsService;
  healthService: services.HealthService;
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
    await use(eventsService);
    await eventsService.cleanup();
  },

  bookingsService: async ({ request, envConfig, authUser }, use) => {
    const bookingsService = new services.BookingsService(request, {
      baseUrl: envConfig.API_BASE_URL,
      token: authUser.token,
    });
    await use(bookingsService);
    await bookingsService.cleanup();
  },

  healthService: async ({ request, envConfig }, use) => {
    await use(new services.HealthService(request, { baseUrl: envConfig.API_BASE_URL }));
  },
});
