import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { tap } from 'rxjs';

import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { Analysis, SignificantToken } from '../../core/api.types';
import { CategorySelect } from '../../shared/category-select';
import { Feedback } from '../../shared/feedback';
import { editorHtmlToPlainText, highlightColor, HIGHLIGHT_COLORS, highlightWords, removeHighlights } from './editor-text';
import { RichTextEditor } from './rich-text-editor';

const STARTING_TEXT = 'Put the text you want to anonymize here.';

@Component({
  imports: [CategorySelect, MatButtonModule, MatIconModule, ReactiveFormsModule, RichTextEditor, TitleCasePipe],
  providers: [TitleCasePipe],
  templateUrl: './obfuscate.html',
  styleUrl: './obfuscate.scss',
})
export class Obfuscate {
  private readonly api = inject(ApiService);
  private readonly feedback = inject(Feedback);
  private readonly titleCase = inject(TitleCasePipe);

  readonly group = new FormControl<number | null>(null, Validators.required);
  readonly text = new FormControl(STARTING_TEXT, { nonNullable: true, validators: Validators.required });
  readonly groups = toSignal(this.api.groups().pipe(
    tap(groups => this.group.setValue(groups[0]?.id ?? null)),
  ));

  readonly legend = [
    { label: 'Verbs', color: HIGHLIGHT_COLORS.verb },
    { label: 'Adjectives', color: HIGHLIGHT_COLORS.adjective },
    { label: 'Nouns', color: HIGHLIGHT_COLORS.noun },
    { label: 'Adverbs', color: HIGHLIGHT_COLORS.adverb },
    { label: 'Pronouns', color: HIGHLIGHT_COLORS.pronoun },
    { label: 'Others', color: HIGHLIGHT_COLORS.other },
  ];
  readonly chipColor = highlightColor;

  /** What the analysis found, kept so the author can be compared and the word list restored. */
  readonly analysis = signal<Analysis | null>(null);
  readonly tokens = signal<SignificantToken[]>([]);
  readonly allTokensShown = computed(
    () => this.tokens().length === this.analysis()?.tokensSignificantToAttribution.length,
  );

  private readonly chosenGroup = toSignal(this.group.valueChanges, { initialValue: null });
  private readonly currentHtml = toSignal(this.text.valueChanges, { initialValue: STARTING_TEXT });
  readonly canSubmit = computed(
    () => this.chosenGroup() !== null && editorHtmlToPlainText(this.currentHtml()) !== '',
  );

  analyse(): void {
    this.api.analyse(this.plainText(), this.group.value!).subscribe({
      next: analysis => {
        this.analysis.set(analysis);
        this.showTokens(analysis.tokensSignificantToAttribution);
        window.scroll({ top: 0, behavior: 'smooth' });
      },
      error: response => this.showError(response),
    });
  }

  detectAuthor(): void {
    this.api.findAuthor(this.plainText(), this.group.value!).subscribe({
      next: author => {
        const initial = this.titleCase.transform(this.analysis()?.mostProbableAuthor ?? '');
        if (author === this.analysis()?.mostProbableAuthor) {
          this.feedback.message('Anonymization Unsuccessful', `The initial author "${initial}" hasn't changed.`);
        } else {
          const current = this.titleCase.transform(author);
          this.feedback.message('Anonymization Successful!',
            `The initial author "${initial}" is different from the current author "${current}"!`);
        }
      },
      error: response => this.showError(response),
    });
  }

  removeToken(token: SignificantToken): void {
    this.showTokens(this.tokens().filter(other => other !== token));
  }

  resetTokens(): void {
    this.showTokens(this.analysis()?.tokensSignificantToAttribution ?? []);
  }

  resetProcess(): void {
    this.feedback.confirm('Reset Process', 'Proceed', 'All changes will be lost! Are you sure you want to proceed?')
      .subscribe(confirmed => {
        if (confirmed) {
          this.analysis.set(null);
          this.tokens.set([]);
          this.text.setValue(STARTING_TEXT);
        }
      });
  }

  private showTokens(tokens: SignificantToken[]): void {
    this.tokens.set(tokens);
    const tags = new Map(tokens.map(token => [token.token, token.partOfSpeech]));
    this.text.setValue(highlightWords(removeHighlights(this.text.value), word => {
      const tag = tags.get(word);
      return tag ? highlightColor(tag) : null;
    }));
  }

  /** The analysis only ever receives this, because tags would be counted as words. */
  private plainText(): string {
    return editorHtmlToPlainText(this.text.value);
  }

  private showError(response: Parameters<typeof apiErrorMessage>[0]): void {
    this.feedback.message('Request Unsuccessful', apiErrorMessage(response));
  }
}
