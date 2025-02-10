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
    MatButtonModule
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
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    const startDate = data.start ? moment(data.start).toDate() : new Date();
    const startHour = data.start ? moment(data.start).hours() : moment().hours();
    
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [startDate, Validators.required],
      startHour: [startHour, Validators.required],
      duration: [30, [Validators.required, Validators.min(1), Validators.max(1440)]],
      is_recurring: [data.is_recurring || false],
      weekdays: this.fb.group({
        MO: [false],
        TU: [false],
        WE: [false],
        TH: [false],
        FR: [false],
        SA: [false],
        SU: [false]
      })
    });

    // Set initial weekdays if editing an existing event
    if (data.recurring_days) {
      const weekdaysGroup = this.eventForm.get('weekdays') as FormGroup;
      data.recurring_days.forEach((day: string) => {
        if (weekdaysGroup.contains(day)) {
          weekdaysGroup.get(day)?.setValue(true);
        }
      });
    }

    // Watch is_recurring changes to handle weekdays validation
    this.eventForm.get('is_recurring')?.valueChanges.subscribe((is_recurring: boolean) => {
      const weekdaysGroup = this.eventForm.get('weekdays') as FormGroup;
      if (is_recurring) {
        Object.keys(weekdaysGroup.controls).forEach(key => {
          weekdaysGroup.get(key)?.setValidators(Validators.requiredTrue);
          weekdaysGroup.get(key)?.updateValueAndValidity();
        });
      } else {
        Object.keys(weekdaysGroup.controls).forEach(key => {
          weekdaysGroup.get(key)?.clearValidators();
          weekdaysGroup.get(key)?.updateValueAndValidity();
        });
      }
    });
  }

  onSubmit() {
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

      this.dialogRef.close(result);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }
}
