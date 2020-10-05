import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

@Component({
  templateUrl: './find-author.component.html',
  styleUrls: ['./find-author.component.scss'],
  animations: [
    fadeInOnEnterAnimation(),
    fadeOutOnLeaveAnimation({ duration: 1000, delay: 100 })
  ]
})
export class FindAuthorComponent implements OnInit {

  @ViewChild('textAreaLeft', { static: false}) textAreaLeft: ElementRef;
  @ViewChild('textAreaRight', { static: false}) textAreaRight: ElementRef;

  stylometryForm: FormGroup;
  isCopyAlertVisible = false;
  comparisonResult = '';
  display = 'none';

  ngOnInit(): void {
    this.stylometryForm = new FormGroup({
      // tslint:disable-next-line:object-literal-key-quotes
      'textAreaLeft': new FormControl(null, Validators.required)
    });
  }

  constructor(private apiService: ApiService) { }

  findAuthor(): void {
    this.sendTextForAttribution(this.stylometryForm.get('textAreaLeft').value, 3);
  }

  sendTextForAttribution(text: string, group: number): void {
    this.apiService.sendText(text, group).subscribe(
      data => {
        this.showResultAuthorDialog(data);
      },
      error => {
        console.log('find author: ' + error);
      }
    );
  }

  showResultAuthorDialog(author: string): void {

    this.comparisonResult = author;
    this.openDialog();
  }

  openDialog(): void {
    this.display = 'block';
  }

  closeDialog(): void {
    this.display = 'none';
  }
}
