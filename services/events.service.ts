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
    return response;
  }

  /** GET /events/{id} without asserting the status. */
  async fetchEvent(id: number | string, options?: RequestOptions): Promise<APIResponse> {
    return this.client.get(id, options);
  }

  async createEvent(input: CreateEventInput): Promise<Event> {
    const { data: event } = await parseOk<ApiSuccess<Event>>(await this.client.create(input), 'Create event');
    this.track(event.id);
    logger.info('Created event', { eventId: event.id, title: event.title, price: event.price, totalSeats: event.totalSeats });
    return event;
  }

  async getEvent(id: number): Promise<Event> {
    return (await parseOk<ApiSuccess<Event>>(await this.client.get(id), `Get event ${id}`)).data;
  }

  async getAvailableSeats(id: number): Promise<number> {
    const { availableSeats } = await this.getEvent(id);
    logger.debug('Available seats', { eventId: id, availableSeats });
    return availableSeats;
  }

  async listEvents(query: ListEventsQuery = {}): Promise<Paginated<Event>> {
    return parseOk<Paginated<Event>>(await this.client.list(query), 'List events');
  }

  async deleteEvent(id: number): Promise<void> {
    await parseOk(await this.client.delete(id), `Delete event ${id}`);
    this.createdEventIds.delete(id);
    logger.info('Deleted event', { eventId: id });
  }

  /** Deletes every event this service created; events already gone (404) are ignored. */
  async cleanup(): Promise<void> {
    for (const id of [...this.createdEventIds]) {
      const response = await this.client.delete(id);
      if (!response.ok() && response.status() !== 404) {
        logger.warn('Could not delete event during cleanup', { eventId: id, status: response.status() });
        continue;
      }
      this.createdEventIds.delete(id);
    }
  }

  private track(id: number): void {
    this.createdEventIds.add(id);
  }
}
