import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { Author, DocumentInput, DocumentRecord, Group } from '../../core/api.types';
import { Feedback } from '../../shared/feedback';

// The API requires a date that nothing uses. See F9 in the review.
const PLACEHOLDER_DATE = '2002-02-20';

export interface DocumentDialogData {
  document?: DocumentRecord;
  authors: Author[];
  groups: Group[];
  group: number | null;
}

@Component({
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <h2 mat-dialog-title>{{ data.document ? 'Edit' : 'Add' }} Document</h2>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" />
          <mat-error>The title is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Publication date</mat-label>
          <input matInput type="date" formControlName="publication_date" />
          <mat-error>The date is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Author</mat-label>
          <mat-select formControlName="author">
            @for (author of data.authors; track author.id) {
              <mat-option [value]="author.id">{{ author.name }}</mat-option>
            }
          </mat-select>
          <mat-error>The author is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Group</mat-label>
          <mat-select formControlName="group">
            @for (group of data.groups; track group.id) {
              <mat-option [value]="group.id">{{ group.name }}</mat-option>
            }
          </mat-select>
          <mat-error>The group is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Text</mat-label>
          <textarea matInput rows="10" formControlName="body"></textarea>
          <mat-error>The text is required</mat-error>
        </mat-form-field>
        @if (error(); as message) {
          <p class="form-error">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancel</button>
        <button matButton="filled" type="submit" [disabled]="loading()">{{ data.document ? 'Update' : 'Create' }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class DocumentDialog {
  private readonly api = inject(ApiService);
  private readonly feedback = inject(Feedback);
  private readonly dialogRef = inject<MatDialogRef<DocumentDialog, boolean>>(MatDialogRef);

  readonly data = inject<DocumentDialogData>(MAT_DIALOG_DATA);
  private readonly document = this.data.document;

  readonly form = inject(FormBuilder).group({
    title: [this.document?.title ?? '', Validators.required],
    description: [this.document?.description ?? ''],
    publication_date: [this.document?.publication_date ?? PLACEHOLDER_DATE, Validators.required],
    author: [this.document?.author ?? null, Validators.required],
    group: [this.document?.group ?? this.data.group, Validators.required],
    body: [this.document?.body ?? '', Validators.required],
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
    const input = { ...this.form.getRawValue(), active: this.document?.active ?? true } as DocumentInput;
    this.api.saveDocument(input, this.document?.id).subscribe({
      next: () => {
        this.feedback.success('Document saved.');
        this.dialogRef.close(true);
      },
      error: response => {
        this.error.set(apiErrorMessage(response));
        this.loading.set(false);
      },
    });
  }
}
