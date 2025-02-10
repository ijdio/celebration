import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import momentPlugin from '@fullcalendar/moment';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import moment from 'moment';

import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EventService } from '../../services/event.service';
import { Event, CalendarEvent, EventCreate } from '../../models/event.model';

interface EventDialogData {
  id?: string | number;
  name?: string;
  start: Date | null;
  end: Date | null;
  is_recurring?: boolean;
  recurring_days?: string[];
}

interface EventDialogResult extends EventDialogData {
  action?: 'save' | 'delete';
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private eventService = inject(EventService);

  calendarOptions: CalendarOptions = {
    plugins: [
      momentPlugin,
      dayGridPlugin, 
      timeGridPlugin, 
      interactionPlugin,
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
    titleFormat: 'MMMM D, YYYY', // Use moment formatting
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this)
  };

  currentEvents: EventApi[] = [];

  constructor() {}

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getEvents().subscribe({
      next: (response) => {
        const calendarEvents = this.mapToCalendarEvents(response.events);
        this.calendarOptions.events = calendarEvents as any;
      },
      error: (err) => {
        this.snackBar.open('Failed to load events', 'Close', { duration: 3000 });
      }
    });
  }

  mapToCalendarEvents(events: Event[]): CalendarEvent[] {
    return events.map(event => {
      const start = moment.utc(event.start_time).local();
      const end = start.clone().add(event.duration, 'minutes');
      
      const calendarEvent: CalendarEvent = {
        ...event,
        title: event.name,
        start: start.format(),
        end: end.format(),
        id: event.id.toString() // Convert id to string
      };

      if (event.is_recurring && event.recurring_days) {
        calendarEvent.rrule = {
          freq: 'weekly',
          byweekday: event.recurring_days.map(day => day.toLowerCase())
        };
      }

      return calendarEvent;
    });
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    const dialogConfig = new MatDialogConfig<EventDialogData>();
    dialogConfig.data = {
      start: selectInfo.start,
      end: selectInfo.end
    };

    const dialogRef = this.dialog.open(EventDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: EventDialogResult | undefined) => {
      if (result && result.action === 'save' && result.start && result.end) {
        const eventCreate: EventCreate = {
          name: result.name || '',
          start_time: moment(result.start).utc().format(),
          duration: moment(result.end).diff(moment(result.start), 'minutes'),
          is_recurring: result.is_recurring || false,
          recurring_days: result.recurring_days
        };

        this.eventService.createEvent(eventCreate).subscribe({
          next: (event) => {
            this.loadEvents();
            this.snackBar.open('Event created successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            this.snackBar.open('Failed to create event', 'Close', { duration: 3000 });
          }
        });
      }
      selectInfo.view.calendar.unselect();
    });
  }

  handleEventClick(clickInfo: EventClickArg) {
    const event = clickInfo.event;
    const eventId = event.id || event.extendedProps['id'];
    
    // Ensure eventId is valid before opening confirmation dialog
    if (!eventId) {
      this.snackBar.open('Unable to identify event', 'Close', { duration: 3000 });
      return;
    }
    
    // Open confirmation dialog directly on event click
    const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Event',
        message: `Are you sure you want to delete the event "${event.title}"?`
      }
    });

    confirmDialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        // Proceed with deletion
        this.eventService.deleteEvent(eventId).subscribe({
          next: () => {
            clickInfo.event.remove();
            this.snackBar.open('Event deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            this.snackBar.open('Failed to delete event', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  handleEvents(events: EventApi[]) {
    this.currentEvents = events;
  }
}
