import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnonymousTextDTO } from '../dtos/anonymous-text-dto';

import { AuthenticationService } from '../services';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private http: HttpClient,
    ) {}

  sendText(text: string, documentGroup: number): Observable<any> {
    const anonymousText: AnonymousTextDTO = {
      group : documentGroup,
      body : text
    };
    return this.http.post<AnonymousTextDTO>('findauthor/', anonymousText);
  }
}
