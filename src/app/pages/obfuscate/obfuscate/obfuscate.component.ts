import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DocumentGroup } from 'src/app/models/document-group';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { TokenPair } from 'src/app/models/token-pair';

import * as CKEditor from 'src/assets/ckeditor/ckeditor';

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
  allTokens: TokenPair[] = [];
  filteredTokensValues: string[] = [];
  filteredTokens: TokenPair[] = [];
  displaySuccessModal = 'none';
  displayErrorModal = 'none';
  displayResetModal = 'none';
  displayChangedGroupModal = 'none';
  documentGroups: DocumentGroup[] = [];
  selectedGroup;
  randomColor;
  anonymousTextTokens = [];
  anonymousText = '';
  editMode = false;
  showSynonymList = false;
  synonymList = ['me', 'myself', 'Irene'];
  synonymsOfCurrentWord = ['me', 'myself', 'Irene'];


  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  public Editor = CKEditor;

  public config = {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        '|',
        'fontColor',
        'fontBackgroundColor',
        '|',
        'indent',
        'outdent',
        '|',
        'link',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'undo',
        'redo'
      ]
    },
    language: 'en',
    image: {
      toolbar: [
        'imageTextAlternative',
        'imageStyle:full',
        'imageStyle:side'
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells'
      ]
    },
    licenseKey: '',
  };


  ngOnInit(): void {
    this.stylometryForm = new FormGroup({
      anonymousTextArea: new FormControl('Write the text you want to anonymize here.', Validators.required),
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
      this.analyse();
    }
  }

  evaluate(): void {
    if (this.comparisonResult && this.selectedGroup !== this.stylometryForm.get('groupSelect').value) {
      this.showChangedGroupDialog();
    } else {
      this.findAuthor();
    }
  }

  analyse(): void {
    this.sendTextForAnalysis(this.stylometryForm.get('anonymousTextArea').value, this.stylometryForm.get('groupSelect').value);
  }

  findAuthor(): void {
    this.sendTextForAttribution(this.stylometryForm.get('anonymousTextArea').value, this.stylometryForm.get('groupSelect').value);
  }

  sendTextForAnalysis(text: string, group: number): void {
    this.apiService.analyse(text, group).subscribe(
      data => {
        this.consumeCorpusTokens(data.tokensSignificantToAttribution);
        this.consumeAnonymousTextTokens(data.anonymousTextTokens);

        this.anonymousText = this.underline(data.rawUserText);
        this.stylometryForm.get('anonymousTextArea').patchValue(this.anonymousText);
        this.comparisonResult = data.mostProbableAuthor;
        this.editMode = true;
        this.scrollToTop();
        // this.showResultAuthorDialog(data.mostProbableAuthor);
      },
      error => {
        this.showErrorDialog(error.error.detail);
      }
    );
  }

  scrollToTop() {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
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

  consumeCorpusTokens(tokens: TokenPair[]) {

    this.allTokens = tokens;
    this.filteredTokensValues = [];
    this.filteredTokens = [];

    this.allTokens.forEach(tokenPair => this.filteredTokens.push(Object.assign({}, tokenPair)));

    this.filteredTokens.forEach(tokenPair => {
      this.filteredTokensValues.push(tokenPair.token);
    });
  }

  consumeAnonymousTextTokens(tokens) {
    this.anonymousTextTokens = [];

    tokens.forEach(tokenPair => {
      const pair: TokenPair = new TokenPair();

      pair.token = tokenPair.token;
      pair.partOfSpeech = tokenPair.tag;

      this.anonymousTextTokens.push(pair);
    });
  }

  underline(text: string): string {
    const words = text.split(' ');
    const resultText: string[] = [];

    words.forEach(word => {
      let currentWord = word;
      if (this.filteredTokensValues.includes(word)) {
        currentWord = '<u>' + word + '</u>';
      }
      resultText.push(currentWord);
    });
    return resultText.join(' ');
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

  removeToken(token: TokenPair) {
    const index = this.filteredTokens.indexOf(token);

    if (index >= 0) {
      this.filteredTokens.splice(index, 1);
      this.filteredTokensValues.splice(index, 1);
    }
    this.underlineNewTokens();
  }

  resetTokens() {
    this.filteredTokens.length = 0;
    this.allTokens.forEach(tokenPair => this.filteredTokens.push(Object.assign({}, tokenPair)));

    this.filteredTokensValues.length = 0;
    this.filteredTokens.forEach(tokenPair => {
      this.filteredTokensValues.push(tokenPair.token);
    });
    this.underlineNewTokens();
  }

  underlineNewTokens() {
    const text:string = this.stylometryForm.get('anonymousTextArea').value.replace(/<u>/g, '').replace(/<\/u>/g, '');

    this.anonymousText = this.underline(text);
    this.stylometryForm.get('anonymousTextArea').patchValue(this.anonymousText);
  }

  openSnackBar(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: ['green-snackbar']
    });
  }

  getChipColor(token: TokenPair) {
    const partOfSpeech = token.partOfSpeech;

    if (partOfSpeech) {
      if (partOfSpeech.startsWith('V')) { // verb
        return 'mat-chip-blue';
      } else if (partOfSpeech.startsWith('J')) {  // adjective
        return 'mat-chip-red';
      } else if (partOfSpeech.startsWith('N')) {   // noun
        return 'mat-chip-pink';
      } else if (partOfSpeech.startsWith('RB')) {  // adverb
        return 'mat-chip-beige';
      } else if (partOfSpeech.startsWith('WP') || partOfSpeech.startsWith('PR')) {  // pronoun
        return 'mat-chip-cyan';
      }
    }
    return 'mat-chip-grey';
  }

}


  // underlineTokensInText(tokenPair: TokenPair) {
  //   let styleClass = '';

  //   if (this.allTokenValues.includes(tokenPair.token)) {

  //     if (tokenPair.partOfSpeech.startsWith('V')) { // verb
  //       styleClass = 'text-underline-blue';
  //     } else if (tokenPair.partOfSpeech.startsWith('J')) {  // adjective
  //       styleClass = 'text-underline-grey';
  //     } else if (tokenPair.partOfSpeech.startsWith('N')) {   // noun
  //       styleClass = 'text-underline-pink';
  //     } else if (tokenPair.partOfSpeech.startsWith('RB')) {  // adverb
  //       styleClass = 'text-underline-beige';
  //     } else if (tokenPair.partOfSpeech.startsWith('WP') || tokenPair.partOfSpeech.startsWith('PR')) {  // pronoun
  //       styleClass = 'text-underline-cyan';
  //     } else {   // others
  //       styleClass = 'text-underline-cyan';
  //     }

  //   }

  //   return styleClass;

  // }
