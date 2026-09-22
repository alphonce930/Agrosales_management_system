import crypto from "node:crypto";

const hashIdentifier = (value) => {
  if (!value) return "none";
  return crypto.createHash("sha256").update(String(value)).digest("hex").substring(0, 16);
};

export const logAuthEvent = (req, res, next) => {
  const originalJson = res.json;
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  res.json = function (data) {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: hashIdentifier(req.ip || req.socket.remoteAddress),
      userAgent: req.get("user-agent")?.substring(0, 100) || "unknown",
      rateLimited: res.statusCode === 429,
    };

    if (req.path.startsWith("/auth/login") || req.path.startsWith("/auth/google")) {
      const email = req.body?.email;
      if (email) {
        logData.emailHash = hashIdentifier(email.toLowerCase().trim());
      }
      if (req.deviceId) {
        logData.deviceIdHash = hashIdentifier(req.deviceId);
      }
    }

    console.log(JSON.stringify(logData));
    return originalJson.call(this, data);
  };

  next();
};
