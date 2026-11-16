# ==============================================================================
# SuaraLens Production Nginx Dockerfile
# ==============================================================================
FROM nginx:alpine

# 1. Salin konfigurasi Nginx production
COPY deployment/nginx/default.conf /etc/nginx/conf.d/default.conf

# 2. Salin aset statis dari direktori public CodeIgniter ke document root Nginx
# Ini memastikan Nginx dapat melayani aset statis tanpa memerlukan bind mount host
COPY backend/public/ /var/www/html/public/

# 3. Tetapkan hak akses least-privilege untuk user nginx
RUN chown -R nginx:nginx /var/www/html/public \
    && chmod -R 755 /var/www/html/public

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

