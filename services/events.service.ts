import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { RequestOptions } from '../api/baseClient';
import { EventsAPIClient } from '../api/events.api';
import type { ApiSuccess, CreateEventInput, Event, ListEventsQuery, Paginated } from '../api/types';
import { Logger } from '../utils/logger';
import { parseOk } from './response';

const logger = new Logger('events-service');

export interface EventsServiceConfig {
  baseUrl: string;
  token: string;
}

/**
 * Events of the current user's sandbox. Tests create the exact events they book against;
 * every event created through this service is deleted by `cleanup()` (deleting an event also deletes its bookings).
 */
export class EventsService {
  private readonly client: EventsAPIClient;
  private readonly createdEventIds = new Set<number>();

  constructor(request: APIRequestContext, config: EventsServiceConfig) {
    this.client = new EventsAPIClient(request, config);
  }

  /** POST /events without asserting the status. */
  async requestCreate(input: CreateEventInput | Record<string, unknown>, options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.create(input, options);
    if (response.ok()) {
      this.track(((await response.json()) as ApiSuccess<Event>).data.id);
    }
    logger.info('Sent create event request', { status: response.status() });
    return response;
  }

  /** GET /events/{id} without asserting the status. */
  async fetchEvent(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.get(id, options);
    logger.info('Sent GET event', { eventId: id, status: response.status() });
    return response;
  }

  async createEvent(input: CreateEventInput): Promise<Event> {
    logger.debug('Creating event', { input });
    const { data: event } = await parseOk<ApiSuccess<Event>>(await this.client.create(input), 'Create event');
    this.track(event.id);
    logger.info('Created event', { eventId: event.id, title: event.title, price: event.price, totalSeats: event.totalSeats });
    logger.debug('Created event details', { event });
    return event;
  }

  async getEvent(id: number): Promise<Event> {
    const { data: event } = await parseOk<ApiSuccess<Event>>(await this.client.get(id), `Get event ${id}`);
    logger.debug('Fetched event', { event });
    return event;
  }

  async getAvailableSeats(id: number): Promise<number> {
    const { availableSeats } = await this.getEvent(id);
    logger.info('Read available seats', { eventId: id, availableSeats });
    return availableSeats;
  }

  async listEvents(query: ListEventsQuery = {}): Promise<Paginated<Event>> {
    const page = await parseOk<Paginated<Event>>(await this.client.list(query), 'List events');
    logger.info('Listed events', { query, returned: page.data.length, pagination: page.pagination });
    logger.debug('Listed event ids', { ids: page.data.map((event) => event.id) });
    return page;
  }

  async deleteEvent(id: number): Promise<void> {
    await parseOk(await this.client.delete(id), `Delete event ${id}`);
    this.createdEventIds.delete(id);
    logger.info('Deleted event', { eventId: id });
  }

  /** Deletes every event this service created; events already gone (404) are ignored. */
  async cleanup(): Promise<void> {
    if (this.createdEventIds.size === 0) return;
    const ids = [...this.createdEventIds];
    for (const id of ids) {
      const response = await this.client.delete(id);
      if (!response.ok() && response.status() !== 404) {
        logger.warn('Could not delete event during cleanup; it stays in the sandbox (limit 6 custom events)', {
          eventId: id,
          status: response.status(),
        });
        continue;
      }
      this.createdEventIds.delete(id);
    }
    logger.info('Cleaned up events', { deleted: ids.length - this.createdEventIds.size, left: [...this.createdEventIds] });
  }

  private track(id: number): void {
    this.createdEventIds.add(id);
  }
}
