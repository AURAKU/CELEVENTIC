# Celeventic Laravel API

Production API backend for Celeventic EventOS.

## Requirements

- PHP 8.2+
- Composer 2.x
- PostgreSQL 16
- Redis 7

## Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Configure .env:
# DB_* → same PostgreSQL as Next.js (shared database)
# REDIS_* → Redis for cache & queues

php artisan migrate
php artisan db:seed
php artisan serve --port=8000
```

## Connect Next.js Frontend

In the root `.env`:

```
LARAVEL_API_URL=http://localhost:8000/api/v1
LARAVEL_API_TOKEN=your-sanctum-token
```

The Next.js `ApiClient` (`src/lib/api-client.ts`) proxies to Laravel when configured.

## Architecture

```
backend/
├── app/
│   ├── Http/Controllers/Api/V1/   # REST controllers
│   ├── Services/                   # Business logic (mirrors Next.js services)
│   ├── Jobs/                       # Redis queue jobs
│   └── Models/                     # Eloquent models
├── routes/api.php                  # API routes
├── config/                         # Database, queue, cache, services
└── database/migrations/            # Laravel migrations (sync with Prisma)
```

## API Modules

| Module | Endpoint Prefix |
|--------|----------------|
| Auth | `/api/v1/auth` |
| Events | `/api/v1/events` |
| Invitations | `/api/v1/invitations` |
| Tickets | `/api/v1/tickets` |
| QR | `/api/v1/qr` |
| Payments | `/api/v1/payments` |
| Communications | `/api/v1/campaigns` |
| Vendors | `/api/v1/vendors` |
| Venues | `/api/v1/venues` |
| Wallet | `/api/v1/wallet` |
| AI Planner | `/api/v1/ai` |
| Admin | `/api/v1/admin` |

## Queue Workers

```bash
php artisan queue:work redis --queue=default,campaigns,inspiration,payments
```

## Note

PHP/Composer must be installed on the host. This scaffold is ready to run once PHP is available.
The Next.js app works standalone via its own API routes until Laravel is connected.
