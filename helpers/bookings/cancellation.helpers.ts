import { expect } from '../../assertions';
import type { BookingsService } from '../../services';
import { Logger } from '../../utils/logger';

const logger = new Logger('booking-cancellation-helpers');

/**
 * The single place that defines what "cancelled" means (risk T3, gap G5). Today the API hard-deletes a cancelled
 * booking, so lookups by id and reference return 404. If the PO picks soft-cancel, change this function only.
 */
export async function expectBookingCancelled(
  bookingsService: Pick<BookingsService, 'fetchBooking' | 'fetchBookingByRef'>,
  booking: { id: number; bookingRef: string },
): Promise<void> {
  await expect(await bookingsService.fetchBooking(booking.id)).toHaveStatus(404);
  await expect(await bookingsService.fetchBookingByRef(booking.bookingRef)).toHaveStatus(404);
  logger.info('Booking is cancelled (no longer found by id or reference)', { bookingId: booking.id, bookingRef: booking.bookingRef });
}

/** The opposite check, for bookings that must survive an action on another booking. */
export async function expectBookingStillConfirmed(
  bookingsService: Pick<BookingsService, 'getBooking'>,
  booking: { id: number; bookingRef: string },
): Promise<void> {
  const current = await bookingsService.getBooking(booking.id);
  expect(current).toMatchObject({ bookingRef: booking.bookingRef, status: 'confirmed' });
  logger.info('Booking is still confirmed', { bookingId: booking.id, bookingRef: booking.bookingRef });
}
