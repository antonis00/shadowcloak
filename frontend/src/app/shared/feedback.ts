import { Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

interface MessageData {
  title: string;
  lines: string[];
  /** When set, the dialog asks for a decision, and closes with true if this button is pressed. */
  confirmLabel?: string;
}

@Component({
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @for (line of data.lines; track line) {
        <p>{{ line }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>{{ data.confirmLabel ? 'Cancel' : 'Close' }}</button>
      @if (data.confirmLabel) {
        <button matButton="filled" [mat-dialog-close]="true">{{ data.confirmLabel }}</button>
      }
    </mat-dialog-actions>
  `,
})
class MessageDialog {
  readonly data = inject<MessageData>(MAT_DIALOG_DATA);
}

/** The one way the app tells the user something or asks them to confirm. */
@Injectable({ providedIn: 'root' })
export class Feedback {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  message(title: string, ...lines: string[]): void {
    this.dialog.open(MessageDialog, { data: { title, lines } satisfies MessageData, width: '500px' });
  }

  confirm(title: string, confirmLabel: string, ...lines: string[]): Observable<boolean | undefined> {
    return this.dialog
      .open<MessageDialog, MessageData, boolean>(MessageDialog, { data: { title, lines, confirmLabel }, width: '500px' })
      .afterClosed();
  }

  success(message: string): void {
    this.snackBar.open(message, '', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'success-snackbar',
    });
  }

  problem(message: string): void {
    this.snackBar.open(message, '', { duration: 5000, horizontalPosition: 'end', verticalPosition: 'top' });
  }
}
