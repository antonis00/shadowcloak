import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { MatAccordion } from '@angular/material/expansion';
import { DocumentGroup } from 'src/app/models/document-group';
import { DocumentsByAuthor } from 'src/app/models/documents-by-author';
import { DocumentAuthor } from 'src/app/models/document-author';



@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss'],
  animations: []
})

export class StylometryComponent implements OnInit {
  @ViewChild(MatAccordion) accordion: MatAccordion;

  documentGroups: DocumentGroup[] = [];
  documentsByAuthor: DocumentsByAuthor[] = [];
  documentAuthors: DocumentAuthor[] = [];

  @Output() groupSlidePanelEvent = new EventEmitter();
  addedAuthors: number[] = [];

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.apiService.getDocumentsGroups().subscribe(res => {
      this.documentGroups = res;
    });


    this.apiService.getDocumentsAuthors().subscribe(res => {
      this.documentAuthors = res;
    });


    this.apiService.getDocuments('books').subscribe(res => {
      this.documentsByAuthor = res;
    });

  }

  openGroupSlidePanel(choice: number) {
    this.groupSlidePanelEvent.emit(choice);
    console.log('clicked: group');
    return choice;
  }

  closeGroupSlidePanel() {
    return 0;
  }

  openAuthorSlidePanel(choice: number) {
    choice === 1 ? console.log('add') : console.log('edit');
    return choice;
  }

  closeAuthorSlidePanel() {
    return 0;
  }

  openDocumentSlidePanel(choice: number) {
    choice === 1 ? console.log('add') : console.log('edit');
    return choice;
  }

  closeDocumentSlidePanel() {
    return 0;
  }

}
