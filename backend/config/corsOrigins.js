/**
 * Single source of truth for the credentialed CORS allowlist.
 *
 * Design notes:
 * - Credentials are enabled, so a wildcard is never acceptable.
 * - Origins are compared after normalisation (lower-cased host, no trailing
 *   slash) so trailing slashes or mixed case in configuration cannot silently
 *   produce a 403 for a legitimate frontend.
 * - Vercel deployments allow preview hosts for this frontend project using a
 *   specific hostname prefix, never a blanket wildcard.
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
  if (
    process.env.VERCEL !== "1" &&
    process.env.CORS_ALLOW_VERCEL_PREVIEWS !== "true"
  ) {
    return null;
  }
  const safePrefix = String(
    process.env.VERCEL_PREVIEW_PREFIX ||
      "agrosales-management-system-p3xt",
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
 * Reconstructs the origin the browser used to reach this server from the Host
 * header plus the TLS-terminating proxy's X-Forwarded-Proto (Fly sets both).
 *
 * Why this is needed: a single-container deployment serves the SPA and the API
 * from one hostname, so a same-origin call such as `POST /api/auth/login`
 * still carries `Origin: https://<app>.fly.dev`. Treating that as cross-site
 * would 403 every write made from the app's own pages, and it would also force
 * operators to duplicate their own deployment hostname in FRONTEND_URL - a
 * silent-breakage trap, because a mismatch there produces a login page that
 * simply never authenticates.
 *
 * Safe by construction: the browser always sets Host to the host it is actually
 * contacting, so this can only match when Origin equals that same host. A
 * hostile page cannot satisfy it, because it addresses the victim host while
 * sending its own Origin, which differs.
 */
export const resolveSelfOrigin = (req) => {
  const host = String(req.get?.("host") || "").trim();
  if (!host) return "";
  const forwardedProto = String(req.get?.("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || (req.secure ? "https" : "http");
  if (protocol !== "http" && protocol !== "https") return "";
  return normalizeOrigin(`${protocol}://${host}`);
};

/**
 * A request with no Origin header (same-origin navigation, curl, server to
 * server) is not a cross-origin request and must not be blocked.
 *
 * `selfOrigin` (see resolveSelfOrigin) is the one implicit entry that is always
 * safe to honour; everything else must be explicitly allowlisted.
 */
export const isOriginAllowed = (origin, selfOrigin = "") => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized || normalized === "null") return false;
  if (selfOrigin && normalized === selfOrigin) return true;
  if (getAllowedOrigins().has(normalized)) return true;
  const pattern = getPreviewPattern();
  return Boolean(pattern && pattern.test(normalized));
};

export const defaultAllowedOrigins = DEFAULT_PRODUCTION_ORIGINS;
