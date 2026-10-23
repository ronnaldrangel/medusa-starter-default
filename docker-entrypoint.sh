#!/bin/sh
set -e

MAX_ATTEMPTS="${MIGRATE_ATTEMPTS:-8}"
attempt=1

while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "[entrypoint] db:migrate attempt $attempt/$MAX_ATTEMPTS"
  if npx medusa db:migrate; then
    echo "[entrypoint] migrations ok"
    break
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -gt "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] migrations FAILED after $MAX_ATTEMPTS attempts"
    exit 1
  fi
  echo "[entrypoint] retrying in 10s..."
  sleep 10
done

echo "[entrypoint] starting medusa"
exec npm run start
