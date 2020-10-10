import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnonymousTextDTO } from '../dtos/anonymous-text-dto';

import { DocumentsByAuthor } from '../models/documents-by-author';
import { DocumentGroup } from '../models/document-group';
import { DocumentAuthor } from '../models/document-author';
import { CreateDocumentDTO } from '../dtos/create-document-dto';
import { CreateAuthorDTO } from '../dtos/create-author-dto';
import { CreateGroupDTO } from '../dtos/create-group-dto';


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


  getDocuments(groupName?: string): Observable<DocumentsByAuthor[]> {
    if (groupName) {
      return this.http.get<DocumentsByAuthor[]>('docsbyauthor/?group=' + groupName);
    }
    return this.http.get<DocumentsByAuthor[]>('docsbyauthor/');

  }

  getDocumentsGroups(): Observable<DocumentGroup[]> {
    return this.http.get<DocumentGroup[]>('groups/');
  }

  getDocumentsAuthors(): Observable<DocumentAuthor[]> {
    return this.http.get<DocumentAuthor[]>('authors/');
  }

  getAuthor(authorId: number): Observable<DocumentAuthor> {
    return this.http.get<DocumentAuthor>('authors/' + authorId + '/');
  }

  getGroup(groupId: number): Observable<DocumentGroup> {
    return this.http.get<DocumentGroup>('groups/' + groupId + '/');
  }

  createDocument(data): Observable<CreateDocumentDTO> {
    return this.http.post<CreateDocumentDTO>('documents/', data);
  }

  createAuthor(data): Observable<CreateAuthorDTO> {
    return this.http.post<CreateAuthorDTO>('authors/', data);
  }

  createGroup(data): Observable<CreateGroupDTO> {
    return this.http.post<CreateGroupDTO>('groups/', data);
  }

  editDocument(data, id: number): Observable<CreateDocumentDTO> {
    return this.http.put<CreateDocumentDTO>('documents/' + id + '/', data);
  }


  editAuthor(data, id: number): Observable<CreateAuthorDTO> {
    return this.http.put<CreateAuthorDTO>('authors/' + id + '/', data);
  }


  editGroup(data, id: number): Observable<CreateGroupDTO> {
    return this.http.put<CreateGroupDTO>('groups/' + id + '/', data);
  }


  deleteDocument(id: number): Observable<number> {
    return this.http.delete<number>('documents/' + id + '/');
  }


  deleteGroup(id: number): Observable<number> {
    return this.http.delete<number>('groups/' + id + '/');
  }

  deleteAuthor(id: number): Observable<number> {
    return this.http.delete<number>('authors/' + id + '/');
  }
}
