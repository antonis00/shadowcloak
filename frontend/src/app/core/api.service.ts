import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Analysis, Attribution, Author, AuthorDocuments, DocumentInput, DocumentRecord, Group, NamedInput } from './api.types';

/** Writes to `path`, as an update when there is an ID and as a new record when there isn't. */
function save<T>(http: HttpClient, path: string, data: unknown, id?: number): Observable<T> {
  return id ? http.put<T>(`${path}/${id}/`, data) : http.post<T>(`${path}/`, data);
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  groups(): Observable<Group[]> {
    return this.http.get<Group[]>('groups/');
  }

  authors(): Observable<Author[]> {
    return this.http.get<Author[]>('authors/');
  }

  documentsByAuthor(group: number, authors: number[]): Observable<AuthorDocuments[]> {
    let params = new HttpParams().set('group', group);
    if (authors.length > 0) {
      params = params.set('author', authors.join(','));
    }
    return this.http.get<AuthorDocuments[]>('docsbyauthor/', { params });
  }

  saveAuthor(data: NamedInput, id?: number): Observable<Author> {
    return save(this.http, 'authors', data, id);
  }

  saveGroup(data: NamedInput, id?: number): Observable<Group> {
    return save(this.http, 'groups', data, id);
  }

  saveDocument(data: DocumentInput, id?: number): Observable<DocumentRecord> {
    return save(this.http, 'documents', data, id);
  }

  deleteAuthor(id: number): Observable<void> {
    return this.http.delete<void>(`authors/${id}/`);
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`groups/${id}/`);
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`documents/${id}/`);
  }

  findAuthor(body: string, group: number): Observable<Attribution> {
    return this.http.post<Attribution>('findauthor/', { body, group });
  }

  analyse(body: string, group: number): Observable<Analysis> {
    return this.http.post<Analysis>('analyse/', { body, group });
  }
}
