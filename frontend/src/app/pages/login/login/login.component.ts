import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import { apiErrorMessage } from '../../../helpers/api-error';
import { AuthenticationService } from '../../../services/authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  loading = false;
  submitted = false;
  credentialsAreValid = true;
  credentialsValidityError: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

  }

  // for accessing form fields
  get fval() { return this.loginForm.controls; }

  onFormSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authenticationService.login(this.fval.username.value, this.fval.password.value)
      .subscribe(
        data => {
          // navigateByUrl stays inside the app, so this can't send anyone to another site.
          this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/');
        },
        response => {
          this.credentialsAreValid = false;
          this.credentialsValidityError = apiErrorMessage(response);
          this.loading = false;
        });
  }
}
