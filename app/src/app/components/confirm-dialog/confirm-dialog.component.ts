/**
 * Confirm Dialog module for handling destructive actions
 * 
 * Provides a reusable confirmation dialog with:
 * - Customizable title and message
 * - Cancel and Confirm actions
 * - Standardized user interaction for deletion or critical actions
 * 
 * @module ConfirmDialogComponent
 * @description Utility dialog for user confirmation before critical actions
 */
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/**
 * Interface defining the structure of data passed to the Confirm Dialog
 * 
 * @interface
 * @description Represents the configuration for a confirmation dialog
 */
export interface ConfirmDialogData {
  /** Title of the confirmation dialog */
  title: string;
  /** Message explaining the action to be confirmed */
  message: string;
}

/**
 * Confirm Dialog Component for handling user confirmations
 * 
 * Features:
 * - Dynamic title and message
 * - Cancel and Confirm buttons
 * - Configurable dialog actions
 * 
 * @class
 */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      {{ data.message }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule
  ]
})
export class ConfirmDialogComponent {
  /**
   * Creates an instance of ConfirmDialogComponent
   * 
   * @param {MatDialogRef<ConfirmDialogComponent>} dialogRef - Reference to the dialog for closing
   * @param {ConfirmDialogData} data - Configuration data for the dialog
   */
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  /**
   * Handles the cancel action
   * 
   * Closes the dialog and returns false to indicate cancellation
   */
  onCancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Handles the confirmation action
   * 
   * Closes the dialog and returns true to indicate confirmation
   */
  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
