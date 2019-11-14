import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-obfuscation',
  templateUrl: './obfuscation.component.html',
  styleUrls: ['./obfuscation.component.scss']
})

export class ObfuscationComponent implements OnInit {

  anonymizedText = '';
  texts;
  ngOnInit(): void {}

  constructor(private apiService: ApiService) {
    this.getText(3);
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
        this.anonymizedText = data.content;
      },
      error => {
        console.log(error);
      }
    );
  }

  copyTextToAnonymousTextArea(userText: string) {
    this.anonymizedText = userText;
  }

  sendTextForAnonmyzation(userText: string) {
    this.apiService.sendText(userText).subscribe(
      data => {
        this.texts.push(data);
      },
      error => {
        console.log(error);
      }
    );
  }

  copyAnonymousTextToClipboard() {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = this.anonymizedText;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }
}
