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

dotenv.config();

const app = express();
// Vercel supplies the client address through one trusted proxy hop. Never
// read x-forwarded-for directly in routes.
app.set(
  "trust proxy",
  process.env.VERCEL ? 1 : process.env.TRUST_PROXY === "true",
);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const frontendDist = path.join(projectRoot, "frontend", "dist");
// Credentialed CORS cannot use a wildcard. Keep the production frontend
// trusted by default and configure preview origins explicitly in FRONTEND_URL.
const allowedOrigins = [
  "https://agrosales-management-system.vercel.app",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL || "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(securityHeaders);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(validateRequestBody);
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "Golden Agrochemicals API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(
  express.static(frontendDist, { index: false, maxAge: "1h", etag: true }),
);
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  return res.sendFile(path.join(frontendDist, "index.html"), (error) => {
    if (error) next();
  });
});

app.use((err, req, res, next) => {
  const status =
    err.status ||
    (err.code === "DB_UNAVAILABLE" ? 503 : undefined) ||
    (err.message === "Origin is not allowed by CORS." ? 403 : 500);
  if (status >= 500) console.error(err);
  res
    .status(status)
    .json({ message: status >= 500 ? "Internal server error." : err.message });
});

export default app;
