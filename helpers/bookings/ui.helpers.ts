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
    this.logger.info('Booking through the event page', { eventId, quantity });
    await this.deps.navigator.toEventPage(eventId);
    return this.submitBookingForm(customer, quantity);
  }

  /** The full user journey: events list -> event card -> booking form -> confirm. */
  async bookFromEventsList(eventTitle: string, customer: CustomerDetails, quantity = 1): Promise<UiBookingResult> {
    this.logger.info('Booking through the events list', { eventTitle, quantity });
    const eventsPage = new EventsPage(this.deps.page);
    await this.deps.navigator.toEventsPage();
    await eventsPage.waitForLoaded();
    await eventsPage.openEvent(eventTitle);
    this.logger.info('Opened the event from the list', { eventTitle, url: this.deps.page.url() });
    return this.submitBookingForm(customer, quantity);
  }

  /** Cancels a booking from My Bookings and waits for the API to confirm the cancellation. */
  async cancelFromMyBookings(bookingRef: string): Promise<MyBookingsPage> {
    this.logger.info('Cancelling booking from My Bookings', { bookingRef });
    const myBookings = new MyBookingsPage(this.deps.page);
    await this.deps.navigator.toMyBookingsPage();
    await myBookings.waitForLoaded();

    const cancelResponse = this.deps.page.waitForResponse(
      (response) => response.request().method() === 'DELETE' && BOOKING_BY_ID_URL.test(response.url()),
    );
    await myBookings.cancelBooking(bookingRef);
    const response = await cancelResponse;
    if (!response.ok()) {
      const body = await response.text();
      this.logger.error('Cancelling from My Bookings failed', { bookingRef, status: response.status(), url: response.url(), body });
      throw new Error(`Cancelling ${bookingRef} from My Bookings failed: ${response.status()} ${body}`);
    }
    this.logger.info('Cancelled booking through the UI', { bookingRef, status: response.status() });
    return myBookings;
  }

  private async submitBookingForm(customer: CustomerDetails, quantity: number): Promise<UiBookingResult> {
    const eventPage = new EventDetailPage(this.deps.page);
    const form = eventPage.bookingForm;
    await form.waitForLoaded();
    await form.setQuantity(quantity);
    this.logger.info('Set the ticket quantity', { quantity });
    await form.fillCustomer(customer);
    this.logger.info('Filled the customer details');
    this.logger.debug('Customer details', { ...customer });

    const createResponse = this.deps.page.waitForResponse(
      (response) => response.request().method() === 'POST' && CREATE_BOOKING_URL.test(response.url()),
    );
    await form.submit();
    this.logger.info('Submitted the booking form');
    const response = await createResponse;
    if (!response.ok()) {
      const body = await response.text();
      this.logger.error('Booking through the UI failed', { status: response.status(), url: this.deps.page.url(), body });
      throw new Error(`Booking through the UI failed: ${response.status()} ${body}`);
    }
    const { data: booking } = (await response.json()) as ApiSuccess<Booking>;
    this.deps.bookingsService.track(booking.id);
    this.logger.debug('Booking returned by the POST the UI sent', { booking });

    await eventPage.confirmation.waitForLoaded();
    const bookingRef = await eventPage.confirmation.readBookingRef();
    if (bookingRef !== booking.bookingRef) {
      this.logger.warn('The confirmation shows a different reference than the API returned', {
        shown: bookingRef,
        returned: booking.bookingRef,
      });
    }
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
