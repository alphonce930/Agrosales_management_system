# Golden Agrochemicals Management & Sales System

A full-stack ERP-style agrochemical management platform with customer management, sales, lending, payments, receipts, staff verification, and analytics.

## Stack

- Frontend: React + Vite + Tailwind + Recharts
- Backend: Node.js + Express + MySQL
- Auth: JWT + bcrypt + Google Identity Services

## Project structure

```bash
golden-agrochemicals/
├── frontend/
├── backend/
├── README.md
└── .gitignore
```

## Setup

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment

Create `backend/.env` from `backend/.env.example` and `frontend/.env` from `frontend/.env.example`.

Set a long random value for `JWT_SECRET`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`; only `VITE_GOOGLE_CLIENT_ID` belongs in the frontend environment. Never put the Google client secret in `frontend/.env`.

### 3. Configure the database

Run the original schema for a new database. For an existing database, run `backend/database/google_auth_migration.sql` once to add `google_id`, `profile_picture`, and `auth_provider` to the existing `users` table.

The application now returns a clear database-unavailable response instead of silently saving data to temporary memory. Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`, then apply `backend/database/schema.sql`. `ALLOW_MEMORY_DB=true` is available only for a local non-persistent UI demo.

For an existing populated database, run `backend/database/performance_migration.sql` once to add the query indexes without recreating tables.

### 4. Configure Google Cloud

1. Create or select a project in Google Cloud Console.
2. Configure the OAuth consent screen and add the users/test accounts required for development.
3. Create OAuth credentials for a **Web application**.
4. Add `http://localhost:5173` under **Authorized JavaScript origins**.
5. Add the production HTTPS origin when deploying, for example `https://app.example.com`.
6. Put the web client ID in both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`). Keep the client secret in the backend only.

This implementation uses the Google Identity Services popup/credential flow, so it does not require an application redirect URI. If Google Cloud asks for redirect URIs for another OAuth flow, configure those only for that separate flow.

### 5. Start backend

```bash
cd backend
npm run dev
```

### 6. Start frontend

```bash
cd frontend
npm run dev
```

## Default admin

- Email: admin@goldenagro.com
- Password: Admin@123

## Google authentication behavior

The frontend receives a Google ID token from the official GIS library and sends it to `POST /api/auth/google`. The backend verifies the token audience and signature with Google's official library, requires a verified email, and then returns the same application JWT used by password login.

Google users are created as verified staff accounts. If a verified Google email matches an existing account, the Google ID is linked to that account rather than creating a duplicate. Suspended accounts remain blocked. Logout clears the application's JWT for both password and Google users.

To test locally, start MySQL, apply the schema or migration, configure both Google client ID variables, start the backend, and open `http://localhost:5173/login`. Test a new Google account, a repeated login, a matching existing email account, invalid credentials, cancellation, normal password login, and dashboard logout. Use HTTPS and secure deployment secrets in production; restrict CORS with `FRONTEND_URL` and do not log credentials or ID tokens.

## Notes

This is a scaffolded implementation designed to be extended into a complete production-ready system matching the requirements in the provided spec.
