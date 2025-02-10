export interface EventBase {
  name: string;
  start_time: string;  // Keep as string, but ensure it's in ISO format
  duration: number;
  is_recurring: boolean;
  recurring_days?: string[];  // Use backend's day abbreviations
}

export interface EventCreate extends EventBase {
  id?: number | string;  // Optional ID for update scenarios
}

export interface Event extends EventBase {
  id: number | string;  // Mandatory ID for existing events
}

export interface EventList {
  events: Event[];
}

export interface CalendarEvent extends Event {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}
