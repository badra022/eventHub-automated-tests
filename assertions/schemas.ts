import { z } from 'zod';
import { BOOKING_REF_PATTERN } from '../services';

/** Response contracts as the API serves them today; where it differs from the OpenAPI spec, the comment says so. */

// Spec: number. The API serialises decimals as strings, e.g. "1500" or "299.97"
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'decimal serialised as a string');

export const EventSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  venue: z.string().min(1),
  city: z.string().min(1),
  eventDate: z.iso.datetime(),
  price: decimalString,
  totalSeats: z.number().int().positive(),
  availableSeats: z.number().int().nonnegative(),
  imageUrl: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const BookingSchema = z.object({
  id: z.number().int().positive(),
  eventId: z.number().int().positive(),
  customerName: z.string().min(2),
  customerEmail: z.email(),
  customerPhone: z.string().min(10),
  quantity: z.number().int().min(1).max(10),
  totalPrice: decimalString,
  status: z.enum(['confirmed', 'cancelled']),
  // Spec: EVT-XXXXXX
  bookingRef: z.string().regex(BOOKING_REF_PATTERN),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  event: EventSchema,
});

export const CreateBookingResponseSchema = z.object({
  success: z.literal(true),
  data: BookingSchema,
  message: z.string().min(1),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1),
});

export const ValidationErrorResponseSchema = ErrorResponseSchema.extend({
  details: z.array(z.object({ field: z.string().min(1), message: z.string().min(1) })).min(1),
});
