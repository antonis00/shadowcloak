import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class InterceptorService implements HttpInterceptor {
  constructor(
    private authenticationService: AuthenticationService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req.clone({ url: environment.apiBaseUrl + req.url })).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authenticationService.clearCurrentUser();
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        }
        return throwError(error);
      })
    );
  }
}
