import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { apiErrorMessage } from '../../../helpers/api-error';
import { UserService } from '../../../services/user.service';

import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Component({
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  serverError = '';
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password1: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  get fval() { return this.registerForm.controls; }

  onFormSubmit() {
    this.submitted = true;
    this.serverError = '';
    // return for here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }
    this.loading = true;
    this.userService.register(this.registerForm.value).subscribe(
      (data) => {
        this.openSnackBar();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      (error) => {
        this.loading = false;
        this.serverError = apiErrorMessage(error);
      }
    );
  }

  openSnackBar() {
    this.snackBar.open('Registration Successful! Redirecting to Login Page...', '', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: ['green-snackbar']
    });
  }
}
