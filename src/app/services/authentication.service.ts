import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
// @ts-ignore
import jwt_decode from 'jwt-decode';

import { User } from '../models';
import { environment } from 'src/environments/environment';
import { CredentialsDTO } from '../dtos/credentials-dto';
import { TokensDTO } from '../dtos/tokens-dto';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private currentUserSubject: BehaviorSubject<string>;
  public currentUser: Observable<string>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<string>(JSON.parse(localStorage.getItem('stylometryToken')));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): string {
    return this.currentUserSubject.value;
  }

  login(name: string, pass: string) {
    let user;
    const credentials: CredentialsDTO = {
      username: name,
      password: pass
    };

    return this.http.post<any>('token/', credentials).pipe(
      mergeMap(tokens => {
        if (tokens.access && tokens.refresh) {
          return this.http.post<any>('token/refresh/', { refresh : tokens.refresh})
            .pipe(
              map(token => {
                if (tokens.access) {
                  localStorage.setItem('stylometryUserToken', tokens.access);
                  user = jwt_decode(tokens.access).name;
                  this.currentUserSubject.next(user);
                }
              }));
        }
        return user;
      })
    );
  }

  logout() {
    localStorage.removeItem('stylometryUserToken');
    this.currentUserSubject.next(null);
  }
}
