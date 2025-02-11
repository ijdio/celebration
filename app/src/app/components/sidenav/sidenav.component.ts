/**
 * Sidenav component for managing application layout and navigation
 * 
 * Provides:
 * - Responsive side navigation
 * - Event creation functionality
 * - Platform-specific rendering optimizations
 * 
 * @module SidenavComponent
 * @description Main navigation and layout component for the application
 */
import { Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { CalendarComponent } from '../calendar/calendar.component';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import moment from 'moment';

/**
 * Defines the structure for sidebar sections
 * 
 * @interface
 * @description Represents a configurable sidebar section with title, icon, and content
 */
interface SidebarSection {
  /** Title of the sidebar section */
  title: string;
  /** Material icon name for the section */
  icon: string;
  /** Content or description of the section */
  content: string;
  /** Optional flag to indicate if the section is expanded */
  expanded?: boolean;
}

/**
 * Sidenav component for application layout and navigation
 * 
 * Features:
 * - Responsive side navigation toggle
 * - Platform-specific rendering checks
 * - Quick event creation functionality
 * 
 * @class
 * @implements {OnInit}
 */
@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatExpansionModule,
    CalendarComponent
  ],
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
  /** 
   * Reference to the embedded CalendarComponent 
   * @type {CalendarComponent}
   */
  @ViewChild(CalendarComponent) calendarComponent!: CalendarComponent;

  /** 
   * State of the sidenav (opened or closed)
   * @type {boolean}
   */
  sidenavOpened = true;

  /** 
   * Flag to check if the application is running in a browser environment
   * @type {boolean}
   */
  isBrowser = false;

  /** 
   * Collection of sidebar sections
   * @type {SidebarSection[]}
   */
  sidebarSections: SidebarSection[] = [];

  /**
   * Creates an instance of SidenavComponent
   * 
   * @param {Object} platformId - Angular's platform identifier for environment detection
   * @param {MatDialog} dialog - Dialog service for opening dialogs
   */
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private dialog: MatDialog
  ) {}

  /**
   * Lifecycle hook that is called after data-bound properties are initialized
   * 
   * Checks if the application is running in a browser environment
   */
  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Toggles the sidenav open/closed state
   * 
   * Handles:
   * - Sidenav state toggle
   * - Dispatching resize event for responsive layout
   */
  toggleSidenav() {
    if (this.isBrowser) {
      this.sidenavOpened = !this.sidenavOpened;
      
      // Dispatch a resize event using requestAnimationFrame
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }

  /**
   * Opens the event creation dialog
   * 
   * Configures default event parameters:
   * - Start time set to beginning of current day
   * - Default duration of 30 minutes
   * - Non-edit mode for new event creation
   */
  openCreateEventDialog() {
    // Use moment to set start time to 00:00 of today
    const now = moment().startOf('day');
    const defaultStart = now.toDate();
    const defaultStartHour = 0;  // Set to 00:00

    const dialogData = {
      start: defaultStart,
      startHour: defaultStartHour,
      isEditMode: false,
      duration: 30  // Default 30-minute duration
    };

    // Use the calendar component's method to open the event dialog
    this.calendarComponent.openEventDialog(dialogData);
  }
}
