# Golden Agrochemicals Management & Sales System

A full-stack ERP-style agrochemical management platform with customer management, sales, lending, payments, receipts, staff verification, and analytics.

## Stack

- Frontend: React + Vite + Tailwind + Recharts
- Backend: Node.js + Express + PostgreSQL
- Auth: JWT + bcrypt + Google Identity Services

## Project structure

```bash
golden-agrochemicals/
├── frontend/
├── backend/
├── README.md
├── docker-compose.yml
├── .env.production.example
└── .gitignore
```

## Local development

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment

Create a backend environment file from the sample file and set your values:

```bash
cp backend/.env.example backend/.env
```

Required backend values for local development:

- `DATABASE_URL` or the legacy `DB_*` variables for a local Postgres instance
- `JWT_SECRET` with a value of at least 16 random characters
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the verified system administrator
- `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` for the verified super administrator
- `FRONTEND_URL` pointing to the frontend origin
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` when Google sign-in is enabled

### 3. Start PostgreSQL and the app

This repo includes a local PostgreSQL compose setup:

```bash
docker compose up -d database
cd backend
npm run dev
```

Then start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

The app is available at `http://localhost:5173` by default, and the backend API is served at `http://localhost:5000`.

### 4. Database schema

Apply the schema once for a blank PostgreSQL database:

```bash
psql "$DATABASE_URL" -f backend/database/schema.sql
```

If you are migrating from an older app version, run any relevant SQL migrations before using the app.

## Admin bootstrap

The backend creates the administrator account automatically on startup when both environment variables are set:

```bash
ADMIN_EMAIL=admin@goldenagro.com
ADMIN_PASSWORD=change-this-to-a-strong-password
SUPER_ADMIN_EMAIL=superadmin@goldenagro.com
SUPER_ADMIN_PASSWORD=change-this-to-a-strong-super-admin-password
```

This bootstrap is intentionally idempotent and safe for production. Each account is created only when its email and password are configured, and existing accounts are left unchanged.

## Google authentication

The frontend receives a Google ID token from the official GIS library and sends it to `POST /api/auth/google`. The backend verifies the token audience and signature with the official Google library, requires a verified email, and then returns the same JWT used by password login.

Google users are created as verified staff accounts. If a verified Google email matches an existing account, the Google ID is linked to that account instead of creating a duplicate.

## Vercel deployment

Deploy the frontend and backend as separate Vercel projects.

### Frontend project

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`
- Node.js Version: `24.x`

Set the production environment variables:

```text
VITE_API_URL=https://<backend-project>.vercel.app/api
VITE_GOOGLE_CLIENT_ID=<Google web client ID>
```

### Backend project

- Root Directory: `backend`
- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: `npm ci`
- Node.js Version: `24.x`

Add these production environment variables in Vercel:

```text
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require
JWT_SECRET=<32+ random characters>
JWT_ACCESS_SECRET=<32+ random characters>
JWT_REFRESH_SECRET=<different 32+ random characters>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_EMAIL=admin@goldenagro.com
ADMIN_PASSWORD=<strong admin password>
SUPER_ADMIN_EMAIL=superadmin@goldenagro.com
SUPER_ADMIN_PASSWORD=<strong super-admin password>
FRONTEND_URL=https://<frontend-project>.vercel.app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOW_MEMORY_DB=false
SEED_DEFAULT_USERS=false
DB_SSL=true
DB_CONNECTION_LIMIT=5
DB_IDLE_TIMEOUT_MS=30000
UPSTASH_REDIS_REST_URL=<Upstash REST URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash REST token>
LOGIN_RATE_LIMIT=5
LOGIN_RATE_WINDOW=5m
IP_RATE_LIMIT=20
IP_RATE_WINDOW=5m
IDEMPOTENCY_TTL_SECONDS=86400
```

For Neon, copy the connection string from the Neon dashboard and paste it into `DATABASE_URL`. Keep the app on server-side env vars only; never expose `JWT_SECRET`, `ADMIN_PASSWORD`, or `GOOGLE_CLIENT_SECRET` to the browser.

Apply `backend/database/schema.sql` to a blank Neon database before the first deployment. The backend then creates the configured verified admin and super-admin accounts on startup or on the first Vercel API request. Verify the app can:

1. boot successfully with the Neon database
2. create the admin account if env values are configured
3. log in as the admin user
4. use existing sales, customers, product, payment, and analytics flows without errors

## Production notes

- Do not enable `ALLOW_MEMORY_DB=true` outside local development.
- Do not set `SEED_DEFAULT_USERS=true` in production.
- Keep `FRONTEND_URL` restricted to the exact frontend origin used by the app.
- Use HTTPS everywhere in production.
- Use your provider's pooled PostgreSQL connection URL where available. The backend pool defaults to 5 connections per serverless instance; do not raise it without accounting for Vercel concurrency and the database connection cap.
- Redis is required in production for refresh sessions, distributed login limits, and sale/payment idempotency. Store its REST URL and token only in Vercel's backend environment settings.

## License

This project is for internal business use and is not published as a general package.
