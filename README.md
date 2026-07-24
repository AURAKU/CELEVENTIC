# Celeventic

The hub for event organization — managing, tracking, connectivity, and marketplace for all.

**The Intelligent Event Operating System**

Built by Aura Group Innovations (AGI)

Celeventic = Celebrate + Event + Ticket

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS 4, Framer Motion, Three.js, ShadCN UI |
| **API (Primary)** | Next.js API Routes with service-layer architecture |
| **API (Production)** | Laravel 11 API (`backend/`) — connects via `LARAVEL_API_URL` |
| **Database** | PostgreSQL 16 + Prisma ORM (50+ models) |
| **Cache** | Redis 7 (ioredis with in-memory fallback) |
| **Queue** | Background jobs table (drained by `npm run jobs:worker`) + Laravel Redis queues |
| **Auth** | NextAuth.js + 2FA (TOTP) + Google OAuth |
| **Payments** | Paystack, Flutterwave, Hubtel adapters |
| **Storage** | AWS S3 + CloudFront (local disk fallback in dev) |
| **Video pipeline** | Direct-to-S3 multipart upload + AWS Elemental MediaConvert (HEVC/H.265-aware) — see [`docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md`](docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md) |
| **Realtime** | Pusher-ready |
| **Monitoring** | Sentry + PostHog ready |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Push database schema (50+ models)
npm run db:push

# Seed default data
npm run db:seed

# Start Next.js frontend
npm run dev
```

### Laravel API (Optional)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve --port=8000
```

Set `LARAVEL_API_URL=http://localhost:8000/api/v1` in root `.env`.

Open [http://localhost:3000](http://localhost:3000)

### Default Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@celeventic.com | Admin@123 |
| Organizer | organizer@celeventic.com | Organizer@123 |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin Command Center
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard & modules
│   ├── invite/            # Public invitation pages
│   └── verify/            # Public QR verification
├── components/            # Reusable UI components
├── lib/                   # Utilities, auth, prisma, constants
├── services/              # Business logic service layer
│   ├── ai/               # AI Event Planner (mock, pluggable)
│   ├── payments/         # Payment provider adapters
│   ├── communications/   # WhatsApp/SMS/Email hub
│   ├── qr/               # QR generation & verification
│   ├── events/           # Event management
│   ├── invitations/      # Invitation studio
│   ├── tickets/          # Ticketing engine
│   └── admin/            # Admin operations
└── types/                 # TypeScript type definitions
prisma/
├── schema.prisma          # Full database schema (40+ models)
└── seed.ts                # Database seeder
```

## EventOS Modules

| # | Module | Status |
|---|--------|--------|
| 1 | Authentication & Roles (6 roles, 2FA, session mgmt) | ✅ |
| 2 | Event Creation Engine (wizard, 12 event types) | ✅ |
| 3 | AI Event Planner (budget, timeline, seating, comms) | ✅ |
| 4 | Invitation Studio (digital, personalized, QR) | ✅ |
| 5 | Inspiration Upload Engine (AI analysis + upgrades) | ✅ |
| 6 | Flyer Studio (flyers, posters, banners, social) | ✅ |
| 7 | Ticketing Engine (free/paid/VIP/VVIP/group/table) | ✅ |
| 8 | QR Admission (online + offline architecture) | ✅ |
| 9 | Communications Hub (WhatsApp/SMS/Email + tiers) | ✅ |
| 10 | Guest CRM (full lifecycle tracking) | ✅ |
| 11 | Vendor Marketplace (booking, reviews, ratings) | ✅ |
| 12 | Venue Marketplace (availability, booking) | ✅ |
| 13 | Event Wallet (revenue, expenses, transactions) | ✅ |
| 14 | Contribution Engine (wedding/funeral/church/fundraiser) | ✅ |
| 15 | Advertising Marketplace (models + admin) | ✅ Foundation |
| 16 | Event Discovery (location-based, Ghana-first) | ✅ |
| 17 | Event Memory Vault (photos, videos, guestbooks) | ✅ |
| 18 | Admin Command Center (full management) | ✅ |
| 19 | API Configuration Center | ✅ |
| 20 | Security (RBAC, audit, fraud, rate limiting, encryption) | ✅ |
| 21 | Infrastructure (Redis, queues, Docker, Laravel API) | ✅ |

## Phase 2 (Planned)

- Bulk WhatsApp/SMS/email sending
- Vendor marketplace
- Venue marketplace
- Advertising marketplace
- Offline QR admission sync

## Phase 3 (Planned)

- Real AI integration
- Inspiration Upload AI
- FuneralOS, WeddingOS, CorporateOS
- Memory Vault

## Environment Variables

See `.env.example` for all required variables. Never commit `.env` files.

## License

Proprietary — Aura Group Innovations
