# ShadowCloak

| Folder | Stack |
| --- | --- |
| [`backend/`](backend) | Django REST API |
| [`frontend/`](frontend) | Angular app |

## Backend

Run these from `backend/`. Uploaded files are saved relative to the current directory, in `uploads/`.

```
pip install -r requirements.txt
python shadowcloak/manage.py migrate
python shadowcloak/manage.py runserver
```

The API runs at `http://127.0.0.1:8000/api/`.

## Frontend

Run these from `frontend/`.

```
npm install
npx ng serve
```

The app runs at `http://localhost:4200/`. See the [frontend README](frontend/README.md) for builds and tests.
