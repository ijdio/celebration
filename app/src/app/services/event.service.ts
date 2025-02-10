import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Event, EventCreate, EventList } from '../models/event.model';

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
      timestamp: new Date().toISOString()
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
        console.log('Events Retrieved Successfully', {
          totalEvents: eventList.events.length,
          events: eventList.events.map(event => ({
            id: event.id,
            name: event.name,
            start_time: event.start_time,
            is_recurring: event.is_recurring
          })),
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error Fetching Events', {
          error: error,
          timestamp: new Date().toISOString()
        });
        return throwError(() => new Error('Failed to fetch events'));
      })
    );
  }

  getEvent(id: number | string): Observable<Event> {
    console.log('Fetching Event from API', {
      eventId: id,
      timestamp: new Date().toISOString()
    });

    return this.http.get<Event>(`${this.apiUrl}/events/${id}`).pipe(
      tap(event => {
        console.log('Event Retrieved Successfully', {
          eventId: event.id,
          eventName: event.name,
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error Fetching Event', {
          error: error,
          eventId: id,
          timestamp: new Date().toISOString()
        });
        return throwError(() => new Error('Failed to fetch event'));
      })
    );
  }

  createEvent(event: EventCreate): Observable<Event> {
    console.log('Creating Event', {
      eventData: {
        name: event.name,
        start_time: event.start_time,
        duration: event.duration,
        is_recurring: event.is_recurring,
        recurring_days: event.recurring_days
      },
      timestamp: new Date().toISOString()
    });

    const formattedEvent = {
      ...event,
      start_time: new Date(event.start_time).toISOString(),
    };

    return this.http.post<Event>(`${this.apiUrl}/events`, formattedEvent).pipe(
      tap(createdEvent => {
        console.log('Event Created Successfully', {
          eventId: createdEvent.id,
          eventName: createdEvent.name,
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error Creating Event', {
          error: error,
          errorStatus: error.status,
          errorBody: error.error,
          eventData: event,
          formattedEventData: formattedEvent,
          timestamp: new Date().toISOString()
        });
        return throwError(() => error);
      })
    );
  }

  updateEvent(id: number | string, event: EventCreate): Observable<Event> {
    console.log('Updating Event', {
      eventId: id,
      eventData: {
        name: event.name,
        start_time: event.start_time,
        duration: event.duration,
        is_recurring: event.is_recurring,
        recurring_days: event.recurring_days
      },
      timestamp: new Date().toISOString()
    });

    const formattedEvent = {
      ...event,
      start_time: new Date(event.start_time).toISOString(),
    };

    return this.http.put<Event>(`${this.apiUrl}/events/${id}`, formattedEvent).pipe(
      tap(updatedEvent => {
        console.log('Event Updated Successfully', {
          eventId: updatedEvent.id,
          eventName: updatedEvent.name,
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error Updating Event', {
          error: error,
          eventId: id,
          eventData: event,
          timestamp: new Date().toISOString()
        });
        return throwError(() => new Error('Failed to update event'));
      })
    );
  }

  deleteEvent(id: number | string): Observable<void> {
    console.log('Deleting Event', {
      eventId: id,
      timestamp: new Date().toISOString()
    });

    return this.http.delete<void>(`${this.apiUrl}/events/${id}`).pipe(
      tap(() => {
        console.log('Event Deleted Successfully', {
          eventId: id,
          timestamp: new Date().toISOString()
        });
      }),
      catchError(error => {
        console.error('Error Deleting Event', {
          error: error,
          eventId: id,
          timestamp: new Date().toISOString()
        });
        return throwError(() => new Error('Failed to delete event'));
      })
    );
  }
}
