/**
 * Event Service module for managing event-related operations
 * 
 * Provides comprehensive functionality for:
 * - Fetching events
 * - Creating events
 * - Updating events
 * - Validating event conflicts
 * 
 * @module EventService
 * @description Centralized service for event data management and interaction with backend API
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of, switchMap } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Event, EventCreate, EventList } from '../models/event.model';
import { EventValidationService } from './event-validation.service';
import moment from 'moment';

/**
 * Custom error class for handling event scheduling conflicts
 * 
 * @class
 * @extends {Error}
 * @description Provides detailed error information when an event cannot be scheduled
 */
export class EventConflictError extends Error {
  /**
   * Creates an instance of EventConflictError
   * 
   * @param {string} conflictDetails - Detailed description of the conflict
   */
  constructor(public conflictDetails: string) {
    super('Event not scheduled due to conflicts.');
    this.name = 'EventConflictError';
  }
}

/**
 * Interface defining the structure of event details from the backend
 * 
 * @interface
 * @description Represents the core properties of an event as returned by the API
 */
export interface EventDetails {
  /** Unique identifier for the event */
  id: number;
  /** Name or title of the event */
  name: string;
  /** Start time of the event in ISO string format */
  start_time: string;
  /** Duration of the event in minutes */
  duration: number;
  /** Flag indicating if the event is recurring */
  is_recurring: boolean;
  /** Optional list of days for recurring events */
  recurring_days?: string | null;
}

/**
 * Event Service for managing event-related HTTP operations
 * 
 * Features:
 * - Fetching events with optional date range
 * - Creating new events with conflict checking
 * - Updating existing events
 * - Detailed logging and error handling
 * 
 * @class
 */
@Injectable({
  providedIn: 'root'
})
export class EventService {
  /** Base URL for API endpoints from environment configuration */
  private apiUrl = environment.apiUrl;

  /** Local cache of events for conflict checking */
  private events: Event[] = [];

  /**
   * Creates an instance of EventService
   * 
   * @param {HttpClient} http - Angular's HTTP client for making API requests
   * @param {EventValidationService} eventValidation - Service for validating event conflicts
   */
  constructor(
    private http: HttpClient,
    private eventValidation: EventValidationService
  ) {}

  /**
   * Fetches events from the backend API
   * 
   * @param {Date} [start] - Optional start date to filter events
   * @param {Date} [end] - Optional end date to filter events
   * @returns {Observable<EventList>} Observable of event list
   */
  getEvents(start?: Date, end?: Date): Observable<EventList> {
    console.log('Fetching Events from API', {
      startTime: start ? moment(start).format() : undefined,
      endTime: end ? moment(end).format() : undefined,
      timestamp: new Date().toISOString()
    });

    let params = new HttpParams();
    if (start) {
      params = params.set('start', moment(start).format());
    }
    if (end) {
      params = params.set('end', moment(end).format());
    }

    return this.http.get<EventList>(`${this.apiUrl}/events`, { params }).pipe(
      tap(eventList => {
        this.events = eventList.events; // Cache events for conflict checking
        console.log('Service Retrieved Events Successfully', {
          totalEvents: eventList.events.length,
          events: eventList.events,
          timestamp: new Date().toISOString()
        });

        // Log detailed event properties
        eventList.events.forEach(event => {
          console.log('Event Details:', {
            id: event.id,
            name: event.name,
            start_time: event.start_time,
            duration: event.duration,
            is_recurring: event.is_recurring,
            recurring_days: event.recurring_days
          });
        });
      }),
      catchError(error => {
        console.error('Service Event Retrieval Error', {
          error: error,
          timestamp: new Date().toISOString()
        });
        return throwError(() => new Error('Failed to fetch events'));
      })
    );
  }

  /**
   * Retrieves a specific event by its ID
   * 
   * @param {number | string} id - Unique identifier of the event
   * @returns {Observable<Event>} Observable of the event details
   */
  getEvent(id: number | string): Observable<Event> {
    console.log('Service Fetching Event from API', {
      eventId: id,
      timestamp: moment().format()
    });

    return this.http.get<Event>(`${this.apiUrl}/events/${id}`).pipe(
      tap(event => {
        console.log('Service Event Retrieved Successfully', {
          eventId: event.id,
          eventName: event.name,
          timestamp: moment().format()
        });
      }),
      catchError(error => {
        console.error('Service Error Fetching Event', {
          error: error,
          eventId: id,
          timestamp: moment().format()
        });
        return throwError(() => new Error('Failed to fetch event'));
      })
    );
  }

  /**
   * Retrieves detailed event information by its ID
   * 
   * @param {string} eventId - Unique identifier of the event
   * @returns {Observable<EventDetails>} Observable of event details
   */
  getEventById(eventId: string): Observable<EventDetails> {
    return this.http.get<EventDetails>(`${this.apiUrl}/events/${eventId}`).pipe(
      tap(event => {
        console.log('Retrieved Event Details', {
          eventId,
          event,
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error retrieving event details', {
          eventId,
          error,
          timestamp: new Date().toISOString()
        });
        return throwError(() => new Error('Failed to retrieve event details'));
      })
    );
  }

