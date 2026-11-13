import type { Page } from '@playwright/test';
import type { BookingsService, EventsService } from '../../services';
import type { Navigation } from '../../utils/navigation';
import { BookingSetupHelpers } from './setup.helpers';
import { BookingUiHelpers } from './ui.helpers';
import type { HelperLogger } from './types';

export * from './types';
export * from './testData.helpers';
export * from './setup.helpers';
export * from './ui.helpers';
export * from './cancellation.helpers';

export interface BookingHelpersDependencies {
  page: Page;
  navigator: Navigation;
  eventsService: EventsService;
  bookingsService: BookingsService;
  logger?: HelperLogger;
}

export interface BookingHelpers {
  setup: BookingSetupHelpers;
  ui: BookingUiHelpers;
}

export function createBookingHelpers(deps: BookingHelpersDependencies): BookingHelpers {
  const { page, navigator, eventsService, bookingsService, logger } = deps;
  return {
    setup: new BookingSetupHelpers({ eventsService, bookingsService, logger }),
    ui: new BookingUiHelpers({ page, navigator, bookingsService, logger }),
  };
}
