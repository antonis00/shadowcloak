import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';


@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss'],
  animations: [
    fadeInOnEnterAnimation(),
    fadeOutOnLeaveAnimation({ duration: 500, delay: 100 })
  ]
})

export class StylometryComponent implements OnInit {

  anonymizedText = '';
  texts;
  isCopyAlertVisible = false;
  @ViewChild('anonymizedTextArea', { static: false }) textArea: ElementRef;

  ngOnInit(): void { }

  constructor(private apiService: ApiService) { }

  getTexts = () => {
    this.apiService.getAllTexts().subscribe(
      data => {
        this.texts = data;
      },
      error => {
        console.log(error);
      }
    );
  }

  getText = (id: number) => {
    this.apiService.getText(id).subscribe(
      data => {
        this.texts = data.content;
      },
      error => {
        console.log(error);
      }
    );
  }

  copyTextToAnonymousTextArea(userText: string) {
    this.anonymizedText = userText;
    this.textArea.nativeElement.value = userText;
    this.copyAnonymousTextToClipboard();
    this.sendTextForAnonymization(this.textArea.nativeElement.value);
    this.showCopyAlert();

  }

  sendTextForAnonymization(userText: string) {
    // this.apiService.sendText(userText).subscribe(
    //   data => {
    //   },
    //   error => {
    //     console.log(error);
    //   }
    // );
  }

  copyAnonymousTextToClipboard() {
    this.textArea.nativeElement.select();
    document.execCommand('copy');
    this.textArea.nativeElement.setSelectionRange(0, 0);
    this.textArea.nativeElement.selectionStart = 0;
  }

  showCopyAlert() {
    this.isCopyAlertVisible = true;
    setTimeout(() => {
      this.isCopyAlertVisible = false;
    }, 1500);
  }
}
