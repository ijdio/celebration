import { Injectable } from '@angular/core';
import { Event, EventCreate } from '../models/event.model';
import moment, { Moment } from 'moment';

@Injectable({
  providedIn: 'root'
})
export class EventValidationService {
  // Day mapping from abbreviation to moment day number (0-6)
  private readonly dayMap: { [key: string]: number } = {
    'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
  };

  // Reverse day mapping from moment day number to abbreviation
  private readonly reverseDayMap: { [key: number]: string } = {
    0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA'
  };

  checkEventConflicts(newEvent: EventCreate, existingEvents: Event[]): string | null {
    console.log('Starting conflict check for event:', {
      newEvent: {
        id: newEvent.id,
        name: newEvent.name,
        start_time: newEvent.start_time,
        duration: newEvent.duration,
        is_recurring: newEvent.is_recurring,
        recurring_days: newEvent.recurring_days
      }
    });

    // Skip events that are being updated
    const relevantEvents = existingEvents.filter(event => 
      !(newEvent.id !== undefined && event.id === newEvent.id)
    );

    for (const existingEvent of relevantEvents) {
      const conflict = this.checkEventPairConflict(newEvent, existingEvent);
      if (conflict) {
        return conflict;
      }
    }

    return null;
  }

  private checkEventPairConflict(newEvent: EventCreate, existingEvent: Event): string | null {
    console.log('Checking event pair for conflicts:', {
      newEvent: {
        id: newEvent.id,
        name: newEvent.name,
        start_time: newEvent.start_time,
        duration: newEvent.duration,
        is_recurring: newEvent.is_recurring,
        recurring_days: newEvent.recurring_days
      },
      existingEvent: {
        id: existingEvent.id,
        name: existingEvent.name,
        start_time: existingEvent.start_time,
        duration: existingEvent.duration,
        is_recurring: existingEvent.is_recurring,
        recurring_days: existingEvent.recurring_days
      }
    });

    // If either event is recurring, check recurring conflict first
    if (newEvent.is_recurring || existingEvent.is_recurring) {
      const conflict = this.checkRecurringConflict(newEvent, existingEvent);
      if (conflict) {
        return conflict;
      }
    }

    // Case 1: Both events are non-recurring
    if (!newEvent.is_recurring && !existingEvent.is_recurring) {
      if (this.checkTimeOverlap(
        moment(newEvent.start_time),
        moment(newEvent.start_time).add(newEvent.duration, 'minutes'),
        moment(existingEvent.start_time),
        moment(existingEvent.start_time).add(existingEvent.duration, 'minutes')
      )) {
        return this.formatConflictMessage(existingEvent);
      }
    }

    return null;
  }

  private checkRecurringConflict(newEvent: EventCreate, existingEvent: Event): string | null {
    const newEventStart = moment(newEvent.start_time);
    const existingEventStart = moment(existingEvent.start_time);

    console.log('Detailed Recurring Conflict Check:', {
      newEvent: {
        name: newEvent.name,
        start_time: newEvent.start_time,
        duration: newEvent.duration,
        is_recurring: newEvent.is_recurring,
        recurring_days: newEvent.recurring_days
      },
      existingEvent: {
        name: existingEvent.name,
        start_time: existingEvent.start_time,
        duration: existingEvent.duration,
        is_recurring: existingEvent.is_recurring,
        recurring_days: existingEvent.recurring_days
      }
    });

    // Case 1: Both events are on the exact same date and time
    if (newEventStart.isSame(existingEventStart, 'day') && 
        newEventStart.isSame(existingEventStart, 'minute')) {
      console.log('Events are on the same day and start at the same time');
      return this.formatConflictMessage(existingEvent);
    }

    // Case 2: Both events are recurring
    if (newEvent.is_recurring && existingEvent.is_recurring) {
      // Check if they have any common days
      const commonDays = this.getCommonDays(
        newEvent.recurring_days || [],
        existingEvent.recurring_days || []
      );

      console.log('Checking recurring vs recurring conflict:', {
        commonDays,
        newEventDays: newEvent.recurring_days,
        existingEventDays: existingEvent.recurring_days
      });

      if (commonDays.length > 0) {
        // If they share any days, check time overlap
        if (this.checkTimeOverlap(
          moment(newEvent.start_time),
          moment(newEvent.start_time).add(newEvent.duration, 'minutes'),
          moment(existingEvent.start_time),
          moment(existingEvent.start_time).add(existingEvent.duration, 'minutes')
        )) {
          return this.formatConflictMessage(existingEvent, commonDays.join(', '));
        }
      }
    }
    // Case 3: New event is recurring, existing is not
    else if (newEvent.is_recurring) {
      const existingDay = this.reverseDayMap[existingEventStart.day()];
      console.log('Checking recurring vs non-recurring conflict:', {
        existingEventDay: existingDay,
        existingEventDate: existingEventStart.format('YYYY-MM-DD'),
        recurringDays: newEvent.recurring_days,
        timeOverlap: this.checkTimeOverlap(
          moment(newEvent.start_time),
          moment(newEvent.start_time).add(newEvent.duration, 'minutes'),
          moment(existingEvent.start_time),
          moment(existingEvent.start_time).add(existingEvent.duration, 'minutes')
        )
      });

      if (newEvent.recurring_days?.includes(existingDay)) {
        if (this.checkTimeOverlap(
          moment(newEvent.start_time),
          moment(newEvent.start_time).add(newEvent.duration, 'minutes'),
          moment(existingEvent.start_time),
          moment(existingEvent.start_time).add(existingEvent.duration, 'minutes')
        )) {
          return this.formatConflictMessage(existingEvent, existingDay);
        }
      }
    }
    // Case 4: Existing event is recurring, new is not
    else if (existingEvent.is_recurring) {
      const newDay = this.reverseDayMap[newEventStart.day()];
      console.log('Checking non-recurring vs recurring conflict:', {
        newEventDay: newDay,
        newEventDate: newEventStart.format('YYYY-MM-DD'),
        recurringDays: existingEvent.recurring_days,
        hasMatchingDay: existingEvent.recurring_days?.includes(newDay),
        timeOverlap: this.checkTimeOverlap(
          moment(newEvent.start_time),
          moment(newEvent.start_time).add(newEvent.duration, 'minutes'),
          moment(existingEvent.start_time),
          moment(existingEvent.start_time).add(existingEvent.duration, 'minutes')
        )
      });

      // Always check if the non-recurring event's day matches ANY of the recurring event's days
      if (existingEvent.recurring_days?.includes(newDay)) {
        // Always check time overlap for recurring events
        const hasOverlap = this.checkTimeOverlap(
          moment(newEvent.start_time),
          moment(newEvent.start_time).add(newEvent.duration, 'minutes'),
          moment(existingEvent.start_time),
          moment(existingEvent.start_time).add(existingEvent.duration, 'minutes')
        );

        console.log('Time overlap check for recurring vs non-recurring:', {
          hasOverlap,
          newEventStart: newEventStart.format(),
          newEventEnd: moment(newEvent.start_time).add(newEvent.duration, 'minutes').format(),
          existingEventStart: existingEventStart.format(),
          existingEventEnd: moment(existingEvent.start_time).add(existingEvent.duration, 'minutes').format()
        });

        if (hasOverlap) {
          return this.formatConflictMessage(existingEvent, newDay);
        }
      }
    }

    return null;
  }

