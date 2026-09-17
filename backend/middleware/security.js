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
  res.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com",
      "frame-src https://accounts.google.com",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
      "img-src 'self' data: https://lh3.googleusercontent.com",
      "style-src 'self' 'unsafe-inline'",
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
