import { TitleCasePipe } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { Attribution } from '../core/api.types';

const SHOWN = 3;

/** The closest authors in a sentence, with each one's distance from the text. */
@Pipe({ name: 'ranking' })
export class RankingPipe implements PipeTransform {
  private readonly titleCase = inject(TitleCasePipe);

  transform(attribution: Attribution): string {
    const closest = attribution.ranking
      .slice(0, SHOWN)
      .map(({ author, delta }) => `${this.titleCase.transform(author)} (${delta.toFixed(2)})`);
    return `Closest authors, lower is closer: ${closest.join(', ')}.`;
  }
}
