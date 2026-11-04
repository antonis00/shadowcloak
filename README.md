# ShadowCloak

| Folder | Stack |
| --- | --- |
| [`backend/`](backend) | Django REST API |
| [`frontend/`](frontend) | Angular app |

## Backend

Run these from `backend/`, using Python 3.12 or newer. Uploaded files are saved relative to the current directory, in `uploads/`.

```
python -m venv .venv
.venv/Scripts/activate        # On Linux or macOS: source .venv/bin/activate
pip install -r requirements.txt
python -m nltk.downloader punkt_tab averaged_perceptron_tagger_eng
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Paste the generated key into `DJANGO_SECRET_KEY` in `.env`, and set `DJANGO_DEBUG=true` for local development. With debug off, every request is redirected to HTTPS and login cookies are HTTPS-only. Then:

```
python shadowcloak/manage.py migrate
python shadowcloak/manage.py runserver
python shadowcloak/manage.py test     # Run from backend/shadowcloak instead
```

The API runs at `http://127.0.0.1:8000/api/`. The app won't start without the secret key or the NLTK data, and says which is missing.

### Limits

| What | Limit |
| --- | --- |
| Document | 2,000,000 characters |
| Text to analyse | 200,000 characters |
| All documents in a category, when analysing it | 10,000,000 characters |
| Request | 8 MB |
| Login | 10 a minute from one address, 20 an hour for one account |
| Registration | 10 an hour from one address |
| Find Author and Analyse | 60 a minute per user |
| Saving or deleting documents | 60 a minute per user |

Rate limits are counted in each server process's memory, so they reset on restart, and running several worker processes multiplies them.

### Production

Set `DJANGO_ALLOWED_HOSTS`, and set `DJANGO_BEHIND_PROXY=true` only when a proxy you control sits in front of the app. `python shadowcloak/manage.py check --deploy` should report no issues.

### Accounts

Accounts have a username and password. There is no email, so a forgotten password has to be reset by an admin:

```
python shadowcloak/manage.py changepassword <username>
```

The API uses Django's session cookie with CSRF protection. Send the `csrftoken` cookie's value back in an `X-CSRFToken` header on every write. `GET /api/auth/me/` sets that cookie.

### Importing datasets

Run these from `backend/`. Create the group and authors first, because rows from unknown authors are skipped.

```
python shadowcloak/manage.py import_blogs path/to/blogs.csv --group 1
python shadowcloak/manage.py import_tweets path/to/tweets.csv --group 2
python shadowcloak/manage.py import_enron path/to/maildir --group 3
```

Use `--limit` to change how many rows are read, or how many sent messages per sender for Enron. If an import fails, nothing from that run is saved.

## Frontend

Run these from `frontend/`, using Node 22.22.3, 24.15 or newer.

```
npm install
npx ng serve
```

The app runs at `http://localhost:4200/`. The dev server forwards `/api` to the backend, so run both together. See the [frontend README](frontend/README.md) for builds and tests.

## Docker

One container serves the app and the API from a single address, and keeps its database in a volume.

```
docker build -t shadowcloak .
docker run -p 8000:8000 -v shadowcloak-data:/data \
  -e DJANGO_SECRET_KEY=<a long random key> \
  -e DJANGO_REQUIRE_HTTPS=false \
  shadowcloak
```

That runs it at `http://localhost:8000/` to try it out. To deploy it, put it behind a proxy that handles HTTPS, and replace `DJANGO_REQUIRE_HTTPS=false` with `DJANGO_ALLOWED_HOSTS=<your hostname>` and `DJANGO_BEHIND_PROXY=true`.

## Tests

| What | How to run it |
| --- | --- |
| Backend | `python manage.py test`, from `backend/shadowcloak` |
| Frontend | `npx ng test --watch=false`, from `frontend` |
| The whole app in Chrome | `npm test`, from [`e2e`](e2e) |

GitHub Actions runs all of these on every push and pull request. It also audits the Python and npm packages, and repeats that every Monday, because new advisories appear even when the code doesn't change.

## License

[MIT](LICENSE). The CKEditor build in `frontend/src/assets/ckeditor` is third-party code under its own terms.
