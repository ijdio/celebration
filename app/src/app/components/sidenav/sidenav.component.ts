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

interface SidebarSection {
  title: string;
  icon: string;
  content: string;
  expanded?: boolean;
}

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
  @ViewChild(CalendarComponent) calendarComponent!: CalendarComponent;

  sidenavOpened = true;
  isBrowser = false;

  sidebarSections: SidebarSection[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  toggleSidenav() {
    if (this.isBrowser) {
      this.sidenavOpened = !this.sidenavOpened;
      
      // Dispatch a resize event using requestAnimationFrame
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }

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
