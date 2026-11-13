/** Wire contracts of the EventHub REST API (OpenAPI: https://api.eventhub.rahulshettyacademy.com/api/docs/) */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  details: { field: string; message: string }[];
}

// --- Auth ---

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: true;
  /** JWT valid for 7 days, sent as `Authorization: Bearer <token>` */
  token: string;
  user: { id: number; email: string };
}

export interface MeResponse {
  success: true;
  user: { userId: number; email: string };
}

// --- Events ---

export type EventCategory = 'Conference' | 'Concert' | 'Sports' | 'Workshop' | 'Festival';

export interface CreateEventInput {
  title: string;
  description?: string;
  category: EventCategory | string;
  venue: string;
  city: string;
  eventDate: string;
  price: number;
  totalSeats: number;
  imageUrl?: string;
}

export interface Event extends CreateEventInput {
  id: number;
  availableSeats: number;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListEventsQuery {
  category?: EventCategory;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// --- Bookings ---

export type BookingStatus = 'confirmed' | 'cancelled';

export interface CreateBookingInput {
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
}

export interface Booking extends CreateBookingInput {
  id: number;
  totalPrice: number;
  status: BookingStatus;
  /** Format EVT-XXXXXX */
  bookingRef: string;
  createdAt: string;
  updatedAt: string;
  event: Event;
}

export interface ListBookingsQuery {
  eventId?: number;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

// --- Health ---

export interface HealthResponse {
  status: string;
  timestamp: string;
  dbStatus: string;
}
