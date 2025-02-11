/**
 * Calendar component for managing and displaying events using FullCalendar
 * 
 * This component provides:
 * - Interactive calendar view with multiple display modes (month, week, day, list)
 * - Event creation, editing, and deletion functionality
 * - Integration with EventService for data management
 * 
 * @module CalendarComponent
 * @description Main calendar interface for event scheduling and visualization
 */
import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import momentPlugin from '@fullcalendar/moment';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import listPlugin from '@fullcalendar/list';
import moment from 'moment';

import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EventService } from '../../services/event.service';
import { Event } from '../../models/event.model';

// Angular Material Date Imports
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule } from '@angular/material-moment-adapter';

/**
 * Custom date formats using moment for consistent date representation
 * @constant
 */
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

/**
 * Interface representing the structure for creating a new event
 * @interface
 */
interface EventCreate {
  name: string;
  start_time: string;
  duration: number;
  is_recurring: boolean;
  recurring_days?: string[];
}

/**
 * Interface for data passed to the event dialog
 * @interface
 */
interface EventDialogData {
  id?: string | number;
  event?: Event;
  isEditMode?: boolean;
  start?: Date | null;
  end?: Date | null;
  is_recurring?: boolean;
  recurring_days?: string[];
}

/**
 * Calendar component configuration and event management
 * 
 * Provides a comprehensive calendar interface with:
 * - Multiple view modes (month, week, day, list)
 * - Event creation, editing, and deletion
 * - Recurring event support
 * 
 * @class
 * @implements {OnInit}
 */
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
    MatButtonModule,
    MatIconModule,
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
  /** 
   * Configuration options for the FullCalendar instance
   * @type {CalendarOptions}
   */
  calendarOptions: CalendarOptions;

  /** 
   * List of currently displayed events
   * @type {EventApi[]}
   */
  currentEvents: EventApi[] = [];

  /** 
   * Current view mode of the calendar
   * @type {'calendar' | 'list'}
   */
  currentView: 'calendar' | 'list' = 'calendar';

  /** 
   * Reference to the FullCalendar component
   * @type {any}
   */
  @ViewChild('calendarComponent') calendarComponent: any;

  /**
   * Creates an instance of CalendarComponent
   * 
   * Initializes calendar with:
   * - FullCalendar plugins
   * - Custom header toolbar
   * - Event interaction settings
   * 
   * @param {MatDialog} dialog - Dialog service for opening event dialogs
   * @param {MatSnackBar} snackBar - Snackbar service for displaying notifications
   * @param {EventService} eventService - Service for managing event data
   */
  constructor(
    @Inject(MatDialog) private dialog: MatDialog,
    @Inject(MatSnackBar) private snackBar: MatSnackBar,
    @Inject(EventService) private eventService: EventService
  ) {
    // Initialize calendar options with comprehensive configuration
    this.calendarOptions = {
      plugins: [
        dayGridPlugin,
        timeGridPlugin,
        interactionPlugin,
        momentPlugin,
        rrulePlugin,
        listPlugin
      ],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
      },
      initialView: 'timeGridWeek',
      editable: true,
      eventResizableFromStart: true,
      selectable: true,
      selectMirror: false,
      dayMaxEvents: true,
      height: 'auto',
      stickyHeaderDates: false,
      handleWindowResize: true,
      select: this.handleDateSelect.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventsSet: this.handleEvents.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this),
      allDaySlot: false,
      selectOverlap: false,
      eventOverlap: false,
      buttonText: {
        month: 'Month',
        week: 'Week',
        day: 'Day',
        list: 'List'
      },
    };
  }

  /**
   * Lifecycle hook that is called after data-bound properties are initialized
   * Loads events from the event service
   */
  ngOnInit(): void {
    this.loadEvents();
  }

  /**
   * Loads events from the event service and populates the calendar
   * 
   * Handles:
   * - Fetching events from backend
   * - Mapping events to calendar format
   * - Error handling for event loading
   */
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

  /**
   * Maps backend event models to FullCalendar event input format
   * 
   * Handles:
   * - Date normalization using moment
   * - Converting event duration
   * - Adding extended properties
   * 
   * @param {Event[]} events - List of events to map
   * @returns {EventInput[]} Mapped calendar events
   */
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
        id: event.id.toString(),
        title: event.name,
        start: start.format(),
        end: end.format(),
        duration: { minutes: event.duration },
        allDay: false,
        extendedProps: {
          originalEvent: event,
          isRecurring: event.is_recurring,
          recurringDays: event.recurring_days
        }
      };

      // Map recurring events to FullCalendar's rrule format
      if (event.is_recurring && event.recurring_days && event.recurring_days.length > 0) {
        // Use direct day mapping instead of converting to numbers
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

  /**
   * Handles date selection on the calendar
   * 
   * Opens the event dialog for creating a new event
   * 
   * @param {DateSelectArg} selectInfo - Date selection information
   */
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

  /**
   * Handles event clicks on the calendar
   * 
   * Opens the event dialog for editing or deleting the event
   * 
   * @param {EventClickArg} clickInfo - Event click information
   */
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

  /**
   * Handles event drops on the calendar
   * 
   * Updates the event's start time and duration
   * 
   * @param {{ event: EventApi, oldEvent: EventApi, revert: () => void }} dropInfo - Event drop information
   */
  handleEventDrop(dropInfo: { 
    event: EventApi, 
    oldEvent: EventApi, 
    revert: () => void 
  }) {
    const event = dropInfo.event;
    const oldEvent = dropInfo.oldEvent;

    // Ensure we have a valid start time
    if (!event.start) {
      console.error('No start time for dragged event');
      dropInfo.revert();
      return;
    }

    // Safely get the original event details
    const originalEventDetails = event.extendedProps['originalEvent'] || {};

    // Calculate new start time and duration
    const newStartMoment = moment(event.start);
    const newEndMoment = event.end ? moment(event.end) : newStartMoment.clone().add(
      originalEventDetails.duration || 30, 
      'minutes'
    );
    const newDuration = newEndMoment.diff(newStartMoment, 'minutes');

    // Validate duration
    if (newDuration <= 0) {
      console.error('Invalid event duration after drag');
      dropInfo.revert();
      return;
    }

    // Log the drag event details with more robust logging
    console.log('Event Drag Details', {
      eventId: event.id,
      oldStartTime: moment(oldEvent.start).toISOString(),
      newStartTime: newStartMoment.toISOString(),
      oldDuration: originalEventDetails.duration || 30,
      newDuration: newDuration,
      timestamp: moment().toISOString(),
      originalEventDetails: originalEventDetails
    });

    // Update event in the database
    this.eventService.updateEventTime(
      event.id, 
      newStartMoment.toISOString(), 
      newDuration
    ).subscribe({
      next: (response) => {
        // Show success message
        this.snackBar.open('Event time updated successfully', 'Close', { 
          duration: 3000 
        });
        
        // Reload events to ensure consistency
        this.loadEvents();
      },
      error: (error) => {
        // Log the full error
        console.error('Complete Event Drag Update Error', {
          error: error,
          eventId: event.id,
          timestamp: moment().toISOString()
        });

        // Revert the event if update fails
        dropInfo.revert();
        
        // Show detailed error message
        const errorMessage = error.message || 'Failed to update event time';
        this.snackBar.open(`Update failed: ${errorMessage}`, 'Close', { 
          duration: 5000 
        });

        // Additional error tracking
        try {
          // Try to parse and log any additional error details
          const errorDetails = error.error || {};
          console.error('Detailed Error Information', {
            message: errorDetails.message,
            detail: errorDetails.detail,
            status: errorDetails.status
          });
        } catch (parseError) {
          console.error('Error parsing error details', parseError);
        }
      }
    });
  }

  /**
   * Handles event resizes on the calendar
   * 
   * Updates the event's duration
   * 
   * @param {{ event: EventApi, oldEvent: EventApi, revert: () => void }} resizeInfo - Event resize information
   */
  handleEventResize(resizeInfo: { 
    event: EventApi, 
    oldEvent: EventApi, 
    revert: () => void 
  }) {
    const event = resizeInfo.event;
    const oldEvent = resizeInfo.oldEvent;

    // Ensure we have valid start and end times
    if (!event.start || !event.end) {
      console.error('Invalid event times during resize');
      resizeInfo.revert();
      return;
    }

    // Calculate new duration
    const newStartMoment = moment(event.start);
    const newEndMoment = moment(event.end);
    const newDuration = newEndMoment.diff(newStartMoment, 'minutes');

    // Validate duration
    if (newDuration <= 0) {
      console.error('Invalid event duration after resize');
      resizeInfo.revert();
      return;
    }

    // Log the resize event details
    console.log('Event Resize Details', {
      eventId: event.id,
      oldStartTime: moment(oldEvent.start).toISOString(),
      newStartTime: newStartMoment.toISOString(),
      oldDuration: oldEvent.extendedProps['originalEvent']?.duration || 30,
      newDuration: newDuration,
      timestamp: moment().toISOString()
    });

    // Update event in the database
    this.eventService.updateEventTime(
      event.id, 
      newStartMoment.toISOString(), 
      newDuration
    ).subscribe({
      next: (response) => {
        // Show success message
        this.snackBar.open('Event duration updated successfully', 'Close', { 
          duration: 3000 
        });
        
        // Reload events to ensure consistency
        this.loadEvents();
      },
      error: (error) => {
        // Log the full error
        console.error('Complete Event Resize Update Error', {
          error: error,
          eventId: event.id,
          timestamp: moment().toISOString()
        });

        // Revert the event if update fails
        resizeInfo.revert();
        
        // Show detailed error message
        const errorMessage = error.message || 'Failed to update event duration';
        this.snackBar.open(`Update failed: ${errorMessage}`, 'Close', { 
          duration: 5000 
        });

        // Additional error tracking
        try {
          // Try to parse and log any additional error details
          const errorDetails = error.error || {};
          console.error('Detailed Resize Error Information', {
            message: errorDetails.message,
            detail: errorDetails.detail,
            status: errorDetails.status
          });
        } catch (parseError) {
          console.error('Error parsing resize error details', parseError);
        }
      }
    });
  }

  /**
   * Opens the event dialog for creating or editing an event
   * 
   * @param {EventDialogData} dialogData - Data for the event dialog
   */
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

  /**
   * Handles events being set on the calendar
   * 
   * Updates the list of current events
   * 
   * @param {EventApi[]} events - List of events
   */
  handleEvents(events: EventApi[]): void {
    this.currentEvents = events;
  }

  /**
   * Toggles the calendar view between calendar and list modes
   * 
   * @param {'calendar' | 'list'} view - New view mode
   */
  toggleView(view: 'calendar' | 'list') {
    this.currentView = view;
    
    // Update calendar view based on selected type
    const viewMap = {
      'calendar': 'dayGridMonth',
      'list': 'listMonth'
    };
    
    if (this.calendarComponent) {
      const calendarApi = this.calendarComponent.getApi();
      calendarApi.changeView(viewMap[view]);
    }
  }
}
