# Browser tests

These drive the real pages in Chrome, against the real backend and the real CKEditor.

Set up the backend and frontend first, as the main [README](../README.md) describes. Then, from this folder:

```
npm install
npm test
```

The run starts both servers itself, with a throwaway database, and stops them afterwards. It won't start if port 8000 or 4200 is already in use, so stop the app first.

If `backend/.venv` isn't your Python environment, point `PYTHON` at the right interpreter. If Chrome is somewhere unusual, set `CHROME_PATH`.

| File | Covers |
| --- | --- |
| `login.js` | Registering, logging in, sessions and CSRF |
| `documents.js` | Form errors, new users, the Documents page, filters and limits |
| `obfuscate.js` | Attribution on real books, formatting, highlighting and warnings |
| `image.js` | The Docker image: one address for everything, and the editor bundled in. Run it with `node image.js` against a running container |

`books.json` holds excerpts of public-domain books from Project Gutenberg, taken from NLTK's Gutenberg corpus. The Obfuscate tests use them to check that analysing a text and changing nothing leaves the suggested author the same.
