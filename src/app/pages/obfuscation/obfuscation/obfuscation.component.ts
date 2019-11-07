import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-obfuscation',
  templateUrl: './obfuscation.component.html',
  styleUrls: ['./obfuscation.component.scss']
})
export class ObfuscationComponent implements OnInit {

  anonymizedText = '';

  ngOnInit(): void {}

  copyTextToAnonymousTextArea(userText: string) {
    this.anonymizedText = userText;
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
