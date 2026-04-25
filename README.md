# Vite + Hono

Fullstack app template: Vite + React + Hono + shadcn/ui + Supabase Auth.

## Quick Start

```bash
# Install dependencies
npm install && cd client && npm install && cd ../server && npm install

# Setup env
cp client/.env.example client/.env
# Isi VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

# Dev (2 servers: Vite + Hono)
npm run dev

# Docker
npm run docker:build && npm run docker:up
```

## Struktur File

```
vite-hono/
├── .dockerignore                    # File yang diabaikan saat Docker build
├── .env.example                     # Template env variable untuk Docker production
├── .gitignore                       # File yang diabaikan oleh Git
├── Dockerfile                       # Multi-stage build: build React lalu serve via Hono
├── docker-compose.yml               # Konfigurasi Docker Compose dengan auto port range
├── package.json                     # Root scripts: dev, build, docker commands
├── README.md                        # Dokumentasi project ini
│
├── types/schema/                    # SQL schema untuk Supabase
│   ├── api_keys.sql                 # Table api_keys: key_hash, key_prefix, key_suffix, RLS
│   ├── credits.sql                  # Table credits: user balance, RLS (read only)
│   ├── payments.sql                 # Table payments: Tripay integration, RLS (no update/delete)
│   ├── transactions.sql             # Table transactions: credit/debit ledger, RLS (read only)
│   └── users.sql                    # Table users: profile data linked to auth.users
│
├── client/                          # Frontend — Vite + React + shadcn/ui
│   ├── .env                         # Supabase URL, anon key, API URL (tidak di-commit)
│   ├── .env.example                 # Template env variable untuk client
│   ├── components.json              # Konfigurasi shadcn/ui (base-nova style)
│   ├── index.html                   # Entry point HTML
│   ├── package.json                 # Dependencies: React, Vite, shadcn, Supabase, Swagger
│   ├── tsconfig.json                # TypeScript config dengan @ alias
│   ├── vite.config.ts               # Vite config: React, Tailwind, proxy ke Hono server
│   ├── public/
│   │   ├── logo.png                 # Logo aplikasi (circular crop di navbar)
│   │   └── favicon.png              # Favicon browser (circular crop dari logo)
│   └── src/
│       ├── index.css                # Tailwind CSS v4 + shadcn CSS variables + oklch colors
│       ├── main.tsx                 # Root component: routing, auth provider, navbar
│       │
│       ├── components/
│       │   ├── ui/                  # shadcn/ui components (auto-generated, jangan edit manual)
│       │   │   ├── alert-dialog.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── checkbox.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── dropdown-menu.tsx
│       │   │   ├── input.tsx
│       │   │   ├── label.tsx
│       │   │   ├── separator.tsx
│       │   │   ├── sheet.tsx        # Side panel untuk view/create/edit
│       │   │   ├── switch.tsx
│       │   │   ├── table.tsx
│       │   │   └── tabs.tsx
│       │   │
│       │   └── patterns/            # Styling atoms (import dan pakai, jangan generate ulang)
│       │       ├── stats-card.tsx   # Stat display: value + label + optional color
│       │       ├── search-bar.tsx   # Search input dengan icon
│       │       ├── pagination.tsx   # Page navigation (prev/next + page numbers)
│       │       ├── empty-state.tsx  # Empty state dengan icon + search variant
│       │       ├── status-badge.tsx # Configurable status badge
│       │       ├── config-field.tsx # Readonly field dengan copy button
│       │       └── file-upload.tsx  # Drag-drop file upload dengan preview
│       │
│       ├── lib/
│       │   ├── api.ts               # Helper fetch yang otomatis kirim JWT token
│       │   ├── auth.tsx             # AuthProvider + useAuth (email, Google OAuth)
│       │   ├── supabase.ts          # Inisialisasi Supabase client
│       │   └── utils.ts             # Utility cn() untuk merge Tailwind classes
│       │
│       ├── swagger/                 # OpenAPI 3.0 spec untuk Public API documentation
│       │   ├── common.ts            # Config: info, servers (from env), securitySchemes
│       │   ├── schemas.ts           # Response/request model definitions
│       │   ├── spec.ts              # Composer: merge semua parts jadi spec
│       │   └── paths/
│       │       └── public.ts        # Public API endpoints (API Key auth)
│       │
│       └── pages/
│           ├── HeroSection.tsx       # Landing page: hero section + footer
│           ├── Login.tsx             # Login: email/password + Google OAuth
│           ├── Register.tsx          # Register: email/password + Google OAuth
│           ├── Dashboard.tsx         # LIST PAGE reference: search, stats, table, pagination, sheet
│           ├── DashboardDetail.tsx   # DETAIL PAGE reference: back, tabs, child table, sheet→dialog
│           ├── ApiKeys.tsx           # API management: Keys tab + Docs tab (Swagger UI)
│           └── Billing.tsx           # Billing: credits, Tripay top-up, payment & transaction tabs
│
└── server/                          # Backend — Hono (production Docker)
    ├── .env                         # Env: Supabase + Tripay keys (tidak di-commit)
    ├── package.json                 # Dependencies: Hono, Supabase, @hono/node-server
    ├── tsconfig.json                # TypeScript config untuk server
    └── src/
        ├── index.ts                 # Hono server: routes, dual auth middleware, static files
        ├── api-keys.ts              # API key management: SHA-256 hash, create, verify, delete
        └── payments.ts              # Tripay integration: create transaction, check status, add credits
```

