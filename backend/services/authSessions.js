import crypto from "node:crypto";
import { getRedis } from "../config/redis.js";
import { getRefreshTtlSeconds, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/helpers.js";

const key = (userId, sessionId) => `auth:refresh:${userId}:${sessionId}`;
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const createSessionTokens = async ({ user, ip, userAgent }) => {
  const redis = getRedis();
  if (!redis) throw Object.assign(new Error("Refresh sessions require Redis."), { status: 503 });
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken({ id: user.id, sid: sessionId });
  await redis.set(key(user.id, sessionId), {
    userId: user.id, role: user.role, createdAt: new Date().toISOString(), ip, userAgent: String(userAgent || "").slice(0, 512), tokenHash: tokenHash(refreshToken),
  }, { ex: getRefreshTtlSeconds() });
  return { token: signAccessToken({ id: user.id, role: user.role, email: user.email }), refreshToken };
};

export const rotateSessionTokens = async (refreshToken, context) => {
  const decoded = verifyRefreshToken(refreshToken);
  const redis = getRedis();
  if (!redis) throw Object.assign(new Error("Authentication is temporarily unavailable."), { status: 503 });
  const session = await redis.get(key(decoded.id, decoded.sid));
  if (!session || session.tokenHash !== tokenHash(refreshToken)) throw Object.assign(new Error("Invalid refresh session."), { status: 401 });
  await redis.del(key(decoded.id, decoded.sid));
  return createSessionTokens({ user: { id: decoded.id, role: session.role, email: decoded.email }, ...context });
};

export const revokeSession = async (refreshToken) => {
  try { const decoded = verifyRefreshToken(refreshToken); const redis = getRedis(); if (redis) await redis.del(key(decoded.id, decoded.sid)); } catch { /* logout is idempotent */ }
};
