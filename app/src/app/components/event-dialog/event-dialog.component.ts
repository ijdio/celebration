import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import moment from 'moment';

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
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule
  ]
})
export class EventDialogComponent {
  eventForm: FormGroup;
  hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0') + ':00'
  }));

  weekdays = [
    { value: 'MO', label: 'Monday' },
    { value: 'TU', label: 'Tuesday' },
    { value: 'WE', label: 'Wednesday' },
    { value: 'TH', label: 'Thursday' },
    { value: 'FR', label: 'Friday' },
    { value: 'SA', label: 'Saturday' },
    { value: 'SU', label: 'Sunday' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    // Use moment for all date normalizations
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
      endType: typeof data.end,
      startValue: data.start ? moment(data.start).toISOString() : null,
      endValue: data.end ? moment(data.end).toISOString() : null
    });

    // Create moment instances
    const startMoment = normalizeDate(data.start);
    const startHour = startMoment.hours();

    // Calculate duration using moment
    const duration = data.start && data.end 
      ? moment(normalizeDate(data.end)).diff(startMoment, 'minutes') 
      : 30;  // Explicitly set default to 30 minutes

    console.log('Constructor Date Calculations:', {
      startDate: startMoment.toISOString(),
      startHour: startHour,
      duration: duration
    });

    this.eventForm = this.fb.group({
      name: [data.event?.name || '', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [startMoment.toDate(), Validators.required],
      startHour: [startHour, Validators.required],
      duration: [duration, [Validators.required, Validators.min(1), Validators.max(1440)]],
      is_recurring: [data.is_recurring || false],
      weekdays: this.fb.group({
        MO: [false],
        TU: [false],
        WE: [false],
        TH: [false],
        FR: [false],
        SA: [false],
        SU: [false]
      }, { validators: this.recurringDaysValidator })
    });

    // Set initial weekdays if editing an existing recurring event
    if (data.recurring_days) {
      const weekdaysGroup = this.eventForm.get('weekdays') as FormGroup;
      data.recurring_days.forEach((day: string) => {
        const uppercaseDay = day.toUpperCase();
        if (weekdaysGroup.contains(uppercaseDay)) {
          weekdaysGroup.get(uppercaseDay)?.setValue(true);
        }
      });
    }

    // Watch is_recurring changes to handle weekdays validation
    this.eventForm.get('is_recurring')?.valueChanges.subscribe((is_recurring: boolean) => {
      const weekdaysGroup = this.eventForm.get('weekdays') as FormGroup;
      weekdaysGroup.updateValueAndValidity();
    });
  }

  // Custom validator for recurring days
  recurringDaysValidator(group: FormGroup): {[key: string]: any} | null {
    const isRecurring = group.parent?.get('is_recurring')?.value;
    
    if (isRecurring) {
      const selectedDays = Object.entries(group.value)
        .filter(([_, checked]) => checked)
        .map(([day]) => day);
      
      return selectedDays.length > 0 ? null : { 'noDaysSelected': true };
    }
    
    return null;
  }

  onSubmit() {
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
      is_recurring: formValue.is_recurring,
      recurring_days: formValue.is_recurring ? 
        Object.entries(formValue.weekdays)
          .filter(([_, checked]) => checked)
          .map(([day]) => day) : 
        undefined
    };

    // Log final event creation details with moment
    console.log('Event Creation Details:', {
      name: result.name,
      start: moment(result.start).toISOString(),
      end: moment(result.end).toISOString(),
      isRecurring: result.is_recurring,
      recurringDays: result.recurring_days
    });

    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close();
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }
}
