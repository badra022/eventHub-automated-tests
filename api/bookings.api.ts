import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPIClient, toQueryParams, type APIClientConfig, type RequestOptions } from './baseClient';
import type { CreateBookingInput, ListBookingsQuery } from './types';

/** `/bookings`. Bodies are typed loosely so invalid payloads can be sent on purpose. */
export class BookingsAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, config: APIClientConfig) {
    super(request, config, 'bookings-api');
  }

  async list(query: ListBookingsQuery = {}, options?: RequestOptions): Promise<APIResponse> {
    return this.send('GET', '/bookings', undefined, { ...options, params: toQueryParams(query) });
  }

  async create(input: CreateBookingInput | Record<string, unknown>, options?: RequestOptions): Promise<APIResponse> {
    return this.send('POST', '/bookings', input, options);
  }

  async get(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.send('GET', `/bookings/${id}`, undefined, options);
  }

  async getByRef(ref: string, options?: RequestOptions): Promise<APIResponse> {
    return this.send('GET', `/bookings/ref/${encodeURIComponent(ref)}`, undefined, options);
  }

  async cancel(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.send('DELETE', `/bookings/${id}`, undefined, options);
  }
}
