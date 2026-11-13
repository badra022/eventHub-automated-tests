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

export const BOOKING_REF_PATTERN = /^EVT-[A-Z0-9]{6}$/;

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
    logger.info('POST booking', { status: response.status() });
    return response;
  }

  /** GET /bookings/{id} without asserting the status. */
  async fetchBooking(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.client.get(id, options);
  }

  /** GET /bookings/ref/{ref} without asserting the status. */
  async fetchBookingByRef(ref: string, options?: RequestOptions): Promise<APIResponse> {
    return this.client.getByRef(ref, options);
  }

  /** DELETE /bookings/{id} without asserting the status. */
  async requestCancel(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.client.cancel(id, options);
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const { data: booking } = await parseOk<ApiSuccess<Booking>>(await this.client.create(input), 'Create booking');
    this.track(booking.id);
    logger.info('Created booking', {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      eventId: booking.eventId,
      quantity: booking.quantity,
      totalPrice: booking.totalPrice,
    });
    return booking;
  }

  async getBooking(id: number): Promise<Booking> {
    return (await parseOk<ApiSuccess<Booking>>(await this.client.get(id), `Get booking ${id}`)).data;
  }

  async getBookingByRef(ref: string): Promise<Booking> {
    return (await parseOk<ApiSuccess<Booking>>(await this.client.getByRef(ref), `Get booking ${ref}`)).data;
  }

  async listBookings(query: ListBookingsQuery = {}): Promise<Paginated<Booking>> {
    return parseOk<Paginated<Booking>>(await this.client.list(query), 'List bookings');
  }

  async cancelBooking(id: number): Promise<void> {
    await parseOk(await this.client.cancel(id), `Cancel booking ${id}`);
    this.createdBookingIds.delete(id);
    logger.info('Cancelled booking', { bookingId: id });
  }

  /** Registers a booking created outside this service (e.g. through the UI) for cleanup. */
  track(id: number): void {
    this.createdBookingIds.add(id);
  }

  /** Cancels every tracked booking; bookings already gone (404, e.g. cascaded by an event delete) are ignored. */
  async cleanup(): Promise<void> {
    for (const id of [...this.createdBookingIds]) {
      const response = await this.client.cancel(id);
      if (!response.ok() && response.status() !== 404) {
        logger.warn('Could not cancel booking during cleanup', { bookingId: id, status: response.status() });
        continue;
      }
      this.createdBookingIds.delete(id);
    }
  }
}
