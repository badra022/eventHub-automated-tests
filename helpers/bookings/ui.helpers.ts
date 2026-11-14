import type { Page, Request } from '@playwright/test';
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
  /** JSON body of the POST /bookings the page sent */
  requestBody: Record<string, unknown>;
}

export interface UiBookingAttempt {
  eventPage: EventDetailPage;
  /** Status the API answered to the page's POST /bookings */
  status: number;
  /** Parsed response body (raw text when not JSON) */
  body: unknown;
  requestBody: Record<string, unknown>;
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

  /** Opens the event page and waits for the booking form, for tests that inspect the form before booking. */
  async openEvent(eventId: number): Promise<EventDetailPage> {
    const eventPage = new EventDetailPage(this.deps.page);
    await this.deps.navigator.toEventPage(eventId);
    await eventPage.bookingForm.waitForLoaded();
    this.logger.info('Opened the event page', { eventId });
    return eventPage;
  }

  /** Books on the event page that is already open (after `openEvent`). */
  async bookOnOpenEventPage(customer: CustomerDetails, quantity = 1): Promise<UiBookingResult> {
    return this.submitBookingForm(customer, quantity);
  }

  /**
   * Submits the open booking form with input the form should reject, and reports how many booking requests the
   * page sent from then on. The caller asserts the validation message first, then that no request was sent.
   */
  async submitInvalidBookingForm(customer: CustomerDetails): Promise<{ eventPage: EventDetailPage; bookingRequestsSent: () => number }> {
    const eventPage = new EventDetailPage(this.deps.page);
    const form = eventPage.bookingForm;
    await form.waitForLoaded();
    await form.fillCustomer(customer);
    this.logger.debug('Customer details', { ...customer });

    let sent = 0;
    this.deps.page.on('request', (request: Request) => {
      if (request.method() === 'POST' && CREATE_BOOKING_URL.test(request.url())) {
        sent++;
        this.logger.warn('The booking form sent a booking request for input it should reject', { url: request.url() });
      }
    });
    await form.submit();
    this.logger.info('Submitted the booking form with input it should reject');
    return { eventPage, bookingRequestsSent: () => sent };
  }

  /** Opens My Bookings and waits for the list to load. */
  async openMyBookings(): Promise<MyBookingsPage> {
    const myBookings = new MyBookingsPage(this.deps.page);
    await this.deps.navigator.toMyBookingsPage();
    await myBookings.waitForLoaded();
    this.logger.info('Opened My Bookings');
    return myBookings;
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

  /**
   * Submits the open booking form and returns what the page sent and what the API answered, without failing on an
   * error status: for tests where the API is expected to reject the booking.
   */
  async attemptBookingOnOpenEventPage(customer: CustomerDetails, quantity = 1): Promise<UiBookingAttempt> {
    const attempt = await this.submit(customer, quantity);
    this.logger.info('Booking attempt answered', { status: attempt.status, body: attempt.body });
    return attempt;
  }

  private async submit(customer: CustomerDetails, quantity: number): Promise<UiBookingAttempt> {
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
    // Read the body at once: after a 401 the page navigates away and the body is gone
    const text = await response.text().catch(() => '');
    const requestBody = response.request().postDataJSON() as Record<string, unknown>;
    this.logger.debug('Booking request the page sent', { requestBody, status: response.status() });
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON: keep the raw text
    }
    if (response.ok()) {
      this.deps.bookingsService.track((body as ApiSuccess<Booking>).data.id);
    }
    return { eventPage, status: response.status(), body, requestBody };
  }

  private async submitBookingForm(customer: CustomerDetails, quantity: number): Promise<UiBookingResult> {
    const { eventPage, status, body, requestBody } = await this.submit(customer, quantity);
    if (status < 200 || status >= 300) {
      this.logger.error('Booking through the UI failed', { status, url: this.deps.page.url(), body });
      throw new Error(`Booking through the UI failed: ${status} ${JSON.stringify(body)}`);
    }
    const { data: booking } = body as ApiSuccess<Booking>;
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
    return { bookingRef, booking, eventPage, requestBody };
  }
}
