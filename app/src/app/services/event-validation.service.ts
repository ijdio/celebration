/**
 * Event Validation Service for managing complex event scheduling conflicts
 * 
 * Provides comprehensive functionality for:
 * - Checking event conflicts
 * - Handling recurring and non-recurring events
 * - Detecting time overlaps
 * 
 * @module EventValidationService
 * @description Advanced service for detecting scheduling conflicts across various event types
 */
import { Injectable } from '@angular/core';
import { Event, EventCreate } from '../models/event.model';
import moment, { Moment } from 'moment';

/**
 * Event Validation Service for detecting scheduling conflicts
 * 
 * Features:
 * - Sophisticated conflict detection algorithm
 * - Support for recurring and non-recurring events
 * - Precise time and day overlap checking
 * 
 * @class
 */
@Injectable({
  providedIn: 'root'
})
export class EventValidationService {
  /** 
   * Mapping of day abbreviations to moment day numbers (0-6)
   * @type {Object}
   * @private
   */
  private readonly dayMap: { [key: string]: number } = {
    'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
  };

  /** 
   * Reverse mapping of moment day numbers to day abbreviations
   * @type {Object}
   * @private
   */
  private readonly reverseDayMap: { [key: number]: string } = {
    0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA'
  };

  /**
   * Checks for conflicts between a new event and existing events
   * 
   * Handles:
   * - Recurring and non-recurring event conflict detection
   * - Skipping events being updated
   * 
   * @param {EventCreate} newEvent - Event to be checked for conflicts
   * @param {Event[]} existingEvents - List of existing events
   * @returns {string | null} Conflict message or null if no conflicts
   */
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

  /**
   * Checks conflict between a specific pair of events
   * 
   * Handles multiple conflict scenarios:
   * - Exact same start time
   * - Recurring event conflicts
   * - Time overlap for non-recurring events
   * 
   * @param {EventCreate} newEvent - Event to be checked
   * @param {Event} existingEvent - Existing event to compare against
   * @returns {string | null} Conflict message or null if no conflicts
   * @private
   */
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

    // If both events are non-recurring, do a more precise conflict check
    if (!newEvent.is_recurring && !existingEvent.is_recurring) {
      const newStart = moment.utc(newEvent.start_time);
      const existingStart = moment.utc(existingEvent.start_time);
      const newEnd = moment.utc(newEvent.start_time).add(newEvent.duration, 'minutes');
      const existingEnd = moment.utc(existingEvent.start_time).add(existingEvent.duration, 'minutes');

      // Conflict only if events are on the same day and have time overlap
      const isSameDay = newStart.isSame(existingStart, 'day');
      const hasTimeOverlap = 
        (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) ||
        (existingStart.isBefore(newEnd) && existingEnd.isAfter(newStart));

      if (isSameDay && hasTimeOverlap) {
        console.log('Non-recurring event time overlap detected', {
          newStart: newStart.format(),
          newEnd: newEnd.format(),
          existingStart: existingStart.format(),
          existingEnd: existingEnd.format()
        });
        return this.formatConflictMessage(existingEvent);
      }

      // No conflict for non-recurring events
      return null;
    }

    // If either event is recurring, proceed with existing recurring conflict check
    if (newEvent.is_recurring || existingEvent.is_recurring) {
      return this.checkRecurringConflict(newEvent, existingEvent);
    }

    return null;
  }

  /**
   * Checks conflicts for recurring events
   * 
   * Handles complex scenarios:
   * - Both events recurring
   * - Multi-day events
   * - Day and time overlap
   * 
   * @param {EventCreate} newEvent - New event to check
   * @param {Event} existingEvent - Existing event to compare
   * @returns {string | null} Conflict message or null if no conflicts
   * @private
   */
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

  /**
   * Checks if two time ranges overlap
   * 
   * @param {Moment} start1 - Start time of first event
   * @param {Moment} end1 - End time of first event
   * @param {Moment} start2 - Start time of second event
   * @param {Moment} end2 - End time of second event
   * @returns {boolean} True if events overlap, false otherwise
   * @private
   */
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

  /**
   * Formats a conflict message for an event
   * 
   * @param {Event} conflictingEvent - Event causing the conflict
   * @param {string} [recurringDays] - Optional recurring days information
   * @returns {string} Formatted conflict message
   * @private
   */
  private formatConflictMessage(conflictingEvent: Event, recurringDays?: string): string {
    const baseMessage = `Conflict with event '${conflictingEvent.name}'`;
    const timeRange = `${moment.utc(conflictingEvent.start_time).format('HH:mm')} - ${
      moment.utc(conflictingEvent.start_time).add(conflictingEvent.duration, 'minutes').format('HH:mm')
    }`;
    
    if (conflictingEvent.is_recurring) {
      return `${baseMessage} (recurring on ${recurringDays || conflictingEvent.recurring_days?.join(', ')}, ${timeRange})`;
    } else {
      return `${baseMessage} (${moment.utc(conflictingEvent.start_time).format('YYYY-MM-DD')}, ${timeRange})`;
    }
  }

  /**
   * Finds common days between two day lists
   * 
   * @param {string[]} list1 - First list of days
   * @param {string[]} list2 - Second list of days
   * @returns {string[]} List of common days
   * @private
   */
  private getCommonDays(list1: string[], list2: string[]): string[] {
    return list1.filter(day => list2.includes(day));
  }

  /**
   * Expands recurring days for multi-day events
   * 
   * @param {string[]} days - Original recurring days
   * @returns {string[]} Expanded list of days including next day
   * @private
   */
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
