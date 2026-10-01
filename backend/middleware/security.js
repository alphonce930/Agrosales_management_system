import { isOriginAllowed, resolveSelfOrigin } from "../config/corsOrigins.js";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const removeUnsafeKeys = (value) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach(removeUnsafeKeys);
  for (const key of Object.keys(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      delete value[key];
    else removeUnsafeKeys(value[key]);
  }
};

/**
 * The browser sends Origin on every cross-origin request and on same-origin
 * state-changing requests. The Origin (with Referer as a fallback) is the only
 * CSRF signal that works for this app, because the refresh credential lives in
 * an HttpOnly cookie on the *backend* origin and therefore cannot be mirrored
 * into a JS-readable double-submit cookie on a different frontend origin.
 */
const requestOrigin = (req) => {
  const origin = req.get("origin");
  if (origin) return origin;
  const referer = req.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

/**
 * CSRF protection for cookie-authenticated state-changing endpoints.
 *
 * This runs *only* when the request is authenticated by cookie rather than by
 * a Bearer token:
 * - Requests carrying an Authorization header are immune to classic CSRF,
 *   because a third-party site cannot read or set that header value.
 * - Cookie-authenticated requests must come from a trusted frontend origin.
 */
export const csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers.authorization) return next();
  if (!stateChangingMethods.has(req.method)) return next();

  const origin = requestOrigin(req);
  // selfOrigin keeps single-origin deployments (one container serving both the
  // SPA and the API) working, where the browser sends the app's own origin on
  // every state-changing request.
  if (origin && isOriginAllowed(origin, resolveSelfOrigin(req))) return next();

  return res.status(403).json({
    message: "Request blocked: the request origin is not allowed.",
    code: "CSRF_ORIGIN_REJECTED",
  });
};

export const securityHeaders = (req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });

  // Recharts and other chart primitives set inline `style` attributes, which
  // CSP treats as inline style. Blocking them breaks every dashboard, so
  // style-src keeps 'unsafe-inline' while script-src stays strict. Set
  // CSP_ALLOW_INLINE_STYLES=false to harden further for APIs that serve no UI.
  const allowInlineStyles = process.env.CSP_ALLOW_INLINE_STYLES !== "false";
  const styleSrc = allowInlineStyles
    ? "style-src 'self' 'unsafe-inline'"
    : "style-src 'self'";

  const connectSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
  ];
  for (const extra of String(process.env.CSP_CONNECT_SRC || "").split(",")) {
    const value = extra.trim();
    if (value) connectSrc.push(value);
  }

  res.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com",
      "frame-src https://accounts.google.com",
      `connect-src ${connectSrc.join(" ")}`,
      "img-src 'self' data: https://lh3.googleusercontent.com",
      styleSrc,
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production")
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  next();
};

export const validateRequestBody = (req, res, next) => {
  if (
    stateChangingMethods.has(req.method) &&
    req.path.startsWith("/api/") &&
    !req.is("application/json")
  ) {
    return res
      .status(415)
      .json({ message: "Content-Type must be application/json." });
  }
  removeUnsafeKeys(req.body);
  return next();
};
