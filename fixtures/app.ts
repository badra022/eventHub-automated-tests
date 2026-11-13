import { mergeTests } from '@playwright/test';
import { test as dataTest } from './data';
import { test as servicesTest } from './services';
import { createBookingHelpers, type BookingHelpers } from '../helpers/bookings';
import { Navigation } from '../utils/navigation';

export { expect } from '../assertions';

type AppFixtures = {
  navigator: Navigation;
  /** Domain workflows: `booking.setup` (API seeding) and `booking.ui` (browser flows) */
  booking: BookingHelpers;
};

/** UI and hybrid tests: test data + login + services + navigation + workflows. */
export const test = mergeTests(dataTest, servicesTest).extend<AppFixtures>({
  navigator: async ({ page, envConfig }, use) => {
    await use(new Navigation(page, { appBaseUrl: envConfig.APP_BASE_URL }));
  },

  booking: async ({ page, navigator, eventsService, bookingsService }, use) => {
    await use(createBookingHelpers({ page, navigator, eventsService, bookingsService }));
  },
});
