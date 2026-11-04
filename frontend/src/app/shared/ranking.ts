import { Pipe, PipeTransform } from '@angular/core';

import { Attribution } from '../core/api.types';

const SHOWN = 3;

/** The closest authors in a sentence, with each one's distance from the text. */
@Pipe({ name: 'ranking' })
export class RankingPipe implements PipeTransform {
  transform(attribution: Attribution): string {
    const closest = attribution.ranking
      .slice(0, SHOWN)
      .map(({ author, delta }) => `${author} (${delta.toFixed(2)})`);
    return `Closest authors, lower is closer: ${closest.join(', ')}.`;
  }
}
