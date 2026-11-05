FROM php:8.2-cli-alpine

# Install build dependencies and PostgreSQL client utilities
RUN apk add --no-cache \
    postgresql-dev \
    postgresql-client \
    icu-dev \
    libzip-dev \
    curl \
    bash \
    netcat-openbsd

# Install PHP extensions required by CodeIgniter 4 and PostgreSQL
RUN docker-php-ext-install \
    intl \
    pdo \
    pdo_pgsql \
    pgsql \
    zip

WORKDIR /var/www/html

# Copy backend source
COPY backend/ /var/www/html/

# Copy entrypoint script and ensure executable permissions
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

EXPOSE 8090

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php", "spark", "serve", "--host", "0.0.0.0", "--port", "8090"]

