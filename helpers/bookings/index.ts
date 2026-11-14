import type { Page } from '@playwright/test';
import type { EventHubFactories } from '../../data/factories';
import type { BookingsService, EventsService } from '../../services';
import type { Navigation } from '../../utils/navigation';
import { BookingSetupHelpers } from './setup.helpers';
import { BookingUiHelpers } from './ui.helpers';
import type { HelperLogger } from './types';

export * from './types';
export * from './expectedValues.helpers';
export * from './setup.helpers';
export * from './ui.helpers';
export * from './cancellation.helpers';
export * from './validationRules.helpers';

export interface BookingHelpersDependencies {
  page: Page;
  navigator: Navigation;
  eventsService: EventsService;
  bookingsService: BookingsService;
  dataFactory: EventHubFactories;
  logger?: HelperLogger;
}

export interface BookingHelpers {
  setup: BookingSetupHelpers;
  ui: BookingUiHelpers;
}

export function createBookingHelpers(deps: BookingHelpersDependencies): BookingHelpers {
  const { page, navigator, eventsService, bookingsService, dataFactory, logger } = deps;
  return {
    setup: new BookingSetupHelpers({ eventsService, bookingsService, dataFactory, logger }),
    ui: new BookingUiHelpers({ page, navigator, bookingsService, logger }),
  };
}
