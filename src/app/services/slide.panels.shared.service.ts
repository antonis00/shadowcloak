import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { CreateAuthorDTO } from '../dtos/create-author-dto';
import { CreateDocumentDTO } from '../dtos/create-document-dto';
import { CreateGroupDTO } from '../dtos/create-group-dto';
import { DocumentAuthor } from '../models/document-author';
import { DocumentGroup } from '../models/document-group';
import { SingleDocument } from '../models/single-document';
import { Injectable } from "@angular/core";

@Injectable()
export class SlidePanelsSharedService {

  documentData: CreateDocumentDTO[];
  authorData: CreateAuthorDTO[];
  groupData: CreateGroupDTO[];

  private reloadPageSubject = new BehaviorSubject(true);
  reloadPage =  this.reloadPageSubject.asObservable();

  groups: DocumentGroup[] = [];
  private currentGroupsSubject = new BehaviorSubject(this.groups);
  currentGroups =  this.currentGroupsSubject.asObservable();

  authors: DocumentAuthor[] = [];
  private currentAuthorsSubject = new BehaviorSubject(this.authors);
  currentAuthors =  this.currentAuthorsSubject.asObservable();

  showPanelContainer = false;
  showDocumentPanel = false;
  showAuthorPanel = false;
  showGroupPanel = false;
  isEditPanel = false;
  headerText = 'Add Document';
  buttonText = 'Create';

  documentToEdit: SingleDocument;
  groupToEdit: number;
  authorToEdit: number;

  constructor() {}

  nextGroups(groups: DocumentGroup[]) {
    this.currentGroupsSubject.next(groups);
  }

  nextAuthors(authors: DocumentAuthor[]) {
    this.currentAuthorsSubject.next(authors);
  }

  nextReloadPage(value: boolean) {
    this.reloadPageSubject.next(value);
  }
}
