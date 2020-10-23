import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DocumentGroup } from 'src/app/models/document-group';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material';

@Component({
  templateUrl: './obfuscate.component.html',
  styleUrls: ['./obfuscate.component.scss'],
  animations: [
    fadeInOnEnterAnimation(),
    fadeOutOnLeaveAnimation({ duration: 1000, delay: 100 })
  ]
})
export class ObfuscateComponent implements OnInit {

  @ViewChild('anonymousTextArea', { static: false }) anonymousTextArea: ElementRef;

  stylometryForm: FormGroup;
  comparisonResult: string;
  comparisonError = '';
  alertMessage = '';
  display = 'none';
  allTokens = ['and', 'so', 'if'];
  filteredTtokens = ['and', 'so', 'if', 'now', 'well'];
  displaySuccessModal = 'none';
  displayErrorModal = 'none';
  displayResetModal = 'none';
  displayChangedGroupModal = 'none';
  colors = ['primary', 'accent', 'warn', 'default'];
  documentGroups: DocumentGroup[] = [];
  selectedGroup;
  randomColor;

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  ngOnInit(): void {
    this.stylometryForm = new FormGroup({
      anonymousTextArea: new FormControl(null, Validators.required),
      groupSelect: new FormControl(null, Validators.required)
    });

    this.apiService.getDocumentsGroups().subscribe(res => {
      this.documentGroups = res;
      if (!this.selectedGroup) {
        this.selectedGroup = this.documentGroups[0].id;
        this.stylometryForm.controls.groupSelect.setValue(this.selectedGroup);
      }
    });
  }

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) { }

  startAnalysis() {
    if (this.comparisonResult) {
      this.showResetDialog();
    } else {
      this.findAuthor();
    }
  }

  evaluate(): void {
    if (this.comparisonResult && this.selectedGroup !== this.stylometryForm.get('groupSelect').value) {
      this.showChangedGroupDialog();
    } else {
      this.findAuthor();
    }
  }

  findAuthor(): void {
    this.sendTextForAttribution(this.stylometryForm.get('anonymousTextArea').value, this.stylometryForm.get('groupSelect').value);
  }

  sendTextForAttribution(text: string, group: number): void {
    this.apiService.findAuthor(text, group).subscribe(
      data => {
        this.showResultAuthorDialog(data);
      },
      error => {
        this.showErrorDialog(error.error.detail);
      }
    );
  }

  showResultAuthorDialog(author: string): void {
    this.comparisonResult = author;
    this.openDialog(1);
  }

  showErrorDialog(error: string): void {
    this.comparisonError = error;
    this.openDialog(2);
  }

  showResetDialog(): void {
    this.openDialog(3);
  }

  showChangedGroupDialog(): void {
    this.openDialog(4);
  }

  openDialog(type: number): void {
    if (type === 1) {
      this.displaySuccessModal = 'block';
    } else if (type === 2) {
      this.displayErrorModal = 'block';
    } else if (type === 3) {
      this.displayResetModal = 'block';
    } else if (type === 4) {
      this.displayChangedGroupModal = 'block';
    }
  }

  closeDialog(type: number): void {
    if (type === 1) {
      this.displaySuccessModal = 'none';
    } else if (type === 2) {
      this.displayErrorModal = 'none';
    } else if (type === 3) {
      this.displayResetModal = 'none';
    } else if (type === 4) {
      this.displayChangedGroupModal = 'none';
    }
  }

  copyAnonymousTextToClipboard(): void {
    const textArea: HTMLInputElement = this.anonymousTextArea.nativeElement;
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.setSelectionRange(0, 0);
    textArea.blur();
    this.openSnackBar('Copied to Clipboard!');
  }

  removeToken(token: string) {
    const index = this.filteredTtokens.indexOf(token);

    if (index >= 0) {
      this.filteredTtokens.splice(index, 1);
    }
  }

  resetTokens() {
    this.filteredTtokens = this.allTokens;
  }

  openSnackBar(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: ['green-snackbar']
    });
  }

  getChipColor() {
    this.randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    console.log('s', this.randomColor);
    return this.randomColor;
  }
}
