import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material';
import { SlidePanelsSharedService } from 'src/app/services';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-group-slide-panel',
  templateUrl: './group-slide-panel.component.html',
  styleUrls: ['./group-slide-panel.component.scss']
})
export class GroupSlidePanelComponent implements OnInit {

  groupForm: FormGroup;
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
  ) { }

  ngOnInit(): void {
    this.headerText = this.slidePanelsSharedService.headerText;
    this.buttonText = this.slidePanelsSharedService.buttonText;

    this.groupForm = this.formBuilder.group({
      id: [],
      name: ['', Validators.required],
      description: ['', ],
    });

    if (this.slidePanelsSharedService.isEditPanel) {
      const groupId = this.slidePanelsSharedService.groupToEdit;
      this.apiService.getGroup(groupId).subscribe(
        (group) => {
          this.groupForm.get('id').patchValue(group.id);
          this.groupForm.get('name').patchValue(group.name);
          this.groupForm.get('description').patchValue(group.description);
        }
      );
    }
  }

  get fval() { return this.groupForm.controls; }

  onFormSubmit() {
    this.submitted = true;
    if (this.groupForm.invalid) {
      return;
    }
    this.loading = true;

    if (this.slidePanelsSharedService.isEditPanel) {
      this.apiService.editGroup(this.groupForm.value, this.groupForm.get('id').value).subscribe(
        (data) => {
          this.openSnackBar('Group updated Succesfully!');
          this.closeSlidePanel();
          this.newReloadPage();
        },
        (error) => {
          this.loading = false;
        }
      );
    } else {
      this.apiService.createGroup(this.groupForm.value).subscribe(
        (data) => {
          this.openSnackBar('Group Created Succesfully!');
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
    this.slidePanelsSharedService.showGroupPanel = false;
  }

  newReloadPage() {
    this.slidePanelsSharedService.nextReloadPage(true);
  }

}
