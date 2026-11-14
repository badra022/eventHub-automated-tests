import { mergeTests } from '@playwright/test';
import { test as dataTest } from './data';
import { test as servicesTest } from './services';
import { BookingSetupHelpers } from '../helpers/bookings';

export { expect } from '../assertions';

type ApiFixtures = {
  /** API-side arrangement (events and bookings from test data), the same helpers as `booking.setup` in UI tests */
  bookingSetup: BookingSetupHelpers;
};

/** API-only tests: test data + API login + services. No fixture here needs a browser, so none is launched. */
export const test = mergeTests(dataTest, servicesTest).extend<ApiFixtures>({
  // Playwright resolves storageState even without a page; a fixed value keeps it from launching a browser to log in
  storageState: { cookies: [], origins: [] },

  bookingSetup: async ({ eventsService, bookingsService }, use) => {
    await use(new BookingSetupHelpers({ eventsService, bookingsService }));
  },
});
