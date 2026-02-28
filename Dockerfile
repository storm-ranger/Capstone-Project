FROM php:8.2-cli

# System deps
RUN apt-get update && apt-get install -y \
    git curl zip unzip \
    libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev \
    default-mysql-client \
    nodejs npm \
 && rm -rf /var/lib/apt/lists/*

# PHP extensions: mysql + gd + zip
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install pdo pdo_mysql gd zip

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

RUN composer install --no-dev --optimize-autoloader
RUN npm ci --legacy-peer-deps && npm run build

RUN chmod -R 775 storage bootstrap/cache

EXPOSE 10000
CMD php artisan config:clear && php artisan cache:clear && php artisan route:clear && php artisan view:clear && php artisan serve --host=0.0.0.0 --port=10000