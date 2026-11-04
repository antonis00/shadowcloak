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

Paste the generated key into `DJANGO_SECRET_KEY` in `.env` before running `migrate`. The app won't start without it. Set `DJANGO_DEBUG=true` there for local development.

The API runs at `http://127.0.0.1:8000/api/`.

## Frontend

Run these from `frontend/`.

```
npm install
npx ng serve
```

The app runs at `http://localhost:4200/`. See the [frontend README](frontend/README.md) for builds and tests.
