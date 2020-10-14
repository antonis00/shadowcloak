import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material';
import { DocumentAuthor } from 'src/app/models/document-author';
import { DocumentGroup } from 'src/app/models/document-group';
import { ApiService } from 'src/app/services/api.service';
import { SlidePanelsSharedService } from 'src/app/services/slide.panels.shared.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-document-slide-panel',
  templateUrl: './document-slide-panel.component.html',
  styleUrls: ['./document-slide-panel.component.scss'],
  providers: [DatePipe]
})

export class DocumentSlidePanelComponent implements OnInit {
  documentForm: FormGroup;
  loading = false;
  submitted = false;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  groupOptions: DocumentGroup[];
  authorOptions: DocumentAuthor[];
  headerText: string;
  buttonText: string;

  constructor(
    private formBuilder: FormBuilder,
    public slidePanelsSharedService: SlidePanelsSharedService,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.slidePanelsSharedService.currentGroups.subscribe(groups => this.groupOptions = groups);
    this.slidePanelsSharedService.currentAuthors.subscribe(authors => this.authorOptions = authors);

    this.headerText = this.slidePanelsSharedService.headerText;
    this.buttonText = this.slidePanelsSharedService.buttonText;

    this.documentForm = this.formBuilder.group({
      id: [],
      active: [true, Validators.required],
      title: ['', Validators.required],
      description: ['', ],
      body: ['', Validators.required],
      publication_date: ['2002-02-20'],
      author: [, Validators.required],
      group: [, Validators.required],
    });

    if (this.slidePanelsSharedService.isEditPanel) {
      const document = this.slidePanelsSharedService.documentToEdit;
      this.documentForm.get('id').patchValue(document.id);
      this.documentForm.get('active').patchValue(document.active);
      this.documentForm.get('title').patchValue(document.title);
      this.documentForm.get('description').patchValue(document.description);
      this.documentForm.get('body').patchValue(document.body);
      this.documentForm.get('author').patchValue(document.author);
      this.documentForm.get('group').patchValue(document.group);
      this.documentForm.get('publication_date').patchValue(document.publication_date);
    }
  }
  get fval() { return this.documentForm.controls; }

  onFormSubmit() {
    this.submitted = true;
    if (this.documentForm.invalid) {
      return;
    }
    this.loading = true;
    const datePipe = this.datePipe.transform(this.documentForm.get('publication_date').value, 'yyyy-MM-dd');
    this.documentForm.get('publication_date').patchValue(datePipe);

    if (this.slidePanelsSharedService.isEditPanel) {
      this.apiService.editDocument(this.documentForm.value, this.documentForm.get('id').value).subscribe(
        (data) => {
          this.openSnackBar('Document updated Succesfully!');
          this.closeSlidePanel();
          this.newReloadPage();
        },
        (error) => {
          this.loading = false;
        }
      );
    } else {
      this.apiService.createDocument(this.documentForm.value).subscribe(
        (data) => {
          this.openSnackBar('Document Created Succesfully!');
          this.closeSlidePanel();
          this.newReloadPage();
        },
        (error) => {
          this.loading = false;
        }
      );
    }

  }

  openSnackBar(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: ['green-snackbar']
    });
  }

  closeSlidePanel() {
    this.slidePanelsSharedService.showPanelContainer = false;
    this.slidePanelsSharedService.showDocumentPanel = false;
  }

  newReloadPage() {
    this.slidePanelsSharedService.nextReloadPage(true);
  }

}
