import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material';
import { SlidePanelsSharedService } from 'src/app/services';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-author-slide-panel',
  templateUrl: './author-slide-panel.component.html',
  styleUrls: ['./author-slide-panel.component.scss']
})
export class AuthorSlidePanelComponent implements OnInit {

  authorForm: FormGroup;
  loading = false;
  submitted = false;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  headerText: string;
  buttonText: string;

  constructor(
    private formBuilder: FormBuilder,
    public slidePanelsSharedService: SlidePanelsSharedService,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    ) {}

  ngOnInit(): void {
    this.headerText = this.slidePanelsSharedService.headerText;
    this.buttonText = this.slidePanelsSharedService.buttonText;

    this.authorForm = this.formBuilder.group({
      id: [],
      name: ['', Validators.required],
      description: ['', ],
    });

    if (this.slidePanelsSharedService.isEditPanel) {
      const authorId = this.slidePanelsSharedService.authorToEdit;
      this.apiService.getAuthor(authorId).subscribe(
        (author) => {
          this.authorForm.get('id').patchValue(author.id);
          this.authorForm.get('name').patchValue(author.name);
          this.authorForm.get('description').patchValue(author.description);
        }
      );
    }
  }

  get fval() { return this.authorForm.controls; }

  onFormSubmit() {
    this.submitted = true;
    if (this.authorForm.invalid) {
      return;
    }
    this.loading = true;

    if (this.slidePanelsSharedService.isEditPanel) {
      this.apiService.editAuthor(this.authorForm.value, this.authorForm.get('id').value).subscribe(
        (data) => {
          this.openSnackBar('Author updated Succesfully!');
          this.closeSlidePanel();
          this.newReloadPage();
        },
        (error) => {
          this.loading = false;
        }
      );
    } else {
      this.apiService.createAuthor(this.authorForm.value).subscribe(
        (data) => {
          this.openSnackBar('Author Created Succesfully!');
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
    this.slidePanelsSharedService.showAuthorPanel = false;
  }

  newReloadPage() {
    this.slidePanelsSharedService.nextReloadPage(true);
  }

}
