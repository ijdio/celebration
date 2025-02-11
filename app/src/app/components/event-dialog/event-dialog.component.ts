/**
 * EventDialogComponent manages the creation and editing of calendar events.
 * 
 * This component provides a dialog interface for users to:
 * - Create new events
 * - Edit existing events
 * - Set event details like name, start time, duration
 * - Configure recurring event patterns
 * 
 * @class
 * @description Dialog for creating and editing calendar events with form validation
 */
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import moment from 'moment';

/**
 * Configuration for the event dialog component
 * Defines the structure and modules required for the dialog
 */
@Component({
  selector: 'app-event-dialog',
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMomentDateModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule
  ]
})
export class EventDialogComponent {
  /**
   * Reactive form group for managing event input
   * @type {FormGroup}
   */
  eventForm: FormGroup;

  /**
   * Array of hour options for start time selection
   * @type {Array<{value: number, label: string}>}
   */
  hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0') + ':00'
  }));

  /**
   * Creates an instance of EventDialogComponent
   * 
   * @param {FormBuilder} fb - Angular's form builder for creating reactive forms
   * @param {MatDialogRef<EventDialogComponent>} dialogRef - Reference to the dialog
   * @param {any} data - Data passed to the dialog for initialization
   * @param {MatSnackBar} snackBar - Service for showing notification messages
   */
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    /**
     * Normalizes a date using moment
     * 
     * @param {Date | string | null} date - Date to normalize
     * @returns {moment.Moment} Normalized date
     */
    const normalizeDate = (date: Date | string | null): moment.Moment => {
      if (!date) {
        throw new Error('No date provided for event');
      }
      const momentDate = moment(date);
      if (!momentDate.isValid()) {
        throw new Error('Invalid date provided for event');
      }
      return momentDate;
    };

    // Detailed logging of input data with moment
    console.log('Event Dialog Constructor Raw Data:', {
      data: JSON.parse(JSON.stringify(data)),
      startType: typeof data.start,
      startValue: data.start ? moment(data.start).toISOString() : null,
      event: data.event,
      isEditMode: data.isEditMode
    });

    // Create moment instances
    const startMoment = normalizeDate(data.start);
    const startHour = startMoment.hours();

    // Default duration is 30 minutes
    const duration = data.event?.duration || 
                     (data.duration && typeof data.duration === 'number' ? data.duration : 30);

    // Calculate end moment explicitly from start and duration
    const endMoment = startMoment.clone().add(duration, 'minutes');

    // Determine recurring event details
    const isRecurring = data.event?.is_recurring || data.is_recurring || false;
    const recurringDays = isRecurring 
      ? (data.event?.recurring_days || data.recurring_days || []).map((day: string) => day.toUpperCase())
      : [];

    /**
     * Initializes the event form with default values and validation
     */
    this.eventForm = this.fb.group({
      name: [data.event?.name || '', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [startMoment.toDate(), Validators.required],
      startHour: [startHour, Validators.required],
      duration: [duration, [Validators.required, Validators.min(1)]],
      is_recurring: [isRecurring],
      recurring_days: [recurringDays]
    });

    /**
     * Watches for changes to the is_recurring form control and updates validation accordingly
     */
    this.eventForm.get('is_recurring')?.valueChanges.subscribe((is_recurring: boolean) => {
      const recurringDaysControl = this.eventForm.get('recurring_days');
      if (is_recurring) {
        recurringDaysControl?.setValidators([Validators.required]);
      } else {
        recurringDaysControl?.clearValidators();
      }
      recurringDaysControl?.updateValueAndValidity();
    });

    // Trigger initial validation for recurring days
    this.eventForm.get('is_recurring')?.updateValueAndValidity();
  }

  /**
   * Handles form submission, validates input, and closes the dialog
   * 
   * Performs the following actions:
   * - Validates form inputs
   * - Converts dates and times to proper format
   * - Closes dialog with event creation/update details
   * 
   * @throws {Error} If form validation fails
   */
  onSubmit(): void {
    // Validate form before processing
    if (this.eventForm.invalid) {
      this.snackBar.open('Please fill out all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    // Normalize dates using moment
    const formValue = this.eventForm.value;

    // Explicitly validate start date
    const startMoment = moment(formValue.startDate);
    if (!startMoment.isValid()) {
      this.snackBar.open('Invalid start date', 'Close', { duration: 3000 });
      return;
    }

    // Set precise time components
    startMoment
      .hours(formValue.startHour)
      .minutes(0)
      .seconds(0)
      .milliseconds(0);

    // Calculate end moment based on duration
    const endMoment = startMoment.clone().add(formValue.duration, 'minutes');

    const result = {
      action: 'save',
      name: formValue.name,
      start: startMoment.toDate(),
      end: endMoment.toDate(),
      duration: formValue.duration,
      is_recurring: formValue.is_recurring,
      recurring_days: formValue.is_recurring ? 
        formValue.recurring_days : 
        undefined
    };

    // Log final event creation details with moment
    console.log('Event Creation Details:', {
      name: result.name,
      start: moment(result.start).toISOString(),
      end: moment(result.end).toISOString(),
      duration: result.duration,
      isRecurring: result.is_recurring,
      recurringDays: result.recurring_days
    });

    this.dialogRef.close(result);
  }

  /**
   * Closes the dialog without saving changes
   * 
   * @description Dismisses the event dialog when user cancels event creation/editing
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Closes the dialog and signals event deletion
   * 
   * This method is typically used when editing an existing event
   * and the user chooses to delete it.
   */
  onDelete(): void {
    this.dialogRef.close({ action: 'delete' });
  }
}
