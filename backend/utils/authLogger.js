import crypto from "node:crypto";

const hashIdentifier = (value) => {
  if (!value) return "none";
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex")
    .substring(0, 16);
};

const isAuthPath = (pathname) =>
  pathname.startsWith("/auth") || pathname.startsWith("/api/auth");

/**
 * Structured request logging.
 *
 * Default behaviour logs authentication traffic and every failed request. Set
 * LOG_ALL_REQUESTS=true to log every request (useful when debugging, expensive
 * in production because each line is a separate log event).
 *
 * Never logs request bodies, passwords, access tokens, refresh tokens, or raw
 * identifiers: emails and device IDs are hashed before they are written.
 */
export const logAuthEvent = (req, res, next) => {
  const originalJson = res.json;
  const requestId =
    String(req.get("x-request-id") || "").slice(0, 64) || crypto.randomUUID();
  const startTime = Date.now();

  // Correlate the client-visible response with the server log line.
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.json = function (data) {
    const shouldLog =
      process.env.LOG_ALL_REQUESTS === "true" ||
      isAuthPath(req.path) ||
      res.statusCode >= 400;

    if (shouldLog) {
      const logData = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
        ip: hashIdentifier(req.ip || req.socket?.remoteAddress),
        userAgent: req.get("user-agent")?.substring(0, 100) || "unknown",
        rateLimited: res.statusCode === 429,
      };

      if (isAuthPath(req.path)) {
        const email = req.body?.email;
        if (email) logData.emailHash = hashIdentifier(email.toLowerCase().trim());
        if (req.deviceId) logData.deviceIdHash = hashIdentifier(req.deviceId);
      }

      console.log(JSON.stringify(logData));
    }

    return originalJson.call(this, data);
  };

  next();
};
