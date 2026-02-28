#!/usr/bin/env bash
set -e

php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
php artisan view:clear || true

php artisan migrate --force

php artisan serve --host=0.0.0.0 --port=${PORT:-8000}