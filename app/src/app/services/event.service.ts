import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of, switchMap } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Event, EventCreate, EventList } from '../models/event.model';
import { EventValidationService } from './event-validation.service';
import moment from 'moment';

// Custom error class for event conflicts
export class EventConflictError extends Error {
  constructor(public conflictDetails: string) {
    super('Event not scheduled due to conflicts.');
    this.name = 'EventConflictError';
  }
}

// Interface to match backend event structure
export interface EventDetails {
  id: number;
  name: string;
  start_time: string;
  duration: number;
  is_recurring: boolean;
  recurring_days?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = environment.apiUrl;
  private events: Event[] = [];

  constructor(
    private http: HttpClient,
    private eventValidation: EventValidationService
  ) {}

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

    // First check for conflicts
    return this.getEvents().pipe(
      switchMap(eventList => {
        const conflict = this.eventValidation.checkEventConflicts(
          formattedEvent,  // Now includes ID
          eventList.events
        );
        if (conflict) {
          return throwError(() => new EventConflictError(conflict));
        }
        
        // If no conflicts, update the event
        return this.http.put<Event>(`${this.apiUrl}/events/${id}`, formattedEvent);
      }),
      tap(updatedEvent => {
        // Update cached events
        const index = this.events.findIndex(e => e.id === id);
        if (index !== -1) {
          this.events[index] = updatedEvent;
        }
        console.log('Service Event Updated Successfully', {
          event: updatedEvent,
          timestamp: moment().format()
        });
      }),
      catchError(error => {
        console.error('Service Error Updating Event', {
          error: error,
          eventId: id,
          eventData: event,
          timestamp: moment().format()
        });
        return throwError(() => error);
      })
    );
  }

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

  deleteEvent(id: number | string): Observable<void> {
    console.log('Service Deleting Event', {
      eventId: id,
      timestamp: moment().format()
    });

    return this.http.delete<void>(`${this.apiUrl}/events/${id}`).pipe(
      tap(() => {
        // Update cached events
        this.events = this.events.filter(e => e.id !== id);
        console.log('Service Event Deleted Successfully', {
          eventId: id,
          timestamp: moment().format()
        });
      }),
      catchError(error => {
        console.error('Error Deleting Event', {
          error: error,
          eventId: id,
          timestamp: moment().format()
        });
        return throwError(() => new Error('Failed to delete event'));
      })
    );
  }
}
