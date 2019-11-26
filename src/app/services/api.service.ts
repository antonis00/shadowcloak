import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserTextDTO } from '../dtos/user-text-dto';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = 'http://127.0.0.1:8000';
  httpHeaders = new HttpHeaders({'Content-type': 'application/json'});

  constructor(private http: HttpClient) {}

  sendText(text: string): Observable<UserTextDTO> {
    const userText: UserTextDTO = {
      anonymizedText : text,
    };
    return this.http.post<UserTextDTO>(this.baseUrl + '/userText/', userText,
    {headers: this.httpHeaders});
  }
}
