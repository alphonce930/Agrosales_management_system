# Environment Variables Configuration

## Required for Production (Vercel)

### Database
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Random secret for JWT signing (min 16 characters)

### Redis/Upstash (Required for Rate Limiting & Sessions)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST API token

### Frontend Configuration
- `FRONTEND_URL` - Comma-separated list of allowed frontend origins (optional, defaults are configured in app.js)
  - Example: `https://agrosales-management-system-p3xt.vercel.app,https://agrosales-management-system.vercel.app`

### Google OAuth (Optional)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID for Google sign-in

### Rate Limiting Configuration (Optional)
- `IP_RATE_LIMIT` - Max requests per IP for login (default: 100)
- `IP_RATE_WINDOW` - Time window for IP rate limit (default: "5m")
- `LOGIN_RATE_LIMIT` - Max failed login attempts per account (default: 5)
- `LOGIN_RATE_WINDOW` - Time window for account rate limit (default: "5m")
- `MAX_LOGIN_ATTEMPTS_PER_DEVICE` - Max failed attempts per device (default: 5)
- `LOGIN_ATTEMPT_WINDOW_SECONDS` - Window for device attempts in seconds (default: 900)
- `DEVICE_LOCKOUT_SECONDS` - Device lockout duration in seconds (default: 900)
- `PREAUTH_LOGIN_RATE_LIMIT` - Pre-auth rate limit (default: 20)
- `PREAUTH_LOGIN_WINDOW` - Pre-auth window (default: "15m")

### Cookie Configuration (Optional)
- `REFRESH_COOKIE_SAME_SITE` - SameSite cookie policy (default: "lax" in dev, "none" in prod)
- `DEVICE_COOKIE_NAME` - Custom device cookie name (default: "__Host-agro_device" in prod, "agro_device" in dev)

### Other Configuration
- `NODE_ENV` - Environment (development/production)
- `VERCEL` - Set to "true" when deploying to Vercel
- `TRUST_PROXY` - Set to "true" to trust proxy headers (auto-set on Vercel)
- `ALLOW_MEMORY_DB` - Set to "true" to allow starting without database (for testing only)

## Local Development

Create a `.env` file in the `backend` directory with the above variables.

For local development without Redis, the rate limiter will be disabled and authentication will work with reduced security features.
