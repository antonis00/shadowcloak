import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-stylometry',
  templateUrl: './stylometry.component.html',
  styleUrls: ['./stylometry.component.scss']
})

export class StylometryComponent implements OnInit {

  anonymizedText = '';
  texts;
  ngOnInit(): void {}

  constructor(private apiService: ApiService) {
  }

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
  }

  sendTextForAnonymization(userText: string) {
    this.apiService.sendText(userText).subscribe(
      data => {
      },
      error => {
        console.log(error);
      }
    );
  }

  copyAnonymousTextToClipboard(anonymizedTextArea) {
    anonymizedTextArea.select();
    document.execCommand('copy');
    anonymizedTextArea.setSelectionRange(0, 0);
  }
}
