import crypto from "node:crypto";

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

// Generate CSRF token for state-changing operations that use cookies
const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

const verifyCsrfToken = (req) => {
  // CSRF protection is only needed for cookie-based authentication
  // Since most API calls use Authorization header with JWT, CSRF risk is minimal
  // The refresh endpoint uses cookies, so we protect it specifically
  const token = req.headers["x-csrf-token"];
  const cookieToken = req.cookies?.csrf_token;
  return token && cookieToken && token === cookieToken;
};

export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF if Authorization header is present (JWT-based auth)
  if (req.headers.authorization) {
    return next();
  }

  // Apply CSRF for cookie-based state-changing requests
  if (stateChangingMethods.has(req.method)) {
    if (!verifyCsrfToken(req)) {
      return res.status(403).json({ message: "CSRF token validation failed." });
    }
  }
  next();
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
  // CSP: Removed unsafe-inline from style-src. If inline styles are needed,
  // they should be moved to CSS files or use nonce-based CSP.
  res.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com",
      "frame-src https://accounts.google.com",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
      "img-src 'self' data: https://lh3.googleusercontent.com",
      "style-src 'self'",
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
