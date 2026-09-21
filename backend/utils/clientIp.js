const stripIpv4Mapped = (value) =>
  String(value || "").replace(/^::ffff:/i, "").trim();

export const getClientIp = (req) => {
  // Express populates req.ip from the trusted proxy hop(s) only after
  // `app.set("trust proxy", ...)`. Do not read x-forwarded-for directly.
  const ip = stripIpv4Mapped(req?.ip || req?.socket?.remoteAddress || "");
  return ip || "unknown";
};
