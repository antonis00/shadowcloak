import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DocumentGroup } from 'src/app/models/document-group';

@Component({
  templateUrl: './find-author.component.html',
  styleUrls: ['./find-author.component.scss'],
  animations: [
    fadeInOnEnterAnimation(),
    fadeOutOnLeaveAnimation({ duration: 1000, delay: 100 })
  ]
})
export class FindAuthorComponent implements OnInit {

  @ViewChild('anonymousTextArea', { static: false }) anonymousTextArea: ElementRef;
  @ViewChild('textAreaRight', { static: false }) textAreaRight: ElementRef;

  stylometryForm: FormGroup;
  isCopyAlertVisible = false;
  comparisonResult = '';
  comparisonError = '';
  displaySuccessModal = 'none';
  displayErrorModal = 'none';
  documentGroups: DocumentGroup[] = [];
  selectedGroup;


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

  constructor(private apiService: ApiService) { }

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

  openDialog(type: number): void {
    if (type === 1) {
      this.displaySuccessModal = 'block';
    } else {
      this.displayErrorModal = 'block';
    }
  }

  closeDialog(type: number): void {
    if (type === 1) {
      this.displaySuccessModal = 'none';
    } else {
      this.displayErrorModal = 'none';
    }
  }

  selectGroup(grouId: number) {
    this.selectedGroup = grouId;
  }
}
