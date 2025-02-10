import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Event, EventCreate, EventList } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<EventList> {
    return this.http.get<EventList>(`${this.apiUrl}/events`);
  }

  getEvent(id: number | string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/events/${id}`);
  }

  createEvent(event: EventCreate): Observable<Event> {
    const formattedEvent = {
      ...event,
      start_time: new Date(event.start_time).toISOString(),
    };

    return this.http.post<Event>(`${this.apiUrl}/events`, formattedEvent);
  }

  updateEvent(id: number | string, event: EventCreate): Observable<Event> {
    const formattedEvent = {
      ...event,
      start_time: new Date(event.start_time).toISOString(),
    };

    return this.http.put<Event>(`${this.apiUrl}/events/${id}`, formattedEvent);
  }

  deleteEvent(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/events/${id}`);
  }
}