  private checkTimeOverlap(start1: Moment, end1: Moment, start2: Moment, end2: Moment): boolean {
    // Normalize times to the same day for accurate comparison
    const normalizedStart1 = moment(start1).hours(start1.hours()).minutes(start1.minutes());
    const normalizedEnd1 = moment(end1).hours(end1.hours()).minutes(end1.minutes());
    const normalizedStart2 = moment(start2).hours(start2.hours()).minutes(start2.minutes());
    const normalizedEnd2 = moment(end2).hours(end2.hours()).minutes(end2.minutes());

    console.log('Normalized Time Overlap Check:', {
      start1: normalizedStart1.format(),
      end1: normalizedEnd1.format(),
      start2: normalizedStart2.format(),
      end2: normalizedEnd2.format(),
      start1Time: normalizedStart1.format('HH:mm'),
      end1Time: normalizedEnd1.format('HH:mm'),
      start2Time: normalizedStart2.format('HH:mm'),
      end2Time: normalizedEnd2.format('HH:mm')
    });

    // Check if events have the same start time
    if (normalizedStart1.isSame(normalizedStart2, 'minute')) {
      console.log('Events have the same start time');
      return true;
    }

    // Check for time overlap
    const hasOverlap = (
      (normalizedStart1.isSameOrBefore(normalizedStart2) && normalizedEnd1.isAfter(normalizedStart2)) ||     // Event 1 starts before Event 2 and overlaps
      (normalizedStart2.isSameOrBefore(normalizedStart1) && normalizedEnd2.isAfter(normalizedStart1)) ||     // Event 2 starts before Event 1 and overlaps
      (normalizedStart1.isSameOrBefore(normalizedStart2) && normalizedEnd1.isSameOrAfter(normalizedEnd2)) || // Event 1 completely contains Event 2
      (normalizedStart2.isSameOrBefore(normalizedStart1) && normalizedEnd2.isSameOrAfter(normalizedEnd1))    // Event 2 completely contains Event 1
    );

    console.log('Time Overlap Result:', {
      hasOverlap,
      start1Time: normalizedStart1.format('HH:mm'),
      end1Time: normalizedEnd1.format('HH:mm'),
      start2Time: normalizedStart2.format('HH:mm'),
      end2Time: normalizedEnd2.format('HH:mm')
    });

    return hasOverlap;
  }

  private getCommonDays(days1: string[], days2: string[]): string[] {
    return days1.filter(day => days2.includes(day));
  }

  private createEventTimeOnDay(event: Event | EventCreate, day: string): Moment {
    const eventStart = moment(event.start_time);
    const targetDay = this.dayMap[day];
    
    // Create a new moment for the same time on the target day
    return moment(eventStart)
      .day(targetDay)
      .hour(eventStart.hour())
      .minute(eventStart.minute())
      .second(0)
      .millisecond(0);
  }

  private formatConflictMessage(existingEvent: Event, day?: string): string {
    const baseMessage = `Conflict with event '${existingEvent.name}'`;
    const timeRange = `${moment(existingEvent.start_time).format('HH:mm')} - ${
      moment(existingEvent.start_time).add(existingEvent.duration, 'minutes').format('HH:mm')
    }`;
    
    if (existingEvent.is_recurring) {
      return `${baseMessage} (recurring on ${day || existingEvent.recurring_days?.join(', ')}, ${timeRange})`;
    } else {
      return `${baseMessage} (${moment(existingEvent.start_time).format('YYYY-MM-DD')}, ${timeRange})`;
    }
  }
}
