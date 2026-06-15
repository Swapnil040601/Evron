#!/bin/sh
set -e

echo "Waiting for Postgres at $DB_HOST:$DB_PORT ..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  sleep 2
done

echo "Postgres is ready. Enabling vector extension if needed..."

# Supply password via environment variable
export PGPASSWORD="$DB_PASSWORD"

# Create vector extension if it doesn't exist
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Running migrations..."
npm run migration

echo "Starting Fastify server..."
node server.js