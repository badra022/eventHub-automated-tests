import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { RequestOptions } from '../api/baseClient';
import { BookingsAPIClient } from '../api/bookings.api';
import type { ApiSuccess, Booking, CreateBookingInput, ListBookingsQuery, Paginated } from '../api/types';
import { Logger } from '../utils/logger';
import { parseOk } from './response';

const logger = new Logger('bookings-service');

export interface BookingsServiceConfig {
  baseUrl: string;
  token: string;
}

// The OpenAPI spec documents EVT-XXXXXX; the API returns <first letter of the event title>-XXXXXX
export const BOOKING_REF_PATTERN = /^[A-Z0-9]-[A-Z0-9]{6}$/;

/**
 * Bookings of the current user's sandbox (max 9; a 10th silently evicts the oldest).
 * Bookings created through this service are cancelled by `cleanup()`; bookings made in the UI can be
 * registered with `track()` so they are cleaned up too.
 */
export class BookingsService {
  private readonly client: BookingsAPIClient;
  private readonly createdBookingIds = new Set<number>();

  constructor(request: APIRequestContext, config: BookingsServiceConfig) {
    this.client = new BookingsAPIClient(request, config);
  }

  /** POST /bookings without asserting the status (validation, seat and auth tests). */
  async requestBooking(payload: CreateBookingInput | Record<string, unknown>, options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.create(payload, options);
    if (response.ok()) {
      this.track(((await response.json()) as ApiSuccess<Booking>).data.id);
    }
    logger.info('Sent create booking request', { status: response.status() });
    return response;
  }

  /** GET /bookings/{id} without asserting the status. */
  async fetchBooking(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.get(id, options);
    logger.info('Sent GET booking', { bookingId: id, status: response.status() });
    return response;
  }

  /** GET /bookings/ref/{ref} without asserting the status. */
  async fetchBookingByRef(ref: string, options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.getByRef(ref, options);
    logger.info('Sent GET booking by reference', { bookingRef: ref, status: response.status() });
    return response;
  }

  /** DELETE /bookings/{id} without asserting the status. */
  async requestCancel(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.cancel(id, options);
    logger.info('Sent cancel booking request', { bookingId: id, status: response.status() });
    return response;
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    logger.debug('Creating booking', { input });
    const { data: booking } = await parseOk<ApiSuccess<Booking>>(await this.client.create(input), 'Create booking');
    this.track(booking.id);
    logger.info('Created booking', {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      eventId: booking.eventId,
      quantity: booking.quantity,
      totalPrice: booking.totalPrice,
    });
    logger.debug('Created booking details', { booking });
    return booking;
  }

  async getBooking(id: number): Promise<Booking> {
    const { data: booking } = await parseOk<ApiSuccess<Booking>>(await this.client.get(id), `Get booking ${id}`);
    logger.debug('Fetched booking', { booking });
    return booking;
  }

  async getBookingByRef(ref: string): Promise<Booking> {
    const { data: booking } = await parseOk<ApiSuccess<Booking>>(await this.client.getByRef(ref), `Get booking ${ref}`);
    logger.info('Found booking by reference', { bookingRef: ref, bookingId: booking.id, status: booking.status });
    logger.debug('Fetched booking', { booking });
    return booking;
  }

  async listBookings(query: ListBookingsQuery = {}): Promise<Paginated<Booking>> {
    const page = await parseOk<Paginated<Booking>>(await this.client.list(query), 'List bookings');
    logger.info('Listed bookings', { query, returned: page.data.length, pagination: page.pagination });
    logger.debug('Listed booking refs', { refs: page.data.map((booking) => booking.bookingRef) });
    return page;
  }

  async cancelBooking(id: number): Promise<void> {
    await parseOk(await this.client.cancel(id), `Cancel booking ${id}`);
    this.createdBookingIds.delete(id);
    logger.info('Cancelled booking', { bookingId: id });
  }

  /** Registers a booking created outside this service (e.g. through the UI) for cleanup. */
  track(id: number): void {
    this.createdBookingIds.add(id);
    logger.debug('Tracking booking for cleanup', { bookingId: id, tracked: this.createdBookingIds.size });
  }

  /** Cancels every tracked booking; bookings already gone (404, e.g. cascaded by an event delete) are ignored. */
  async cleanup(): Promise<void> {
    if (this.createdBookingIds.size === 0) return;
    const ids = [...this.createdBookingIds];
    for (const id of ids) {
      const response = await this.client.cancel(id);
      if (!response.ok() && response.status() !== 404) {
        logger.warn('Could not cancel booking during cleanup; it counts towards the 9-booking sandbox limit', {
          bookingId: id,
          status: response.status(),
        });
        continue;
      }
      this.createdBookingIds.delete(id);
    }
    logger.info('Cleaned up bookings', { cancelled: ids.length - this.createdBookingIds.size, left: [...this.createdBookingIds] });
  }
}
