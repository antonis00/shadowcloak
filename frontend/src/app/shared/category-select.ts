import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { Group } from '../core/api.types';

/** Picks the category to analyse against, and says what to do when there are none yet. */
@Component({
  selector: 'app-category-select',
  imports: [MatFormFieldModule, MatSelectModule, ReactiveFormsModule, RouterLink],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Category</mat-label>
      <mat-select [formControl]="control()">
        @for (group of groups(); track group.id) {
          <mat-option [value]="group.id">{{ group.name }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
    @if (groups()?.length === 0) {
      <p class="form-error no-categories">
        You don't have any categories yet. <a routerLink="/documents">Add one on the Documents page.</a>
      </p>
    }
  `,
  styles: `.no-categories { margin: -8px 0 16px; }`,
})
export class CategorySelect {
  readonly control = input.required<FormControl<number | null>>();
  /** Undefined until they have loaded, so "you have none" never flashes up. */
  readonly groups = input.required<Group[] | undefined>();
}
