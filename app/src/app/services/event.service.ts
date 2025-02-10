import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Event, EventCreate, EventList } from '../models/event.model';
import moment from 'moment'; // Use default import for moment

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEvents(start?: Date, end?: Date): Observable<EventList> {
    console.log('Fetching Events from API', {
      startTime: start?.toISOString(),
      endTime: end?.toISOString(),
      timestamp: moment().toISOString()
    });

    // Construct query parameters
    let params = new HttpParams();
    if (start) {
      params = params.set('start', start.toISOString());
    }
    if (end) {
      params = params.set('end', end.toISOString());
    }

    return this.http.get<EventList>(`${this.apiUrl}/events`, { params }).pipe(
      tap(eventList => {
        console.log('Service Retrieved Event Successfully', {
          totalEvents: eventList.events.length,
          events: eventList.events.map(event => ({
            id: event.id,
            event: event
          })),
          timestamp: moment().toISOString()
        });
      }),
      catchError(error => {
        console.error('ServiceError Fetching Events', {
          error: error,
          timestamp: moment().toISOString()
        });
        return throwError(() => new Error('Failed to fetch events'));
      })
    );
  }

  getEvent(id: number | string): Observable<Event> {
    console.log('Service Fetching Event from API', {
      eventId: id,
      timestamp: moment().toISOString()
    });

    return this.http.get<Event>(`${this.apiUrl}/events/${id}`).pipe(
      tap(event => {
        console.log('Service Event Retrieved Successfully', {
          eventId: event.id,
          eventName: event.name,
          timestamp: moment().toISOString()
        });
      }),
      catchError(error => {
        console.error('Service Error Fetching Event', {
          error: error,
          eventId: id,
          timestamp: moment().toISOString()
        });
        return throwError(() => new Error('Failed to fetch event'));
      })
    );
  }

  createEvent(event: EventCreate): Observable<Event> {
    console.log('Service Creating Event', {
      eventData: {
        name: event.name,
        start_time: event.start_time,
        duration: event.duration,
        is_recurring: event.is_recurring,
        recurring_days: event.recurring_days
      },
      timestamp: moment().toISOString()
    });

    // Validate start_time before processing
    if (!moment(event.start_time).isValid()) {
      return throwError(() => new Error('Invalid start time provided for event'));
    }

    const formattedEvent = {
      ...event,
      start_time: moment(event.start_time).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
    };

    return this.http.post<Event>(`${this.apiUrl}/events`, formattedEvent).pipe(
      tap(createdEvent => {
        console.log('Service Event Created Successfully', {
          event: createdEvent,
          timestamp: moment().toISOString()
        });
      }),
      catchError(error => {
        console.error('Service Error Creating Event', {
          error: error,
          errorStatus: error.status,
          errorBody: error.error,
          eventData: event,
          formattedEventData: formattedEvent,
          timestamp: moment().toISOString()
        });
        return throwError(() => error);
      })
    );
  }

  updateEvent(id: number | string, event: EventCreate): Observable<Event> {
    console.log('Service Updating Event', {
      eventId: id,
      event: event,
      timestamp: moment().toISOString()
    });

    // Validate start_time before processing
    if (!moment(event.start_time).isValid()) {
      return throwError(() => new Error('Invalid start time provided for event'));
    }

    const formattedEvent = {
      ...event,
      start_time: moment(event.start_time).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
    };

    return this.http.put<Event>(`${this.apiUrl}/events/${id}`, formattedEvent).pipe(
      tap(updatedEvent => {
        console.log('Service Event Updated Successfully', {
          event: updatedEvent,
          timestamp: moment().toISOString()
        });
      }),
      catchError(error => {
        console.error('Service Error Updating Event', {
          error: error,
          eventId: id,
          eventData: event,
          timestamp: moment().toISOString()
        });
        return throwError(() => error);
      })
    );
  }

  deleteEvent(id: number | string): Observable<void> {
    console.log('Service Deleting Event', {
      eventId: id,
      timestamp: moment().toISOString()
    });

    return this.http.delete<void>(`${this.apiUrl}/events/${id}`).pipe(
      tap(() => {
        console.log('Service Event Deleted Successfully', {
          eventId: id,
          timestamp: moment().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error Deleting Event', {
          error: error,
          eventId: id,
          timestamp: moment().toISOString()
        });
        return throwError(() => new Error('Failed to delete event'));
      })
    );
  }
}
