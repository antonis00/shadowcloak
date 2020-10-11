import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { MatAccordion } from '@angular/material/expansion';
import { DocumentGroup } from 'src/app/models/document-group';
import { DocumentsByAuthor } from 'src/app/models/documents-by-author';
import { DocumentAuthor } from 'src/app/models/document-author';
import { SlidePanelsSharedService } from 'src/app/services/slide.panels.shared.service';
import { SingleDocument } from 'src/app/models/single-document';


@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss'],
  providers: [SlidePanelsSharedService]
})

export class StylometryComponent implements OnInit {
  @ViewChild(MatAccordion) accordion: MatAccordion;

  documentAuthors: DocumentAuthor[] = [];
  documentGroups: DocumentGroup[] = [];
  documentsByAuthor: DocumentsByAuthor[] = [];
  reloadPage = false;

  rowIndex;

  selectedGroup = 3;
  selectedAuthors: number[] = [];


  ngOnInit(): void {
    this.initializePage();
  }

  constructor(
    private apiService: ApiService,
    public slidePanelsSharedService: SlidePanelsSharedService,
  ) { }

  openGroupSlidePanel(choice: number, group?: number) {
    this.slidePanelsSharedService.showPanelContainer = true;
    this.slidePanelsSharedService.showGroupPanel = true;
    if (choice === 1) {
      this.slidePanelsSharedService.headerText = 'Add Group';
      this.slidePanelsSharedService.buttonText = 'Create';
      this.slidePanelsSharedService.isEditPanel = false;
    } else {
      this.slidePanelsSharedService.headerText = 'Edit Group';
      this.slidePanelsSharedService.buttonText = 'Update';
      this.slidePanelsSharedService.isEditPanel = true;
      this.slidePanelsSharedService.groupToEdit = group;
    }
  }

  openAuthorSlidePanel(choice: number, author?: number) {
    this.slidePanelsSharedService.showPanelContainer = true;
    this.slidePanelsSharedService.showAuthorPanel = true;
    if (choice === 1) {
      this.slidePanelsSharedService.headerText = 'Add Author';
      this.slidePanelsSharedService.buttonText = 'Create';
      this.slidePanelsSharedService.isEditPanel = false;
    } else {
      this.slidePanelsSharedService.headerText = 'Edit Author';
      this.slidePanelsSharedService.buttonText = 'Update';
      this.slidePanelsSharedService.isEditPanel = true;
      this.slidePanelsSharedService.authorToEdit = author;
    }
  }

  openDocumentSlidePanel(choice: number, document?: SingleDocument) {
    this.slidePanelsSharedService.showPanelContainer = true;
    this.slidePanelsSharedService.showDocumentPanel = true;
    if (choice === 1) {
      this.slidePanelsSharedService.headerText = 'Add Document';
      this.slidePanelsSharedService.buttonText = 'Create';
      this.slidePanelsSharedService.isEditPanel = false;
    } else {
      this.slidePanelsSharedService.headerText = 'Edit Document';
      this.slidePanelsSharedService.buttonText = 'Update';
      this.slidePanelsSharedService.isEditPanel = true;
      this.slidePanelsSharedService.documentToEdit = document;
    }
  }

  deleteGroup(group: DocumentGroup) {
    this.apiService.deleteGroup(group.id).subscribe((data) => {
      this.newReloadPage(true);
    });
  }

  deleteAuthor(author: DocumentAuthor) {
    this.apiService.deleteAuthor(author.id).subscribe((data) => {
      this.newReloadPage(true);
    });
  }

  deleteDocument(document: SingleDocument) {
    this.apiService.deleteDocument(document.id).subscribe((data) => {
      this.newReloadPage(true);
    });
  }

  newGroups() {
    this.slidePanelsSharedService.nextGroups(this.documentGroups);
  }

  newAuthors() {
    this.slidePanelsSharedService.nextAuthors(this.documentAuthors);
  }

  newReloadPage(value: boolean) {
    this.slidePanelsSharedService.nextReloadPage(value);
  }

  initializePage() {
    this.slidePanelsSharedService.reloadPage.subscribe((value) => {
      if (value === true) {

        this.apiService.getDocumentsGroups().subscribe(res => {
          this.documentGroups = res;
          this.newGroups();
          if (!this.selectedGroup) {
            this.selectedGroup = this.documentGroups[0].id;
          }
        });

        this.apiService.getDocumentsAuthors().subscribe(res => {
          this.documentAuthors = res;
          this.newAuthors();
        });

        this.apiService.getDocuments(this.selectedGroup, this.selectedAuthors).subscribe(res => {
          this.documentsByAuthor = res;
        });

        this.newReloadPage(false);
      }
    });
  }

  getSelectedGroup(grouId: number) {
    this.selectedGroup = grouId;
    this.newReloadPage(true);
  }


  getSelectedAuthors(event: {
    isUserInput: any;
    source: { value: any; selected: any };
  }) {
    if (event.isUserInput) {
      const selectedAuthorId = event.source.value;
      if (event.source.selected === true) {
        if (this.selectedAuthors.indexOf(selectedAuthorId) === -1) {
          this.selectedAuthors.push(selectedAuthorId);
        }
      } else {
        const index = this.selectedAuthors.indexOf(selectedAuthorId, 0);
        if (index > -1) {
          this.selectedAuthors.splice(index, 1);
        }
      }
    }
  }

  sendSelectedAuthors(clickOpen: boolean) {
    if (!clickOpen) {
      this.newReloadPage(true);
    }
  }

  get CurrentGroup() {
    const group = this.documentGroups.find(x => x.id === this.selectedGroup);
    return group.name;
}

}
