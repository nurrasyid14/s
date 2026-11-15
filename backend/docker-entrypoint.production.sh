#!/bin/bash
# ==============================================================================
# SuaraLens Backend - Production Entrypoint Script
# ==============================================================================
# PERINGATAN KEAMANAN:
# - Entrypoint ini TIDAK menjalankan migration otomatis.
# - Entrypoint ini TIDAK menjalankan db:seed / UserSeeder.
# - Entrypoint ini TIDAK mengubah atau menghapus file upload.
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

# 2. Terapkan prinsip least privilege untuk kepemilikan dan permission writable
# Hanya www-data yang memiliki hak baca/tulis tanpa memberikan izin global 777.
chown -R www-data:www-data /var/www/html/writable
find /var/www/html/writable -type d -exec chmod 775 {} +
find /var/www/html/writable -type f -exec chmod 664 {} +

# 3. Identifikasi kredensial koneksi PostgreSQL
DB_HOST="${DB_HOST:-${PGHOST:-db}}"
DB_PORT="${DB_PORT:-${PGPORT:-5432}}"
DB_USER="${DB_USER:-${PGUSER:-postgres}}"
DB_NAME="${DB_NAME:-${PGDATABASE:-suaralens}}"
export PGPASSWORD="${DB_PASS:-${PGPASSWORD:-}}"

# 4. Tunggu kesiapan server PostgreSQL sebelum menerima request
echo "[SuaraLens Production Backend] Menunggu koneksi database PostgreSQL ($DB_HOST:$DB_PORT/$DB_NAME)..."
MAX_RETRIES=30
RETRY_COUNT=0
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "[SuaraLens Production Backend] ERROR: Batas waktu menunggu PostgreSQL terlampaui!"
    exit 1
  fi
  sleep 1
done
echo "[SuaraLens Production Backend] PostgreSQL terhubung dan siap!"

# 5. Konfirmasi kebijakan production
echo "[SuaraLens Production Backend] Mode: PRODUCTION (CI_ENVIRONMENT=${CI_ENVIRONMENT:-production})"
echo "[SuaraLens Production Backend] Kebijakan: Migrasi otomatis & Seeder dinonaktifkan demi integritas data."
echo "[SuaraLens Production Backend] Memulai layanan PHP-FPM..."

exec "$@"

