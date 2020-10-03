import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnonymousTextDTO } from '../dtos/user-text-dto';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = 'http://127.0.0.1:8000/api';
  httpHeaders = new HttpHeaders({'Content-type': 'application/json'});

  constructor(private http: HttpClient) {}

  sendText(text: string, documentGroup: number): Observable<AnonymousTextDTO> {
    const anonymousText: AnonymousTextDTO = {
      body : text,
      group : documentGroup
    };
    return this.http.post<AnonymousTextDTO>(this.baseUrl + '/findauthor/', anonymousText,
    {headers: this.httpHeaders});
  }
}
