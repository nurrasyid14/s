#!/bin/bash
set -e

# Pastikan folder writable CI4 dan data analytics tersedia
mkdir -p writable/cache writable/logs writable/session writable/uploads writable/debugbar writable/locks
mkdir -p /var/www/data/output/extracted_analytics /var/www/data/output/weekly_analytics
chmod -R 777 writable

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

echo "[SuaraLens Backend] Menunggu koneksi PostgreSQL ($DB_HOST:$DB_PORT)..."
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  sleep 1
done
echo "[SuaraLens Backend] PostgreSQL terhubung dan siap!"

# Jalankan migrasi tabel
echo "[SuaraLens Backend] Menjalankan migrasi database..."
php spark migrate --all || echo "[SuaraLens Backend] Migrasi selesai atau sudah up-to-date."

# Jalankan UserSeeder (Admin, Stakeholder, Mahasiswa)
echo "[SuaraLens Backend] Menjalankan UserSeeder..."
php spark db:seed UserSeeder || echo "[SuaraLens Backend] UserSeeder telah dijalankan sebelumnya."

echo "[SuaraLens Backend] Memulai layanan CodeIgniter 4..."
exec "$@"

