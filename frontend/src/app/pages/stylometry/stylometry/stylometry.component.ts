import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { MatAccordion } from '@angular/material/expansion';
import { DocumentGroup } from 'src/app/models/document-group';
import { DocumentsByAuthor } from 'src/app/models/documents-by-author';
import { DocumentAuthor } from 'src/app/models/document-author';
import { SlidePanelsSharedService } from 'src/app/services/slide.panels.shared.service';
import { SingleDocument } from 'src/app/models/single-document';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';


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
  rowAuthor;

  selectedGroup = 0;
  selectedAuthors: number[] = [];

  modalMessage = '';
  modalType = '';
  modalIdToDelete: number;
  display = 'none';

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  ngOnInit(): void {
    this.initializePage();
  }

  constructor(
    private apiService: ApiService,
    public slidePanelsSharedService: SlidePanelsSharedService,
    private snackBar: MatSnackBar,
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

  deleteGroup(groupId: number) {
    this.apiService.deleteGroup(groupId).subscribe((data) => {
      this.newReloadPage(true);
      this.openSnackBar('Group Deleted Succesfully!');
      this.closeDialog();
    });
  }

  deleteAuthor(authorId: number) {
    this.apiService.deleteAuthor(authorId).subscribe((data) => {
      this.newReloadPage(true);
      this.openSnackBar('Author Deleted Succesfully!');
      this.closeDialog();
    });
  }

  deleteDocument(documentId: number) {
    this.apiService.deleteDocument(documentId).subscribe((data) => {
      this.newReloadPage(true);
      this.openSnackBar('Document Deleted Succesfully!');
      this.closeDialog();
    });
  }

  deleteByType(id: number) {
    if (this.modalType === 'Document') {
      this.deleteDocument(id);
    } else if (this.modalType === 'Author') {
      this.deleteAuthor(id);
    } else if (this.modalType === 'Group') {
      this.deleteGroup(id);
    }
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
          if (this.selectedGroup === 0) {
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
    if (group) {
      return group.name;
    }
  }

  showDeleteDialog(type: number, name: string, id: number): void {
    if (type === 1) {
      this.modalType = 'Document';
    } else if (type === 2) {
      this.modalType = 'Author';
    } else if (type === 3) {
      this.modalType = 'Group';
    }

    this.modalMessage = name;
    this.modalIdToDelete = id;
    this.openDialog();
  }

  openDialog(): void {
    this.display = 'block';
  }

  closeDialog(): void {
    this.modalIdToDelete = null;
    this.display = 'none';
  }

  openSnackBar(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: ['green-snackbar']
    });
  }
}
