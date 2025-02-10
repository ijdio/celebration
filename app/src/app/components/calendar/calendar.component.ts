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

// Angular Material Date Imports
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule } from '@angular/material-moment-adapter';

// Custom date formats using moment
export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'LL',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

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
    FullCalendarModule,
    MatDatepickerModule,
    MatMomentDateModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } }
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
      height: 'auto',
      stickyHeaderDates: false,
      select: this.handleDateSelect.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventsSet: this.handleEvents.bind(this),
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: '09:00', // 9:00 AM
        endTime: '17:00'    // 5:00 PM
      },
      allDaySlot: false, // Remove all-day slot
    };
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      next: (eventList: { events: Event[] }) => {
        console.log('Calendar Loaded Events Successfully', {
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
        console.error('Calendar Failed to Load Events', {
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
      events: events,
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
        duration: { minutes: event.duration }, // Add duration directly to the event
        allDay: false, // Assuming these are not all-day events
        extendedProps: {
          // Include additional event details
          originalEvent: event,
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

        // Parse start moment and calculate one year later
        const startMoment = moment(start);
        const oneYearLater = startMoment.clone().add(1, 'year');

        calendarEvent.rrule = {
          freq: 'weekly',
          byweekday: event.recurring_days.map(day => dayMapping[day]),
          dtstart: startMoment.toISOString(),
          until: oneYearLater.toISOString()
        };

        console.log('Recurring Event Mapped', {
          event: event,
          startDate: startMoment.toISOString(),
          endDate: oneYearLater.toISOString(),
          recurringDays: event.recurring_days,
          timestamp: moment().toISOString()
        });
      }
      return calendarEvent;
    });
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    // Use moment for all date manipulations
    const startDate = moment(selectInfo.start);
    const endDate = selectInfo.end 
      ? moment(selectInfo.end)
      : startDate.clone().add(30, 'minutes');

    // Log date selection details with moment
    console.log('Date Select Details:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startType: typeof startDate,
      endType: typeof endDate
    });

    const dialogData: EventDialogData = {
      start: startDate.toDate(),
      end: endDate.toDate(),
      isEditMode: false
    };

    this.openEventDialog(dialogData);
  }

  handleEventClick(clickInfo: EventClickArg): void {
    // Calculate duration in minutes
    const startMoment = moment(clickInfo.event.start);
    const endMoment = clickInfo.event.end ? moment(clickInfo.event.end) : startMoment.clone().add(30, 'minutes');
    const duration = endMoment.diff(startMoment, 'minutes');

    // Extract recurring event details from extendedProps
    const isRecurring = clickInfo.event.extendedProps['isRecurring'] || false;
    const recurringDays = clickInfo.event.extendedProps['recurringDays'] || [];

    console.log('Calendar Event Click', {
      event: {
        id: clickInfo.event.id,
        title: clickInfo.event.title,
        start: startMoment.toISOString(),
        end: endMoment.toISOString(),
        duration: duration,
        allDay: clickInfo.event.allDay,
        isRecurring: isRecurring,
        recurringDays: recurringDays
      },
      extendedProps: clickInfo.event.extendedProps,
      timestamp: moment().toISOString()
    });

    const dialogData: EventDialogData = {
      id: clickInfo.event.id,
      event: {
        id: clickInfo.event.id,
        name: clickInfo.event.title || '',
        start_time: startMoment.toISOString(),
        duration: duration,
        is_recurring: isRecurring,
        recurring_days: recurringDays
      },
      start: startMoment.toDate(),
      end: endMoment.toDate(),
      is_recurring: isRecurring,
      recurring_days: recurringDays,
      isEditMode: true
    };

    this.openEventDialog(dialogData);
  }

  openEventDialog(dialogData?: EventDialogData): void {
    // Ensure dates are normalized with moment
    const safeDialogData = dialogData ? {
      ...dialogData,
      start: dialogData.start ? moment(dialogData.start).toDate() : undefined,
      end: dialogData.end ? moment(dialogData.end).toDate() : undefined
    } : undefined;

    console.log('Open Event Dialog Input:', {
      dialogData: safeDialogData 
        ? JSON.parse(JSON.stringify({
            ...safeDialogData,
            start: moment(safeDialogData.start).toISOString(),
            end: moment(safeDialogData.end).toISOString()
          }))
        : null
    });

    const dialogConfig: MatDialogConfig = {
      width: '400px',
      data: safeDialogData
    };

    const dialogRef = this.dialog.open(EventDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: any) => {
      console.log("Dialog Result:", result);

      // Check if result is valid and has the expected structure
      if (result && result.action === 'save') {
        // Use moment for all date normalizations
        const startMoment = moment(result.start);
        const endMoment = moment(result.end);

        // Prepare event data to match backend schema
        const eventCreate: EventCreate = {
          name: result.name,
          start_time: startMoment.toISOString(),
          duration: endMoment.diff(startMoment, 'minutes'),
          is_recurring: result.is_recurring || false,
          recurring_days: result.is_recurring && result.recurring_days 
            ? result.recurring_days.map((day: string) => day.toUpperCase()) 
            : undefined
        };

        // Log the event data being sent
        console.log('Preparing to send event data:', {
          ...eventCreate,
          start_time: eventCreate.start_time
        });

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
              if (error.message === 'Event not scheduled due to conflicts.') {
                // Show snackbar with the specific error message
                this.snackBar.open('Event not scheduled due to conflicts.', 'Close', {
                  duration: 3000
                });
              } else {
                // Generic error handling for other types of errors
                this.snackBar.open('Failed to update event', 'Close', { duration: 3000 });
              }
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
              if (error.message === 'Event not scheduled due to conflicts.') {
                // Show snackbar with the specific error message
                this.snackBar.open('Event not scheduled due to conflicts.', 'Close', {
                  duration: 3000
                });
              } else {
                // Generic error handling for other types of errors
                this.snackBar.open('Failed to create event', 'Close', { duration: 3000 });
              }
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
