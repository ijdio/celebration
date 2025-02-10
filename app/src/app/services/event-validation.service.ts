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

    // First check for exact same start time and same day for non-recurring events
    if (!newEvent.is_recurring && !existingEvent.is_recurring) {
      // Convert both times to UTC for comparison
      const newStart = moment.utc(newEvent.start_time);
      const existingStart = moment.utc(existingEvent.start_time);
      
      console.log('UTC Time Comparison:', {
        newEventUTC: newStart.format(),
        existingEventUTC: existingStart.format(),
        isSameDay: newStart.isSame(existingStart, 'day'),
        isSameMinute: newStart.isSame(existingStart, 'minute')
      });
      
      // If on the same day and same start time, it's a conflict
      if (newStart.isSame(existingStart, 'day') && newStart.isSame(existingStart, 'minute')) {
        return this.formatConflictMessage(existingEvent);
      }
    }

    // If either event is recurring, check recurring conflict
    if (newEvent.is_recurring || existingEvent.is_recurring) {
      const conflict = this.checkRecurringConflict(newEvent, existingEvent);
      if (conflict) {
        return conflict;
      }
    }

    // Case 1: Both events are non-recurring
    if (!newEvent.is_recurring && !existingEvent.is_recurring) {
      // Convert all times to UTC for comparison
      const newStart = moment.utc(newEvent.start_time);
      const newEnd = moment.utc(newEvent.start_time).add(newEvent.duration, 'minutes');
      const existingStart = moment.utc(existingEvent.start_time);
      const existingEnd = moment.utc(existingEvent.start_time).add(existingEvent.duration, 'minutes');

      // Only check for overlap if they're on the same day in UTC
      if (newStart.isSame(existingStart, 'day')) {
        if (this.checkTimeOverlap(newStart, newEnd, existingStart, existingEnd)) {
          return this.formatConflictMessage(existingEvent);
        }
      }
    }

    return null;
  }

  private checkRecurringConflict(newEvent: EventCreate, existingEvent: Event): string | null {
    const newEventStart = moment.utc(newEvent.start_time);
    const existingEventStart = moment.utc(existingEvent.start_time);

    // Special handling for multi-day events
    const isMultiDayEvent = (duration: number) => duration >= 1440; // 24 hours or more
    const newEventIsMultiDay = isMultiDayEvent(newEvent.duration);
    const existingEventIsMultiDay = isMultiDayEvent(existingEvent.duration);

    console.log('Detailed Recurring Conflict Check:', {
      newEvent: {
        name: newEvent.name,
        start_time: newEvent.start_time,
        duration: newEvent.duration,
        is_recurring: newEvent.is_recurring,
        recurring_days: newEvent.recurring_days,
        isMultiDay: newEventIsMultiDay
      },
      existingEvent: {
        name: existingEvent.name,
        start_time: existingEvent.start_time,
        duration: existingEvent.duration,
        is_recurring: existingEvent.is_recurring,
        recurring_days: existingEvent.recurring_days,
        isMultiDay: existingEventIsMultiDay
      }
    });

    // Case 1: Both events are recurring
    if (newEvent.is_recurring && existingEvent.is_recurring) {
      const newEventDays = newEvent.recurring_days || [];
      const existingEventDays = existingEvent.recurring_days || [];
      
      // For multi-day events, we need to check the next day as well
      let daysToCheck = [...existingEventDays];
      if (existingEventIsMultiDay) {
        daysToCheck = this.expandMultiDayRecurringDays(existingEventDays);
      }
      
      const commonDays = this.getCommonDays(newEventDays, daysToCheck);

      console.log('Checking recurring vs recurring conflict:', {
        commonDays,
        newEventDays,
        existingEventDays,
        expandedDaysToCheck: daysToCheck
      });

      if (commonDays.length > 0) {
        // For recurring events, we need to compare their times on the same day
        // Use the first common day as reference
        const commonDay = commonDays[0];
        
        // Create reference times for both events on the same day
        const referenceDate = moment.utc().startOf('day');
        const newStart = referenceDate.clone()
          .hours(newEventStart.hours())
          .minutes(newEventStart.minutes());
        const newEnd = newStart.clone().add(newEvent.duration, 'minutes');
        
        const existingStart = referenceDate.clone()
          .hours(existingEventStart.hours())
          .minutes(existingEventStart.minutes());
        const existingEnd = existingStart.clone().add(existingEvent.duration, 'minutes');

        console.log('Comparing recurring events on same day:', {
          commonDay,
          newEvent: {
            start: newStart.format(),
            end: newEnd.format(),
            duration: newEvent.duration
          },
          existingEvent: {
            start: existingStart.format(),
            end: existingEnd.format(),
            duration: existingEvent.duration
          }
        });

        if (this.checkTimeOverlap(newStart, newEnd, existingStart, existingEnd)) {
          return this.formatConflictMessage(existingEvent, commonDays.join(', '));
        }
      }
      return null;
    }

    // Case 2: Only new event is recurring
    if (newEvent.is_recurring) {
      const existingDay = this.reverseDayMap[existingEventStart.day()];
      const nextDay = this.reverseDayMap[(existingEventStart.day() + 1) % 7];
      
      // For multi-day events, check both the start day and next day
      const daysToCheck = existingEventIsMultiDay ? [existingDay, nextDay] : [existingDay];
      
      const hasMatchingDay = newEvent.recurring_days?.some(day => daysToCheck.includes(day));

      console.log('Checking recurring vs non-recurring conflict:', {
        newEventDays: newEvent.recurring_days,
        existingDay,
        nextDay,
        daysToCheck,
        hasMatchingDay,
        existingEventDuration: existingEvent.duration
      });

      if (hasMatchingDay) {
        // Create reference times for comparison
        const referenceDate = moment.utc().startOf('day');
        const newStart = referenceDate.clone()
          .hours(newEventStart.hours())
          .minutes(newEventStart.minutes());
        const newEnd = newStart.clone().add(newEvent.duration, 'minutes');
        
        const existingStart = referenceDate.clone()
          .hours(existingEventStart.hours())
          .minutes(existingEventStart.minutes());
        const existingEnd = existingStart.clone().add(existingEvent.duration, 'minutes');

        if (this.checkTimeOverlap(newStart, newEnd, existingStart, existingEnd)) {
          return this.formatConflictMessage(existingEvent, daysToCheck.join(', '));
        }
      }
    }

    // Case 3: Only existing event is recurring
    if (existingEvent.is_recurring) {
      const newDay = this.reverseDayMap[moment.utc(newEvent.start_time).day()];
      
      // For multi-day recurring events, check if the new event falls on any affected day
      let daysToCheck = existingEvent.recurring_days || [];
      if (existingEventIsMultiDay) {
        daysToCheck = this.expandMultiDayRecurringDays(daysToCheck);
      }

      console.log('Checking non-recurring vs recurring conflict:', {
        newEventDay: newDay,
        newEventDate: moment.utc(newEvent.start_time).format('YYYY-MM-DD'),
        recurringDays: existingEvent.recurring_days,
        expandedDaysToCheck: daysToCheck,
        hasMatchingDay: daysToCheck.includes(newDay)
      });

      // If the new event falls on a recurring day
      if (daysToCheck.includes(newDay)) {
        // For comparison, create times on the same reference day
        const referenceDate = moment.utc(newEvent.start_time).startOf('day');
        const newStart = referenceDate.clone()
          .hours(moment.utc(newEvent.start_time).hours())
          .minutes(moment.utc(newEvent.start_time).minutes());
        const newEnd = newStart.clone().add(newEvent.duration, 'minutes');
        
        const existingStart = referenceDate.clone()
          .hours(moment.utc(existingEvent.start_time).hours())
          .minutes(moment.utc(existingEvent.start_time).minutes());
        const existingEnd = existingStart.clone().add(existingEvent.duration, 'minutes');

        const hasOverlap = this.checkTimeOverlap(newStart, newEnd, existingStart, existingEnd);

        console.log('Time overlap check for non-recurring vs recurring:', {
          hasOverlap,
          newStart: newStart.format(),
          newEnd: newEnd.format(),
          existingStart: existingStart.format(),
          existingEnd: existingEnd.format()
        });

        if (hasOverlap) {
          return this.formatConflictMessage(existingEvent, newDay);
        }
      }
    }

    return null;
  }

  private checkTimeOverlap(start1: Moment, end1: Moment, start2: Moment, end2: Moment): boolean {
    // Ensure all moments are in UTC
    const utcStart1 = start1.clone().utc();
    const utcEnd1 = end1.clone().utc();
    const utcStart2 = start2.clone().utc();
    const utcEnd2 = end2.clone().utc();
    
    // For events that might span multiple days, we need to:
    // 1. Normalize to the same reference day
    // 2. Calculate total minutes including days
    const referenceDate = utcStart1.clone().startOf('day');
    
    const toTotalMinutes = (time: Moment): number => {
      const daysDiff = time.diff(referenceDate, 'days');
      return (daysDiff * 24 * 60) + (time.hours() * 60) + time.minutes();
    };
    
    const start1Mins = toTotalMinutes(utcStart1);
    const end1Mins = toTotalMinutes(utcEnd1);
    const start2Mins = toTotalMinutes(utcStart2);
    const end2Mins = toTotalMinutes(utcEnd2);

    console.log('UTC Time Overlap Check:', {
      event1: { 
        start: utcStart1.format(),
        end: utcEnd1.format(),
        startMins: start1Mins,
        endMins: end1Mins,
        duration: end1Mins - start1Mins
      },
      event2: { 
        start: utcStart2.format(),
        end: utcEnd2.format(),
        startMins: start2Mins,
        endMins: end2Mins,
        duration: end2Mins - start2Mins
      },
      referenceDate: referenceDate.format()
    });

    // Check for any overlap scenarios
    const hasOverlap = (
      // Events start at the exact same time
      start1Mins === start2Mins ||
      // Event 1 starts during Event 2
      (start1Mins >= start2Mins && start1Mins < end2Mins) ||
      // Event 2 starts during Event 1
      (start2Mins >= start1Mins && start2Mins < end1Mins) ||
      // Event 1 completely contains Event 2
      (start1Mins <= start2Mins && end1Mins >= end2Mins) ||
      // Event 2 completely contains Event 1
      (start2Mins <= start1Mins && end2Mins >= end1Mins)
    );

    console.log('UTC Time Overlap Result:', {
      hasOverlap,
      event1: {
        start: utcStart1.format('YYYY-MM-DD HH:mm'),
        end: utcEnd1.format('YYYY-MM-DD HH:mm'),
        durationMins: end1Mins - start1Mins
      },
      event2: {
        start: utcStart2.format('YYYY-MM-DD HH:mm'),
        end: utcEnd2.format('YYYY-MM-DD HH:mm'),
        durationMins: end2Mins - start2Mins
      }
    });

    return hasOverlap;
  }

  private getCommonDays(days1: string[], days2: string[]): string[] {
    return days1.filter(day => days2.includes(day));
  }

  private createEventTimeOnDay(event: Event | EventCreate, day: string): Moment {
    const eventStart = moment.utc(event.start_time);
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
    const timeRange = `${moment.utc(existingEvent.start_time).format('HH:mm')} - ${
      moment.utc(existingEvent.start_time).add(existingEvent.duration, 'minutes').format('HH:mm')
    }`;
    
    if (existingEvent.is_recurring) {
      return `${baseMessage} (recurring on ${day || existingEvent.recurring_days?.join(', ')}, ${timeRange})`;
    } else {
      return `${baseMessage} (${moment.utc(existingEvent.start_time).format('YYYY-MM-DD')}, ${timeRange})`;
    }
  }

  private expandMultiDayRecurringDays(days: string[]): string[] {
    const expanded = new Set<string>();
    const dayOrder = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    
    days.forEach(day => {
      expanded.add(day);
      // Add the next day
      const currentIndex = dayOrder.indexOf(day);
      const nextIndex = (currentIndex + 1) % 7;
      expanded.add(dayOrder[nextIndex]);
    });
    
    return Array.from(expanded);
  }
}
