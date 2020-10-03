import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

@Component({
  templateUrl: './obfuscate.component.html',
  styleUrls: ['./obfuscate.component.scss'],
  animations: [
    fadeInOnEnterAnimation(),
    fadeOutOnLeaveAnimation({ duration: 1000, delay: 100 })
  ]
})
export class ObfuscateComponent implements OnInit {

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

  findAuthor(): void {
    this.sendTextForAnalysis(this.stylometryForm.get('textAreaLeft').value, 1);
    this.showCopyAlert();
  }

  sendTextForAnalysis(text: string, group: number): void {
    this.apiService.sendText(text, group).subscribe(
      data => {
        this.populateAnonymousText(data.body);
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
