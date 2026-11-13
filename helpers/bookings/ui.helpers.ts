import type { Page } from '@playwright/test';
import type { ApiSuccess, Booking } from '../../api/types';
import { EventDetailPage, EventsPage, MyBookingsPage, type CustomerDetails } from '../../pages';
import type { BookingsService } from '../../services';
import { Logger } from '../../utils/logger';
import type { Navigation } from '../../utils/navigation';
import type { HelperLogger } from './types';

const CREATE_BOOKING_URL = /\/api\/bookings(?:[?#]|$)/;
const BOOKING_BY_ID_URL = /\/api\/bookings\/\d+(?:[?#]|$)/;

export interface UiBookingResult {
  /** Reference read from the confirmation panel */
  bookingRef: string;
  /** Booking returned by the POST the UI sent */
  booking: Booking;
  eventPage: EventDetailPage;
}

export interface UiHelpersDependencies {
  page: Page;
  navigator: Pick<Navigation, 'toEventPage' | 'toEventsPage' | 'toMyBookingsPage'>;
  bookingsService: Pick<BookingsService, 'track'>;
  logger?: HelperLogger;
}

/** Browser workflows of the booking journey, shared by the UI and hybrid tests. */
export class BookingUiHelpers {
  private readonly logger: HelperLogger;

  constructor(private readonly deps: UiHelpersDependencies) {
    this.logger = deps.logger ?? new Logger('booking-ui-helpers');
  }

  /** Opens the event page directly, fills the form and confirms. */
  async bookTickets(eventId: number, customer: CustomerDetails, quantity = 1): Promise<UiBookingResult> {
    await this.deps.navigator.toEventPage(eventId);
    return this.submitBookingForm(customer, quantity);
  }

  /** The full user journey: events list -> event card -> booking form -> confirm. */
  async bookFromEventsList(eventTitle: string, customer: CustomerDetails, quantity = 1): Promise<UiBookingResult> {
    const eventsPage = new EventsPage(this.deps.page);
    await this.deps.navigator.toEventsPage();
    await eventsPage.waitForLoaded();
    await eventsPage.openEvent(eventTitle);
    return this.submitBookingForm(customer, quantity);
  }

  /** Cancels a booking from My Bookings and waits for the API to confirm the cancellation. */
  async cancelFromMyBookings(bookingRef: string): Promise<MyBookingsPage> {
    const myBookings = new MyBookingsPage(this.deps.page);
    await this.deps.navigator.toMyBookingsPage();
    await myBookings.waitForLoaded();

    const cancelResponse = this.deps.page.waitForResponse(
      (response) => response.request().method() === 'DELETE' && BOOKING_BY_ID_URL.test(response.url()),
    );
    await myBookings.cancelBooking(bookingRef);
    const response = await cancelResponse;
    if (!response.ok()) {
      throw new Error(`Cancelling ${bookingRef} from My Bookings failed: ${response.status()} ${await response.text()}`);
    }
    this.logger.info('Cancelled booking through the UI', { bookingRef });
    return myBookings;
  }

  private async submitBookingForm(customer: CustomerDetails, quantity: number): Promise<UiBookingResult> {
    const eventPage = new EventDetailPage(this.deps.page);
    const form = eventPage.bookingForm;
    await form.waitForLoaded();
    await form.setQuantity(quantity);
    await form.fillCustomer(customer);

    const createResponse = this.deps.page.waitForResponse(
      (response) => response.request().method() === 'POST' && CREATE_BOOKING_URL.test(response.url()),
    );
    await form.submit();
    const response = await createResponse;
    if (!response.ok()) {
      throw new Error(`Booking through the UI failed: ${response.status()} ${await response.text()}`);
    }
    const { data: booking } = (await response.json()) as ApiSuccess<Booking>;
    this.deps.bookingsService.track(booking.id);

    await eventPage.confirmation.waitForLoaded();
    const bookingRef = await eventPage.confirmation.readBookingRef();
    this.logger.info('Booked through the UI', {
      bookingId: booking.id,
      bookingRef,
      eventId: booking.eventId,
      quantity,
      totalPrice: booking.totalPrice,
    });
    return { bookingRef, booking, eventPage };
  }
}
