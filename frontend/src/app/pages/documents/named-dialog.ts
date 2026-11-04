import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { NamedInput } from '../../core/api.types';
import { Feedback } from '../../shared/feedback';

export interface NamedDialogData {
  kind: 'Author' | 'Group';
  record?: NamedInput & { id: number };
}

/** Authors and groups hold the same two fields, so one dialog adds and edits both. */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <h2 mat-dialog-title>{{ data.record ? 'Edit' : 'Add' }} {{ data.kind }}</h2>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
          <mat-error>The name is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput rows="4" formControlName="description"></textarea>
        </mat-form-field>
        @if (error(); as message) {
          <p class="form-error">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancel</button>
        <button matButton="filled" type="submit" [disabled]="loading()">{{ data.record ? 'Update' : 'Create' }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class NamedDialog {
  private readonly api = inject(ApiService);
  private readonly feedback = inject(Feedback);
  private readonly dialogRef = inject<MatDialogRef<NamedDialog, boolean>>(MatDialogRef);

  readonly data = inject<NamedDialogData>(MAT_DIALOG_DATA);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data.record?.name ?? '', Validators.required],
    description: [this.data.record?.description ?? ''],
  });
  readonly loading = signal(false);
  readonly error = signal('');

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { kind, record } = this.data;
    const request = kind === 'Author'
      ? this.api.saveAuthor(this.form.getRawValue(), record?.id)
      : this.api.saveGroup(this.form.getRawValue(), record?.id);
    request.subscribe({
      next: () => {
        this.feedback.success(`${kind} saved.`);
        this.dialogRef.close(true);
      },
      error: response => {
        this.error.set(apiErrorMessage(response));
        this.loading.set(false);
      },
    });
  }
}
