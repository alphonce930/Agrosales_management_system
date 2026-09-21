import crypto from "node:crypto";
import { getRedis, runRedis } from "../config/redis.js";
import { getRefreshTtlSeconds, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/helpers.js";

const key = (userId, sessionId) => `auth:refresh:${userId}:${sessionId}`;
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const unavailable = () => Object.assign(new Error("Authentication is temporarily unavailable."), { status: 503 });

const sessionToken = (user, sessionId) =>
  signRefreshToken({ id: user.id, sid: sessionId, jti: crypto.randomUUID() });

const saveSession = async (redis, user, sessionId, refreshToken, context) =>
  runRedis("session write", () =>
    redis.set(
      key(user.id, sessionId),
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        createdAt: new Date().toISOString(),
        ip: context.ip,
        userAgent: String(context.userAgent || "").slice(0, 512),
        tokenHash: tokenHash(refreshToken),
      },
      { ex: getRefreshTtlSeconds() },
    ),
  );

export const createSessionTokens = async ({ user, ip, userAgent }) => {
  const redis = getRedis();
  if (!redis) throw unavailable();
  const sessionId = crypto.randomUUID();
  const refreshToken = sessionToken(user, sessionId);
  await saveSession(redis, user, sessionId, refreshToken, { ip, userAgent });
  console.info("Refresh session created.");
  return { token: signAccessToken({ id: user.id, role: user.role, email: user.email }), refreshToken };
};

export const rotateSessionTokens = async (refreshToken, context) => {
  const decoded = verifyRefreshToken(refreshToken);
  const redis = getRedis();
  if (!redis) throw unavailable();
  // GETDEL is atomic. Only one simultaneous use of a refresh token can win;
  // this prevents two requests from both reading and rotating the same token.
  const session = await runRedis("session rotation", () =>
    redis.getdel(key(decoded.id, decoded.sid)),
  );
  if (!session || session.tokenHash !== tokenHash(refreshToken)) throw Object.assign(new Error("Invalid refresh session."), { status: 401 });
  const user = { id: decoded.id, role: session.role, email: session.email || decoded.email };
  const nextRefreshToken = sessionToken(user, decoded.sid);
  await saveSession(redis, user, decoded.sid, nextRefreshToken, context);
  console.info("Refresh token rotated.");
  return {
    token: signAccessToken({ id: user.id, role: user.role, email: user.email }),
    refreshToken: nextRefreshToken,
  };
};

export const revokeSession = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const redis = getRedis();
    if (redis) {
      await runRedis("session revocation", () => redis.del(key(decoded.id, decoded.sid)));
      console.info("Refresh session revoked.");
    }
  } catch (error) {
    // Logout is intentionally idempotent. Infrastructure failures are logged
    // by runRedis but never expose session details to the client.
  }
};
