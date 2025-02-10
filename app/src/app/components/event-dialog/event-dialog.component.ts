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
    console.log('Event Dialog Constructor Data:', data);

    const startDate = data.start ? moment(data.start).toDate() : new Date();
    const startHour = data.start ? moment(data.start).hours() : moment().hours();
    
    const duration = data.start && data.end 
      ? moment(data.end).diff(moment(data.start), 'minutes') 
      : 30;

    this.eventForm = this.fb.group({
      name: [data.event?.name || '', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [startDate, Validators.required],
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
    // Mark all form controls as touched to trigger validation
    this.eventForm.markAllAsTouched();

    // Detailed validation logging
    console.log('Form Validation Status:', {
      isValid: this.eventForm.valid,
      name: {
        value: this.eventForm.get('name')?.value,
        errors: this.eventForm.get('name')?.errors
      },
      startDate: {
        value: this.eventForm.get('startDate')?.value,
        errors: this.eventForm.get('startDate')?.errors
      },
      startHour: {
        value: this.eventForm.get('startHour')?.value,
        errors: this.eventForm.get('startHour')?.errors
      },
      duration: {
        value: this.eventForm.get('duration')?.value,
        errors: this.eventForm.get('duration')?.errors
      },
      isRecurring: {
        value: this.eventForm.get('is_recurring')?.value,
        weekdays: this.eventForm.get('weekdays')?.value,
        weekdaysErrors: this.eventForm.get('weekdays')?.errors
      }
    });

    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;

      const startDate = moment(formValue.startDate)
        .hours(formValue.startHour)
        .minutes(0)
        .seconds(0);

      const result = {
        action: 'save',
        name: formValue.name,
        start: startDate.toDate(),
        end: startDate.clone().add(formValue.duration, 'minutes').toDate(),
        is_recurring: formValue.is_recurring,
        recurring_days: formValue.is_recurring ? 
          Object.entries(formValue.weekdays)
            .filter(([_, checked]) => checked)
            .map(([day]) => day) : 
          undefined
      };

      // Log event creation details
      console.log('Event Creation Details:', {
        name: result.name,
        start: result.start,
        end: result.end,
        isRecurring: result.is_recurring,
        recurringDays: result.recurring_days
      });

      this.dialogRef.close(result);
    } else {
      // If form is invalid, show specific error for recurring events
      if (this.eventForm.get('is_recurring')?.value) {
        const weekdaysGroup = this.eventForm.get('weekdays');
        if (weekdaysGroup?.hasError('noDaysSelected')) {
          this.snackBar.open('Please select at least one day for recurring events', 'Close', { duration: 3000 });
        }
      }

      // Log all form control errors for debugging
      Object.keys(this.eventForm.controls).forEach(key => {
        const control = this.eventForm.get(key);
        if (control?.errors) {
          console.error(`Validation Error in ${key}:`, control.errors);
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }
}
