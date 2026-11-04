import { HttpErrorResponse } from '@angular/common/http';

const FALLBACK = 'Something went wrong. Please try again.';

/** The API answers with {detail: message} or {field: [messages]}. Anything else isn't for users. */
export function apiErrorMessage(response: HttpErrorResponse): string {
  const body = response.error;
  if (!body || typeof body !== 'object') {
    return FALLBACK;
  }
  if (typeof body.detail === 'string') {
    return body.detail;
  }
  const messages = Object.values(body)
    .reduce<unknown[]>((all, value) => all.concat(value), [])
    .filter(message => typeof message === 'string');
  return messages.length > 0 ? messages.join(' ') : FALLBACK;
}
