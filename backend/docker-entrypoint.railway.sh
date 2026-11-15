#!/bin/bash
# ==============================================================================
# SuaraLens Backend - Railway Unified Production Entrypoint
# ==============================================================================
set -e

# 1. Pastikan folder writable CI4 dan output data analytics tersedia
mkdir -p /var/www/html/writable/cache \
         /var/www/html/writable/logs \
         /var/www/html/writable/session \
         /var/www/html/writable/uploads/complaints \
         /var/www/html/writable/locks
mkdir -p /var/www/data/output/extracted_analytics \
         /var/www/data/output/weekly_analytics

# 2. Terapkan least-privilege permission untuk www-data
chown -R www-data:www-data /var/www/html/writable
find /var/www/html/writable -type d -exec chmod 775 {} +
find /var/www/html/writable -type f -exec chmod 664 {} +

# 3. Konfigurasi Port Dinamis Railway untuk Nginx
PORT="${PORT:-8080}"
echo "[SuaraLens Railway] Mengonfigurasi Nginx untuk mendengarkan port: $PORT"
mkdir -p /etc/nginx/http.d
sed "s/\${PORT}/$PORT/g" /etc/nginx/templates/railway.conf.template > /etc/nginx/http.d/default.conf

# 4. Kredensial Database (Mendukung variabel Railway bawaan dan variabel kustom)
DB_HOST="${DB_HOST:-${PGHOST:-}}"
DB_PORT="${DB_PORT:-${PGPORT:-5432}}"
DB_USER="${DB_USER:-${PGUSER:-postgres}}"
DB_NAME="${DB_NAME:-${PGDATABASE:-railway}}"
export PGPASSWORD="${DB_PASS:-${PGPASSWORD:-}}"

if [ -n "$DB_HOST" ]; then
    echo "[SuaraLens Railway] Menunggu koneksi database PostgreSQL ($DB_HOST:$DB_PORT/$DB_NAME)..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            echo "[SuaraLens Railway] WARNING: Batas waktu menunggu PostgreSQL terlampaui. Melanjutkan startup..."
            break
        fi
        sleep 1
    done
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "[SuaraLens Railway] PostgreSQL terhubung dan siap!"
    fi
fi

# 5. Jalankan PHP-FPM di background (daemon mode)
echo "[SuaraLens Railway] Menjalankan PHP-FPM 8.2 daemon..."
php-fpm -D

# 6. Jalankan Nginx di foreground
echo "[SuaraLens Railway] Menjalankan Nginx di foreground pada port $PORT..."
exec nginx -g "daemon off;"

