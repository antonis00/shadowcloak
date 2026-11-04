import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { tap } from 'rxjs';

import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { CategorySelect } from '../../shared/category-select';
import { Feedback } from '../../shared/feedback';
import { RankingPipe } from '../../shared/ranking';

@Component({
  imports: [CategorySelect, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  providers: [RankingPipe],
  template: `
    <main class="page">
      <app-category-select [control]="group" [groups]="groups()" />
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Disputed text</mat-label>
        <textarea matInput rows="14" placeholder="Paste the disputed text here..." [formControl]="text"></textarea>
        <mat-error>The text is required</mat-error>
      </mat-form-field>
      <div class="actions">
        <button matButton="filled" type="button" [disabled]="!canSubmit()" (click)="findAuthor()">Detect Author</button>
      </div>
    </main>
  `,
})
export class FindAuthor {
  private readonly api = inject(ApiService);
  private readonly feedback = inject(Feedback);
  private readonly rankingPipe = inject(RankingPipe);

  readonly group = new FormControl<number | null>(null, Validators.required);
  readonly text = new FormControl('', { nonNullable: true, validators: Validators.required });
  readonly groups = toSignal(this.api.groups().pipe(
    tap(groups => this.group.setValue(groups[0]?.id ?? null)),
  ));

  private readonly chosenGroup = toSignal(this.group.valueChanges, { initialValue: null });
  private readonly currentText = toSignal(this.text.valueChanges, { initialValue: '' });
  readonly canSubmit = computed(() => this.chosenGroup() !== null && this.currentText().trim() !== '');

  findAuthor(): void {
    this.api.findAuthor(this.text.value, this.group.value!).subscribe({
      next: result => this.feedback.message(
        'Most Probable Author',
        result.mostProbableAuthor,
        this.rankingPipe.transform(result),
        ...result.warnings,
      ),
      error: response => this.feedback.message('Request Unsuccessful', apiErrorMessage(response)),
    });
  }
}
