import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import momentPlugin from '@fullcalendar/moment';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import moment from 'moment';

import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EventService } from '../../services/event.service';
import { Event } from '../../models/event.model';

interface EventCreate {
  name: string;
  start_time: string;
  duration: number;
  is_recurring: boolean;
  recurring_days?: string[];
}

interface EventDialogData {
  id?: string | number;
  event?: Event;
  isEditMode?: boolean;
  start?: Date | null;
  end?: Date | null;
  is_recurring?: boolean;
  recurring_days?: string[];
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    FullCalendarModule
  ]
})
export class CalendarComponent implements OnInit {
  calendarOptions: CalendarOptions;
  currentEvents: EventApi[] = [];

  constructor(
    @Inject(MatDialog) private dialog: MatDialog,
    @Inject(MatSnackBar) private snackBar: MatSnackBar,
    @Inject(EventService) private eventService: EventService
  ) {
    this.calendarOptions = {
      plugins: [
        dayGridPlugin,
        timeGridPlugin,
        interactionPlugin,
        momentPlugin,
        rrulePlugin
      ],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      initialView: 'dayGridMonth',
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      select: this.handleDateSelect.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventsSet: this.handleEvents.bind(this)
    };
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      next: (eventList: { events: Event[] }) => {
        console.log('Events Loaded Successfully', {
          totalEvents: eventList.events.length,
          events: eventList.events.map((event: Event) => ({
            id: event.id,
            name: event.name,
            startTime: event.start_time,
            isRecurring: event.is_recurring,
            recurringDays: event.recurring_days
          })),
          timestamp: new Date().toISOString()
        });

        // Map events to calendar events
        const calendarEvents = this.mapToCalendarEvents(eventList.events);
        
        // Clear existing events and add new ones
        this.calendarOptions.events = calendarEvents;
      },
      error: (error: Error) => {
        console.error('Failed to Load Events', {
          error: error,
          timestamp: new Date().toISOString()
        });
        this.snackBar.open('Failed to load events', 'Close', { duration: 3000 });
      }
    });
  }

  mapToCalendarEvents(events: Event[]): EventInput[] {
    console.log('Mapping Events to Calendar Format', {
      totalEvents: events.length,
      timestamp: new Date().toISOString()
    });

    return events.map(event => {
      const start = moment.utc(event.start_time).local();
      const end = start.clone().add(event.duration, 'minutes');
      
      // Create an EventInput object that matches FullCalendar's type requirements
      const calendarEvent: EventInput = {
        id: event.id.toString(), // Convert to string
        title: event.name,
        start: start.format(),
        end: end.format(),
        allDay: false, // Assuming these are not all-day events
        extendedProps: {
          // Include additional event details
          originalEvent: event,
          duration: event.duration,
          isRecurring: event.is_recurring,
          recurringDays: event.recurring_days
        }
      };

      // Map recurring events to FullCalendar's rrule format
      if (event.is_recurring && event.recurring_days && event.recurring_days.length > 0) {
        // Convert backend day abbreviations to FullCalendar's daysOfWeek
        const dayMapping: {[key: string]: string} = {
          'MO': 'MO', // Monday
          'TU': 'TU', // Tuesday
          'WE': 'WE', // Wednesday
          'TH': 'TH', // Thursday
          'FR': 'FR', // Friday
          'SA': 'SA', // Saturday
          'SU': 'SU'  // Sunday
        };

        calendarEvent.rrule = {
          freq: 'weekly',
          byweekday: event.recurring_days.map(day => dayMapping[day])
        };

        console.log('Recurring Event Mapped', {
          eventId: event.id,
          recurringDays: event.recurring_days,
          timestamp: new Date().toISOString()
        });
      }

      return calendarEvent;
    });
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    const dialogData: EventDialogData = {
      start: selectInfo.start,
      end: selectInfo.end
    };

    this.openEventDialog(dialogData);
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const event = clickInfo.event;
    const originalEvent = event.extendedProps['originalEvent'] as Event;
    
    const dialogData: EventDialogData = {
      id: event.id as string | number,
      event: originalEvent,
      isEditMode: true,
      start: event.start ?? null,
      end: event.end ?? null,
      is_recurring: originalEvent.is_recurring || false,
      recurring_days: originalEvent.is_recurring ? 
        (originalEvent.recurring_days || []) : 
        undefined
    };

    console.log('Event Click Dialog Data:', dialogData);

    this.openEventDialog(dialogData);
  }

  openEventDialog(dialogData?: EventDialogData): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '500px';
    dialogConfig.data = dialogData || {};

    const dialogRef = this.dialog.open(EventDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: any) => {
      console.log("Dialog Result:", result);

      // Check if result is valid and has the expected structure
      if (result && result.action === 'save') {
        // Prepare event data to match backend schema
        const eventCreate: EventCreate = {
          name: result.name,
          start_time: moment(result.start).utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
          duration: moment(result.end).diff(moment(result.start), 'minutes'),
          is_recurring: result.is_recurring || false,
          recurring_days: result.is_recurring && result.recurring_days 
            ? result.recurring_days.map((day: string) => day.toUpperCase()) 
            : undefined
        };

        // Log the event data being sent
        console.log('Preparing to send event data:', eventCreate);

        // Determine if this is a new event or an update
        if (dialogData && dialogData.id) {
          // Update existing event
          this.eventService.updateEvent(dialogData.id, eventCreate).subscribe({
            next: () => {
              this.loadEvents(); // Reload events after update
              this.snackBar.open('Event updated successfully', 'Close', { duration: 3000 });
            },
            error: (error) => {
              console.error('Error updating event:', error);
              this.snackBar.open('Failed to update event', 'Close', { duration: 3000 });
            }
          });
        } else {
          // Create new event
          this.eventService.createEvent(eventCreate).subscribe({
            next: () => {
              this.loadEvents(); // Reload events after creation
              this.snackBar.open('Event created successfully', 'Close', { duration: 3000 });
            },
            error: (error) => {
              console.error('Error creating event:', error);
              this.snackBar.open('Failed to create event', 'Close', { duration: 3000 });
            }
          });
        }
      } else if (result && result.action === 'delete' && dialogData && dialogData.id) {
        // Handle event deletion
        this.eventService.deleteEvent(dialogData.id).subscribe({
          next: () => {
            this.loadEvents(); // Reload events after deletion
            this.snackBar.open('Event deleted successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting event:', error);
            this.snackBar.open('Failed to delete event', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  handleEvents(events: EventApi[]): void {
    this.currentEvents = events;
  }
}
