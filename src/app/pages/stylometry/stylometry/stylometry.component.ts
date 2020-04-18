import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';



@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss'],
  animations: [
    fadeInOnEnterAnimation(),
    fadeOutOnLeaveAnimation({ duration: 1000, delay: 100 })
  ]
})

export class StylometryComponent implements OnInit {
  @ViewChild('textAreaLeft', { static: false}) textAreaLeft: ElementRef;
  @ViewChild('textAreaRight', { static: false}) textAreaRight: ElementRef;

  stylometryForm: FormGroup;
  isCopyAlertVisible = false;
  comparisonResult = '';
  display = 'none';

  ngOnInit(): void {
    this.stylometryForm = new FormGroup({
      // tslint:disable-next-line:object-literal-key-quotes
      'textAreaLeft': new FormControl(null, Validators.required),
      // tslint:disable-next-line:object-literal-key-quotes
      'textAreaRight': new FormControl({ value: '', disabled: true })
    });
  }

  constructor(private apiService: ApiService) { }

  anonymize(): void {
    this.sendTextForAnonymization(this.stylometryForm.get('textAreaLeft').value);
    this.showCopyAlert();
  }

  sendTextForAnonymization(userText: string): void {
    this.apiService.sendText(userText).subscribe(
      data => {
        this.populateAnonymousText(data.anonymizedText);
      },
      error => {
        console.log(error);
      }
    );
  }

  populateAnonymousText(text: string): void {
    this.stylometryForm.get('textAreaRight').patchValue(text);
    this.copyAnonymousTextToClipboard();
  }

  copyAnonymousTextToClipboard(): void {
    const rightTextArea: HTMLInputElement = this.textAreaRight.nativeElement;
    rightTextArea.focus();
    rightTextArea.select();
    document.execCommand('copy');
    rightTextArea.setSelectionRange(0, 0);
    rightTextArea.blur();
  }

  showCopyAlert(): void {
    this.isCopyAlertVisible = true;
    setTimeout(() => {
      this.isCopyAlertVisible = false;
    }, 1800);
  }

  compareStylometricStyle(): void {
    this.comparisonResult = 'Similarity = 100%';
    this.openDialog();
  }

  openDialog(): void {
    this.display = 'block';
  }

  closeDialog(): void {
    this.display = 'none';
  }

  enableRightTextArea(htmlElement: HTMLInputElement): void {
    htmlElement.value.trim() === ''
      ? this.stylometryForm.get('textAreaRight').disable() : this.stylometryForm.get('textAreaRight').enable();
  }
}
