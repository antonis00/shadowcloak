# ShadowCloak

| Folder | Stack |
| --- | --- |
| [`backend/`](backend) | Django REST API |
| [`frontend/`](frontend) | Angular app |

## Backend

Run these from `backend/`. Uploaded files are saved relative to the current directory, in `uploads/`.

```
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(50))"
python shadowcloak/manage.py migrate
python shadowcloak/manage.py runserver
```

Paste the generated key into `DJANGO_SECRET_KEY` in `.env` before running `migrate`. The app won't start without it. Set `DJANGO_DEBUG=true` there for local development, because login cookies are HTTPS-only otherwise.

The API runs at `http://127.0.0.1:8000/api/`.

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

Run these from `frontend/`, using Node 14. This version of Angular doesn't work on current Node: `ng serve` crashes on Node 24, and `ng build` needs `NODE_OPTIONS=--openssl-legacy-provider`.

```
npm install
npx ng serve
```

The app runs at `http://localhost:4200/`. The dev server forwards `/api` to the backend, so run both together. See the [frontend README](frontend/README.md) for builds and tests.

## License

[MIT](LICENSE). The CKEditor build in `frontend/src/assets/ckeditor` is third-party code under its own terms.
