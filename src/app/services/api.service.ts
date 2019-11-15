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

  getAllTexts(): Observable<any> {
    return this.http.get(this.baseUrl + '/texts/',
    {headers: this.httpHeaders});
  }

  getText(id: number): Observable<any> {
    return this.http.get(this.baseUrl + '/texts/' + id + '/',
    {headers: this.httpHeaders});
  }

  sendText(text: string): Observable<string> {
    const userText: UserTextDTO = {
      content : text,
    };
    return this.http.post<string>(this.baseUrl + '/userText/', userText,
    {headers: this.httpHeaders});
  }
}
