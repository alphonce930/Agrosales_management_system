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

### 5. Start the complete app on one port

Build the React app and serve both the frontend and API through Express on the backend `PORT` (currently `5002` in `backend/.env`):

```bash
cd backend
npm run start:app
```

Open `http://localhost:5002`. This is the recommended production-style setup; browser calls stay same-origin.

### 6. Development mode

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Development-only default admin

Set `SEED_DEFAULT_USERS=true` only for a local demonstration database to create the sample administrator accounts. It is disabled by default and must never be enabled in production.

## Google authentication behavior

The frontend receives a Google ID token from the official GIS library and sends it to `POST /api/auth/google`. The backend verifies the token audience and signature with Google's official library, requires a verified email, and then returns the same application JWT used by password login.

Google users are created as verified staff accounts. If a verified Google email matches an existing account, the Google ID is linked to that account rather than creating a duplicate. Suspended accounts remain blocked. Logout clears the application's JWT for both password and Google users.

To test locally, start MySQL, apply the schema or migration, then open `http://localhost:5173/login` in development or `http://localhost:5002/login` with the single-port command. Test a new Google account, a repeated login, a matching existing email account, invalid credentials, cancellation, normal password login, and dashboard logout. Use HTTPS and secure deployment secrets in production; restrict CORS with `FRONTEND_URL` and do not log credentials or ID tokens.

## Docker development

The project uses React/Vite, Express, and MySQL. PostgreSQL, Redis, GraphQL, and Angular are not required by the existing application and are not added to the stack.

### Requirements

- Docker Desktop with Docker Compose v2
- Git
- VS Code (recommended)
- An API client such as Thunder Client or curl
- A database client such as MySQL Workbench or DBeaver (optional)

Node.js and npm are installed inside the development containers, so they are not required on the host for the Docker workflow.

### Environment setup

```bash
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env`. Replace the development passwords and `JWT_SECRET` when sharing or deploying the project. `.env` is ignored by Git. Google sign-in is optional; set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` when it is needed.

### Start and stop

```bash
docker compose up --build
docker compose down
```

The frontend is available at `http://localhost:5173` and the backend API health response is at `http://localhost:5000/`. Vite proxies browser `/api` requests to the `backend` Compose service. MySQL is available to host database tools at `localhost:3306`; containers connect to it as `database`.

The first database startup runs `backend/database/schema.sql`. Data is stored in the named `mysql_data` volume and survives `docker compose down` followed by `docker compose up`. Use `docker compose down --volumes` only when intentionally deleting development data.

### Useful commands

```bash
docker compose build
docker compose logs -f --tail=100
docker compose logs -f backend
docker compose restart
docker compose exec backend sh
docker compose ps
docker compose down --volumes --remove-orphans
```

Equivalent shortcuts are available through the `Makefile`: `make up`, `make down`, `make build`, `make logs`, `make restart`, `make shell`, `make clean`, and `make config`.

### Ports and environment variables

| Service  | Container port | Host port | Purpose                    |
| -------- | -------------: | --------: | -------------------------- |
| frontend |           5173 |      5173 | Vite development server    |
| backend  |           5000 |      5000 | Express API                |
| database |           3306 |      3306 | Local MySQL administration |

The root `.env` file requires `MYSQL_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `FRONTEND_URL`. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are optional. Host ports can be changed with `MYSQL_HOST_PORT`, `BACKEND_HOST_PORT`, and `FRONTEND_HOST_PORT`.

### Troubleshooting

- Run `docker compose config` to find missing or malformed environment values.
- Run `docker compose ps` and `docker compose logs database backend` to inspect health and startup failures.
- If MySQL credentials change after the first startup, remove the old volume with `docker compose down --volumes` and start again.
- If port `5173`, `5000`, or `3306` is already in use, change the corresponding host port in `.env`.
- The default development seed creates `admin` / `Admin@123` and `superadmin` / `SuperAdmin@123`; keep `SEED_DEFAULT_USERS=false` outside local development.

### Production image

`Dockerfile` builds the frontend and serves its static files from the Express backend on port `5000`. Supply production secrets through the deployment platform using `.env.production.example` as the variable reference. Do not expose the database publicly in production and do not enable default-user seeding.

## Vercel deployment

Deploy the two applications as separate Vercel projects. This preserves the existing Vite frontend and Express backend boundaries:

### Frontend project

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`
- Node.js Version: `24.x`

Add these frontend environment variables for Production, Preview, and Development as needed:

```text
VITE_API_URL=https://<backend-project>.vercel.app/api
VITE_GOOGLE_CLIENT_ID=<Google web client ID>
```

The `frontend/vercel.json` rewrite keeps BrowserRouter routes such as `/login` and `/staff` working after a page refresh.

### Backend project

- Root Directory: `backend`
- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: `npm ci`
- Node.js Version: `24.x`

The backend project detects `api/index.js` as a Vercel Node.js function. Add the production `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `FRONTEND_URL`, and `GOOGLE_CLIENT_ID` values in Vercel. Set `FRONTEND_URL` to the exact frontend deployment URL or custom domain. Keep `ALLOW_MEMORY_DB=false` and `SEED_DEFAULT_USERS=false` in production.

The database must be an externally reachable MySQL instance. `localhost` and the Docker service name `database` only work in local development. Apply `backend/database/schema.sql` and any required migrations to the production database before using the API. Vercel does not run the local `server.js` bootstrap or `app.listen`; `server.js` remains the local/Docker entry point.

After both projects deploy, set `VITE_API_URL` to the backend URL, redeploy the frontend, and use the current Production URL or configured domain. A Vercel `410 GONE` message saying that a deployment was removed is a deployment-lifecycle/old-URL issue, not a React route error; do not reuse that removed deployment URL.

## Notes

This is a scaffolded implementation designed to be extended into a complete production-ready system matching the requirements in the provided spec.
#   A g r o s a l e s * m a n a g e m e n t * s y s t e m 
 
 
