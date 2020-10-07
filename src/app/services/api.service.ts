import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnonymousTextDTO } from '../dtos/anonymous-text-dto';

import { DocumentByAuthor } from '../models/document-by-author';
import { DocumentGroup } from '../models/document-group';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private http: HttpClient,
    ) {}

  findAuthor(text: string, documentGroup: number): Observable<any> {
    const anonymousText: AnonymousTextDTO = {
      group : documentGroup,
      body : text
    };
    return this.http.post<AnonymousTextDTO>('findauthor/', anonymousText);
  }



  getDocuments(groupName?: string): Observable<DocumentByAuthor[]> {
    if (groupName) {
      return this.http.get<DocumentByAuthor[]>('docsbyauthor/?group=' + groupName);
    }
    return this.http.get<DocumentByAuthor[]>('docsbyauthor/');

  }


  getDocumentsGroups(): Observable<DocumentGroup[]> {
    return this.http.get<DocumentGroup[]>('groups/');
  }

  // get(id): Observable<any> {
  //   return this.http.get(`${environment.apiBaseUrl}/${id}`);
  // }

  // create(data): Observable<any> {
  //   return this.http.post(environment.apiBaseUrl, data);
  // }

  // update(id, data): Observable<any> {
  //   return this.http.put(`${environment.apiBaseUrl}/${id}`, data);
  // }

  // delete(id): Observable<any> {
  //   return this.http.delete(`${environment.apiBaseUrl}/${id}`);
  // }

  // deleteAll(): Observable<any> {
  //   return this.http.delete(environment.apiBaseUrl);
  // }

  // findByTitle(title): Observable<any> {
  //   return this.http.get(`${environment.apiBaseUrl}?title=${title}`);
  // }


}
