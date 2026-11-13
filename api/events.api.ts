import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPIClient, toQueryParams, type APIClientConfig, type RequestOptions } from './baseClient';
import type { CreateEventInput, ListEventsQuery } from './types';

/** `/events` CRUD. Bodies are typed loosely so invalid payloads can be sent on purpose. */
export class EventsAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, config: APIClientConfig) {
    super(request, config, 'events-api');
  }

  async list(query: ListEventsQuery = {}, options?: RequestOptions): Promise<APIResponse> {
    return this.send('GET', '/events', undefined, { ...options, params: toQueryParams(query) });
  }

  async create(input: CreateEventInput | Record<string, unknown>, options?: RequestOptions): Promise<APIResponse> {
    return this.send('POST', '/events', input, options);
  }

  async get(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.send('GET', `/events/${id}`, undefined, options);
  }

  async update(id: number | string, input: CreateEventInput | Record<string, unknown>, options?: RequestOptions): Promise<APIResponse> {
    return this.send('PUT', `/events/${id}`, input, options);
  }

  /** Also deletes every booking of the event (cascade). */
  async delete(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.send('DELETE', `/events/${id}`, undefined, options);
  }
}
