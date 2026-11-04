import { HttpErrorResponse } from '@angular/common/http';

const FALLBACK = 'Something went wrong. Please try again.';

/** The API answers with {detail: message} or {field: [messages]}. Anything else isn't for users. */
export function apiErrorMessage(response: HttpErrorResponse): string {
  const body: unknown = response.error;
  if (!body || typeof body !== 'object') {
    return FALLBACK;
  }
  const { detail } = body as { detail?: unknown };
  if (typeof detail === 'string') {
    return detail;
  }
  const messages = Object.values(body).flat().filter(message => typeof message === 'string');
  return messages.length > 0 ? messages.join(' ') : FALLBACK;
}
