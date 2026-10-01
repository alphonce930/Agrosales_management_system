import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

import { securityHeaders, validateRequestBody } from "./middleware/security.js";
import { apiNotFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { logAuthEvent } from "./utils/authLogger.js";
import { isOriginAllowed, resolveSelfOrigin } from "./config/corsOrigins.js";
import { AppError } from "./utils/httpErrors.js";
import { pingDatabase } from "./config/db.js";
import { getRedis, isRedisConfigured } from "./config/redis.js";
import { getQueryMetrics } from "./utils/queryMetrics.js";

dotenv.config();

const app = express();
// Vercel and Fly.io supply the client address through one trusted proxy hop.
// Never read x-forwarded-for directly in routes.
app.set(
  "trust proxy",
  process.env.VERCEL || process.env.FLY_APP_NAME
    ? 1
    : process.env.TRUST_PROXY === "true",
);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const frontendDist = path.join(projectRoot, "frontend", "dist");

app.disable("x-powered-by");

// CORS is registered before every route so that both preflight OPTIONS
// requests and error responses carry the correct headers.
//
// Credentialed CORS cannot use a wildcard. The allowlist lives in
// config/corsOrigins.js so that local development, production, and Vercel
// preview origins are handled by one auditable rule set.
//
// cors() is handed a delegate rather than a plain options object because the
// origin callback only receives the origin string; the delegate receives the
// request, which is what lets same-origin deployments (one container serving
// both the SPA and the API) be recognised via resolveSelfOrigin(req).
app.use(
  cors((req, optionsCallback) => {
    const selfOrigin = resolveSelfOrigin(req);
    optionsCallback(null, {
      origin(origin, callback) {
        if (isOriginAllowed(origin, selfOrigin)) return callback(null, true);
        return callback(
          new AppError(
            `Origin ${origin} is not allowed by CORS.`,
            403,
            "CORS_ORIGIN_DENIED",
          ),
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      // Idempotency-Key is sent by the sale and payment forms. Omitting it here
      // makes the browser fail the preflight, which surfaced as a spurious 403.
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
        "X-Request-Id",
      ],
      exposedHeaders: ["X-Request-Id", "Retry-After"],
      maxAge: 86400, // 24 hours preflight cache
      optionsSuccessStatus: 204,
    });
  }),
);

app.use(securityHeaders);

// Global API rate limiter - only applies to /api/* endpoints.
const apiRateLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_SECONDS || 3600) * 1000,
  max:
    Number(process.env.API_RATE_LIMIT_MAX) ||
    (process.env.VERCEL ? 3000 : 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many API requests. Please try again later." },
  skip: (req) => !req.path.startsWith("/api/") || req.method === "OPTIONS",
});

app.use(apiRateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(validateRequestBody);
app.use(logAuthEvent);
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

/**
 * Readiness probe used by uptime monitoring and deployment checks. It never
 * mutates pool state, so it cannot mask a genuine database outage.
 */
app.get("/api/health", async (req, res) => {
  const databaseReady = await pingDatabase();
  const redisConfigured = isRedisConfigured();
  const payload = {
    status: databaseReady ? "ok" : "degraded",
    database: databaseReady ? "up" : "down",
    redis: redisConfigured ? (getRedis() ? "configured" : "unavailable") : "disabled",
    uptimeSeconds: Math.round(process.uptime()),
  };
  if (process.env.HEALTH_EXPOSE_METRICS === "true") {
    payload.queries = getQueryMetrics();
  }
  return res.status(databaseReady ? 200 : 503).json(payload);
});

app.get("/", (req, res) => {
  res.json({ message: "Golden Agrochemicals API is running." });
});

// Auth endpoints run their own strict, per-identity rate limiting inside
// authRoutes.js. Mounting it is required before any of the other routers.
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/analytics", analyticsRoutes);

// Any unmatched /api/* path must return a JSON 404 rather than falling through
// to the SPA fallback or the Express default HTML error page.
app.use("/api", apiNotFoundHandler);

// Optional single-service deployment: the backend can serve the built SPA.
app.use(
  express.static(frontendDist, { index: false, maxAge: "1h", etag: true }),
);
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  return res.sendFile(path.join(frontendDist, "index.html"), (error) => {
    if (error) next();
  });
});

app.use(errorHandler);

export default app;
