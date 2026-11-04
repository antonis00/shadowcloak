import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  const message = (error: unknown) => apiErrorMessage(new HttpErrorResponse({ error, status: 400 }));
  const fallback = 'Something went wrong. Please try again.';

  it('uses detail', () => {
    expect(message({ detail: 'Too many requests.' })).toBe('Too many requests.');
  });

  it('joins field errors', () => {
    expect(message({ password1: ['Too short.', 'Too common.'], name: ['Taken.'] })).toBe('Too short. Too common. Taken.');
  });

  it('never shows a server error page', () => {
    expect(message('<html>Server Error</html>')).toBe(fallback);
  });

  it('copes with no usable body', () => {
    for (const body of [null, undefined, {}, { detail: 5 }, { field: [{ nested: true }] }]) {
      expect(message(body)).toBe(fallback);
    }
  });
});
