/**
 * Single source of truth for the credentialed CORS allowlist.
 *
 * Design notes:
 * - Credentials are enabled, so a wildcard is never acceptable.
 * - Origins are compared after normalisation (lower-cased host, no trailing
 *   slash) so trailing slashes or mixed case in configuration cannot silently
 *   produce a 403 for a legitimate frontend.
 * - Vercel preview deployments get an explicit *hostname pattern* opt-in
 *   rather than a blanket wildcard: only hosts of the form
 *   `<prefix>-<hash>.vercel.app` for the configured project prefix match.
 */
const DEFAULT_PRODUCTION_ORIGINS = [
  "https://agrosales-management-system.vercel.app",
  "https://agrosales-management-system-p3xt.vercel.app",
];

const DEFAULT_DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const normalizeOrigin = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
};

const splitList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

const isDevelopment = () => process.env.NODE_ENV !== "production";

const buildPreviewPattern = () => {
  if (process.env.CORS_ALLOW_VERCEL_PREVIEWS !== "true") return null;
  const safePrefix = String(
    process.env.VERCEL_PREVIEW_PREFIX || "agrosales-management-system",
  )
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
  if (!safePrefix) return null;
  return new RegExp(`^https://${safePrefix}-[a-z0-9-]+\\.vercel\\.app$`);
};

let cachedOrigins = null;
let cachedPreviewPattern = undefined;

export const getAllowedOrigins = () => {
  if (cachedOrigins) return cachedOrigins;
  cachedOrigins = new Set([
    ...DEFAULT_PRODUCTION_ORIGINS.map(normalizeOrigin),
    ...(isDevelopment()
      ? DEFAULT_DEVELOPMENT_ORIGINS.map(normalizeOrigin)
      : []),
    ...splitList(process.env.FRONTEND_URL),
  ]);
  return cachedOrigins;
};

const getPreviewPattern = () => {
  if (cachedPreviewPattern === undefined) {
    cachedPreviewPattern = buildPreviewPattern();
  }
  return cachedPreviewPattern;
};

/** Test seam: lets tests inject configuration without reloading the module. */
export const resetAllowedOriginsCache = () => {
  cachedOrigins = null;
  cachedPreviewPattern = undefined;
};

/**
 * A request with no Origin header (same-origin navigation, curl, server to
 * server) is not a cross-origin request and must not be blocked.
 */
export const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized || normalized === "null") return false;
  if (getAllowedOrigins().has(normalized)) return true;
  const pattern = getPreviewPattern();
  return Boolean(pattern && pattern.test(normalized));
};

export const defaultAllowedOrigins = DEFAULT_PRODUCTION_ORIGINS;
