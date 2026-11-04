import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { Feedback } from '../../shared/feedback';

// The server has the final say. This only saves a round trip for the most common mistake.
const MIN_PASSWORD_LENGTH = 8;

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="narrow-page">
      <h1>Register</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" autocomplete="username" />
          <mat-error>Username is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password1" autocomplete="new-password" />
          <mat-error>Password must be at least 8 characters</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Repeat password</mat-label>
          <input matInput type="password" formControlName="password2" autocomplete="new-password" />
          <mat-error>Password must be at least 8 characters</mat-error>
        </mat-form-field>
        @if (error(); as message) {
          <p class="form-error">{{ message }}</p>
        }
        <div class="actions">
          <button matButton="filled" type="submit" [disabled]="loading()">Register</button>
          <a matButton routerLink="/login">Login to continue</a>
        </div>
      </form>
    </main>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);

  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password1: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
    password2: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
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
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.feedback.success('Registered. You can log in now.');
        this.router.navigate(['/login']);
      },
      error: response => {
        this.error.set(apiErrorMessage(response));
        this.loading.set(false);
      },
    });
  }
}
