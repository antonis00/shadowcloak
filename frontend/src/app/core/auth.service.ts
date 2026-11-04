import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { Registration } from './api.types';

interface CurrentUser {
  username: string | null;
}

/**
 * The session lives in an HttpOnly cookie that scripts can't read, so this service
 * only keeps the username the server last reported.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly username = signal<string | null>(null);

  readonly currentUser = this.username.asReadonly();

  /** Runs once at startup. It also sets the CSRF cookie that every later POST needs. */
  loadCurrentUser(): Observable<void> {
    return this.http.get<CurrentUser>('auth/me/').pipe(
      tap(response => this.username.set(response.username)),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  register(registration: Registration): Observable<unknown> {
    return this.http.post('auth/register/', registration);
  }

  login(username: string, password: string): Observable<void> {
    return this.http.post<CurrentUser>('auth/login/', { username, password }).pipe(
      tap(response => this.username.set(response.username)),
      map(() => undefined),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('auth/logout/', {}).pipe(tap(() => this.clearCurrentUser()));
  }

  clearCurrentUser(): void {
    this.username.set(null);
  }
}