## API Endpoints

### User Auth Routes (JWT)

| Method | Path                     | Deskripsi                       |
| ------ | ------------------------ | ------------------------------- |
| GET    | `/api/me`                | Info user yang login            |
| GET    | `/api/todos`             | List semua todos                |
| POST   | `/api/todos`             | Tambah todo baru                |
| PUT    | `/api/todos/:id`         | Update todo                     |
| DELETE | `/api/todos/:id`         | Hapus todo                      |
| POST   | `/api/keys`              | Buat API key baru               |
| GET    | `/api/keys`              | List semua API keys             |
| DELETE | `/api/keys/:id`          | Hapus API key                   |
| POST   | `/api/payments/topup`    | Buat payment top-up (Tripay)    |
| GET    | `/api/payments`          | List payment history            |
| GET    | `/api/payments/:id/status` | Check & update payment status |
| GET    | `/api/credits`           | Get current credit balance      |
| GET    | `/api/transactions`      | List transaction history        |

### Public API Routes (API Key)

| Method | Path                    | Deskripsi                       |
| ------ | ----------------------- | ------------------------------- |
| GET    | `/api/public/todos`     | List todos milik API key owner  |
| GET    | `/api/public/stats`     | Statistik todo                  |

## Auth

| Type    | Header            | Use Case                        |
| ------- | ----------------- | ------------------------------- |
| JWT     | `Authorization: Bearer <token>` | Dashboard/user routes |
| API Key | `X-Api-Key: sk-xxxx`            | Public API (third-party) |
| Google  | OAuth popup via Supabase        | Login/register |

## Page Patterns

### LIST PAGE (`Dashboard.tsx`)
Reference implementation untuk halaman daftar. Pattern:
- Search bar + stats cards + data table + pagination
- Sheet untuk create/edit record
- Sheet untuk view record → navigate ke detail page

### DETAIL PAGE (`DashboardDetail.tsx`)
Reference implementation untuk halaman detail. Pattern:
- Back button + header with badge
- Tabs: data tab (child table) + configuration tab
- Sheet untuk view child detail
- Dialog untuk action di dalam sheet (e.g., file upload)

### Navigation Rules
```
2 levels:  LIST PAGE → Detail Page
           (Table row click → navigate)

3 levels:  LIST PAGE → Sheet → Detail Page
           (Table row click → Sheet → child click → navigate)
```

## Tech Stack

| Layer    | Teknologi                  |
| -------- | -------------------------- |
| Frontend | Vite, React, React Router  |
| UI       | shadcn/ui, Tailwind CSS v4 |
| Backend  | Hono                       |
| Auth     | Supabase Auth (Email + Google OAuth) |
| API Docs | OpenAPI 3.0 + Swagger UI   |
| Deploy   | Docker                     |
