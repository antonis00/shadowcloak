# One container serves the app and the API from a single address.

FROM node:26-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npx ng build

FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLTK_DATA=/usr/local/share/nltk_data \
    DJANGO_FRONTEND_DIR=/app/frontend \
    DJANGO_DATABASE=/data/db.sqlite3
WORKDIR /app/backend

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
RUN python -m nltk.downloader -q -d "$NLTK_DATA" punkt_tab averaged_perceptron_tagger_eng

COPY backend/shadowcloak/ ./
COPY --from=frontend /frontend/dist/shadow-cloak-fe/browser /app/frontend
RUN DJANGO_SECRET_KEY=only-for-this-build-step python manage.py collectstatic --noinput -v0

RUN useradd --system --create-home app && mkdir /data && chown app /data
USER app
VOLUME /data
EXPOSE 8000

# One process with threads, because rate limits are counted in each process's memory.
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn shadowcloak.wsgi --bind 0.0.0.0:8000 --workers 1 --threads 8 --timeout 60"]