  /**
   * Creates a new event after checking for scheduling conflicts
   * 
   * @param {EventCreate} event - Event details to be created
   * @returns {Observable<Event>} Observable of the created event
   * @throws {EventConflictError} If the event conflicts with existing events
   */
  createEvent(event: EventCreate): Observable<Event> {
    console.log('Service Creating Event', {
      eventData: event,
      timestamp: new Date().toISOString()
    });

    // Log detailed event properties
    console.log('Event Creation Details:', {
      name: event.name,
      start_time: event.start_time,
      duration: event.duration,
      is_recurring: event.is_recurring,
      recurring_days: event.recurring_days
    });

    // Validate start_time using moment
    if (!moment(event.start_time).isValid()) {
      return throwError(() => new Error('Invalid start time provided for event'));
    }

    // Format the event data using moment
    const formattedEvent: EventCreate = {
      ...event,
      start_time: moment(event.start_time).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
    };

    // First check for conflicts
    return this.getEvents().pipe(
      switchMap(eventList => {
        const conflict = this.eventValidation.checkEventConflicts(formattedEvent, eventList.events);
        if (conflict) {
          return throwError(() => new EventConflictError(conflict));
        }
        
        // If no conflicts, create the event
        return this.http.post<Event>(`${this.apiUrl}/events`, formattedEvent);
      }),
      tap(createdEvent => {
        this.events.push(createdEvent); // Update cached events
        console.log('Service Event Created Successfully', {
          event: createdEvent,
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Service Event Creation Error', {
          error: error,
          eventData: event,
          timestamp: new Date().toISOString()
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Updates an existing event after checking for scheduling conflicts
   * 
   * @param {number | string} id - Unique identifier of the event to update
   * @param {EventCreate} event - Updated event details
   * @returns {Observable<Event>} Observable of the updated event
   * @throws {EventConflictError} If the updated event conflicts with existing events
   */
  updateEvent(id: number | string, event: EventCreate): Observable<Event> {
    console.log('Service Updating Event', {
      eventId: id,
      event: event,
      timestamp: moment().format()
    });

    // Validate start_time using moment
    if (!moment(event.start_time).isValid()) {
      return throwError(() => new Error('Invalid start time provided for event'));
    }

    // Format the event data using moment
    const formattedEvent: EventCreate = {
      ...event,
      id,  // Include ID explicitly
      start_time: moment(event.start_time).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
    };

    // First check for conflicts, excluding the current event
    return this.getEvents().pipe(
      switchMap(eventList => {
        // Filter out the current event being updated from conflict check
        const filteredEvents = eventList.events.filter(e => e.id !== id);
        
        const conflict = this.eventValidation.checkEventConflicts(formattedEvent, filteredEvents);
        if (conflict) {
          return throwError(() => new EventConflictError(conflict));
        }
        
        // If no conflicts, update the event
        return this.http.put<Event>(`${this.apiUrl}/events/${id}`, formattedEvent);
      }),
      tap(updatedEvent => {
        // Update the cached events list
        const index = this.events.findIndex(e => e.id === updatedEvent.id);
        if (index !== -1) {
          this.events[index] = updatedEvent;
        }

        console.log('Service Event Updated Successfully', {
          event: updatedEvent,
          timestamp: moment().format()
        });
      }),
      catchError(error => {
        console.error('Service Event Update Error', {
          error: error,
          eventId: id,
          eventData: event,
          timestamp: moment().format()
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Updates the time of an existing event
   * 
   * @param {string} eventId - Unique identifier of the event to update
   * @param {string} newStartTime - New start time of the event
   * @param {number} newDuration - New duration of the event
   * @returns {Observable<any>} Observable indicating successful update
   */
  updateEventTime(eventId: string, newStartTime: string, newDuration: number): Observable<any> {
    // First, get the full event details
    return this.getEventById(eventId).pipe(
      switchMap(existingEvent => {
        // Prepare the full update payload
        const updatePayload: EventDetails = {
          id: existingEvent.id,
          name: existingEvent.name,
          start_time: newStartTime,
          duration: newDuration,
          is_recurring: existingEvent.is_recurring,
          // Convert recurring_days to comma-separated string or null
          recurring_days: existingEvent.recurring_days 
            ? (Array.isArray(existingEvent.recurring_days) 
                ? existingEvent.recurring_days.join(',') 
                : existingEvent.recurring_days)
            : null
        };

        console.log('Event Update Payload', {
          payload: updatePayload,
          timestamp: new Date().toISOString()
        });

        return this.http.put<any>(`${this.apiUrl}/events/${existingEvent.id}`, updatePayload).pipe(
          tap(response => {
            console.log('Event time updated successfully', {
              eventId,
              newStartTime,
              newDuration,
              response,
              timestamp: new Date().toISOString()
            });
          }),
          catchError(error => {
            console.error('Detailed Error updating event time', {
              eventId,
              payload: updatePayload,
              errorStatus: error.status,
              errorBody: error.error,
              errorMessage: error.message,
              timestamp: new Date().toISOString()
            });
            
            // If there's a specific error message from the backend, use it
            const errorMessage = error.error?.message || 
              error.error?.detail || 
              'Failed to update event time';
            
            return throwError(() => new Error(errorMessage));
          })
        );
      }),
      catchError(error => {
        console.error('Error in event update process', {
          eventId,
          error,
          timestamp: new Date().toISOString()
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Deletes an event by its ID
   * 
   * @param {number | string} id - Unique identifier of the event to delete
   * @returns {Observable<void>} Observable indicating successful deletion
   */
  deleteEvent(id: number | string): Observable<void> {
    console.log('Service Deleting Event', {
      eventId: id,
      timestamp: moment().format()
    });

    return this.http.delete<void>(`${this.apiUrl}/events/${id}`).pipe(
      tap(() => {
        // Remove the event from cached events
        this.events = this.events.filter(e => e.id !== id);

        console.log('Service Event Deleted Successfully', {
          eventId: id,
          timestamp: moment().format()
        });
      }),
      catchError(error => {
        console.error('Service Event Deletion Error', {
          error: error,
          eventId: id,
          timestamp: moment().format()
        });
        return throwError(() => new Error('Failed to delete event'));
      })
    );
  }
}
