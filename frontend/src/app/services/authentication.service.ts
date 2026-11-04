import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { CredentialsDTO } from '../dtos/credentials-dto';

interface CurrentUserResponse {
  username: string | null;
}

/**
 * The session lives in an HttpOnly cookie that scripts can't read, so this service
 * only keeps the username the server last reported.
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private currentUserSubject = new BehaviorSubject<string | null>(null);
  public currentUser = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  public get currentUserValue(): string | null {
    return this.currentUserSubject.value;
  }

  /** Runs once at startup. It also sets the CSRF cookie that every later POST needs. */
  loadCurrentUser(): Observable<void> {
    return this.http.get<CurrentUserResponse>('auth/me/').pipe(
      tap(response => this.currentUserSubject.next(response.username)),
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  login(name: string, pass: string): Observable<void> {
    const credentials: CredentialsDTO = {
      username: name,
      password: pass
    };

    return this.http.post<CurrentUserResponse>('auth/login/', credentials).pipe(
      tap(response => this.currentUserSubject.next(response.username)),
      map(() => undefined)
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('auth/logout/', {}).pipe(
      tap(() => this.clearCurrentUser())
    );
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
  }
}
