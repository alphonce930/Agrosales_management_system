# Vercel and Neon Deployment Information

## Current deployment code

- GitHub repository: `alphonce930/Agrosales_management_system`
- Branch: `agents/vercel-deployment-react-node-neon`
- Published commit: `172ff45 Prepare Vercel deployment with Neon PostgreSQL`
- Deployment status: code pushed successfully; branch is up to date with GitHub

## Neon database setup

1. Create a PostgreSQL project in Neon.
2. Copy the pooled connection string.
3. Open the Neon SQL editor.
4. Run [`backend/database/schema.neon.sql`](backend/database/schema.neon.sql).

Use the pooled Neon connection string as the backend `DATABASE_URL`.

## Vercel projects

Deploy the application as two Vercel projects from the same GitHub repository.

### Backend project

- Root Directory: `backend`
- Framework preset: Other
- The API is available under `/api/*`.

Required environment variables:

```text
DATABASE_URL=<pooled Neon PostgreSQL connection string>
JWT_SECRET=<long random production secret>
FRONTEND_URL=https://<frontend-project>.vercel.app
GOOGLE_CLIENT_ID=<Google web client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
```

### Frontend project

- Root Directory: `frontend`
- Framework preset: Vite

Required environment variables:

```text
VITE_API_URL=https://<backend-project>.vercel.app/api
VITE_GOOGLE_CLIENT_ID=<Google web client ID>
```

Set variables for Production. Add them to Preview too if preview deployments are required.

## Google authentication

In Google Cloud Console, add the deployed frontend URL to Authorized JavaScript origins:

```text
https://<frontend-project>.vercel.app
```

The Google client ID may be used in both backend and frontend configuration. Never expose
`GOOGLE_CLIENT_SECRET` through a `VITE_*` variable.

## Validation completed

- Frontend `npm run build`: passed.
- Backend `npm test`: passed; the repository currently contains no automated tests.
- Backend JavaScript syntax checks: passed.
- Git working tree: clean at the time this file was created.

## Local development

The backend continues to support MySQL when `DATABASE_URL` is not a PostgreSQL URL.
Use the existing local `.env.example` files for MySQL-based development.

