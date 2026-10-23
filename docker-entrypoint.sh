#!/bin/sh
set -e

# Permite sobreescribir el arranque (Dokploy pasa command/args como argumentos).
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

LOG=/tmp/app.log
: > "$LOG"
log() { echo "$@" | tee -a "$LOG"; }

DB_HOST=$(printf '%s' "${DATABASE_URL:-}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
log "[entrypoint] db_host=${DB_HOST:-none}"

if [ -n "$DB_HOST" ]; then
  if getent hosts "$DB_HOST" >>"$LOG" 2>&1; then
    log "[entrypoint] dns=ok"
  else
    log "[entrypoint] dns=FAIL"
  fi
  if nc -z -w 5 "$DB_HOST" 5432 >>"$LOG" 2>&1; then
    log "[entrypoint] tcp=ok"
  else
    log "[entrypoint] tcp=FAIL"
  fi
fi

MAX_ATTEMPTS="${MIGRATE_ATTEMPTS:-8}"
attempt=1
ok=0
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  log "[entrypoint] db:migrate attempt $attempt/$MAX_ATTEMPTS"
  if npx medusa db:migrate >>"$LOG" 2>&1; then
    log "[entrypoint] migrations ok"
    ok=1
    break
  fi
  attempt=$((attempt + 1))
  sleep 10
done

if [ "$ok" -ne 1 ]; then
  log "[entrypoint] migrations FAILED"
  # Se mantiene vivo para poder leer /tmp/app.log. Quitar en produccion.
  exec sleep 3600
fi

log "[entrypoint] starting medusa"
exec npm run start
