FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
ENV DJANGO_DEBUG=0 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/backend/.venv/bin:$PATH"
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN DJANGO_DEBUG=1 python src/manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "caderno.wsgi:application", "--chdir", "src", "--bind", "0.0.0.0:8000"]
