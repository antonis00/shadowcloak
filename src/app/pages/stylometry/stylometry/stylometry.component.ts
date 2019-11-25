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
  @ViewChild('textAreaLeft', { static: false }) textAreaLeft: ElementRef;
  @ViewChild('textAreaRight', { static: false }) textAreaRight: ElementRef;
  stylometryForm: FormGroup;
  isCopyAlertVisible = false;
  anonymizedText = '';
  texts;

  ngOnInit(): void {
    this.stylometryForm = new FormGroup({
      // tslint:disable-next-line:object-literal-key-quotes
      'textAreaLeft': new FormControl(null, Validators.required),
      // tslint:disable-next-line:object-literal-key-quotes
      'textAreaRight': new FormControl({ value: '', disabled: true })
    });
  }

  constructor(private apiService: ApiService) { }

  getTexts = (): void => {
    this.apiService.getAllTexts().subscribe(
      data => {
        this.texts = data;
      },
      error => {
        console.log(error);
      }
    );
  }

  getText = (id: number): void => {
    this.apiService.getText(id).subscribe(
      data => {
        this.texts = data.content;
      },
      error => {
        console.log(error);
      }
    );
  }

  anonymize(): void {
    this.anonymizedText = this.stylometryForm.get('textAreaLeft').value;
    this.stylometryForm.get('textAreaRight').patchValue(this.anonymizedText);
    this.sendTextForAnonymization(this.anonymizedText);
    this.showCopyAlert();
    this.copyAnonymousTextToClipboard();
  }

  sendTextForAnonymization(userText: string): void {
    // this.apiService.sendText(userText).subscribe(
    //   data => {
    //   },
    //   error => {
    //     console.log(error);
    //   }
    // );
  }

  copyAnonymousTextToClipboard(): void {
    const rightTextArea: HTMLInputElement = this.textAreaRight.nativeElement;
    rightTextArea.focus();
    rightTextArea.select();
    document.execCommand('copy');
    rightTextArea.setSelectionRange(0, 0);
  }

  showCopyAlert(): void {
    this.isCopyAlertVisible = true;
    setTimeout(() => {
      this.isCopyAlertVisible = false;
    }, 1800);
  }

  compareStylometricStyle(): string {
    const stylometricAnalysisResult = ' = ';
    alert(this.stylometryForm.get('textAreaLeft').value
    + '' + stylometricAnalysisResult + ''
    + this.stylometryForm.get('textAreaRight').value);
    return stylometricAnalysisResult;
  }

  onLeftTextAreaChange(htmlElement: HTMLInputElement): void {
    if (htmlElement.value.trim() === '') {
      this.stylometryForm.get('textAreaRight').disable();
    } else {
      this.stylometryForm.get('textAreaRight').enable();
    }
  }
}
