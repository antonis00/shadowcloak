# ShadowCloak frontend

An Angular 22 app. It needs Node 22.22.3, 24.15 or newer.

| Command | What it does |
| --- | --- |
| `npm install` | Installs the packages |
| `npx ng serve` | Runs the app at `http://localhost:4200/`, forwarding `/api` to the backend on port 8000 |
| `npx ng test --watch=false` | Runs the unit tests |
| `npx ng build` | Writes a production build to `dist/` |

## Layout

| Folder | Holds |
| --- | --- |
| `src/app/core` | The API, the session and the types the API returns |
| `src/app/shared` | Messages, confirmations and the category picker |
| `src/app/pages` | One folder per page |
| `src/assets/ckeditor` | The vendored CKEditor build, which is third-party code under its own terms |
| `public/assets` | Images and the Exo font |

Fonts and icons are served from the app itself, so pages make no requests to other sites.
