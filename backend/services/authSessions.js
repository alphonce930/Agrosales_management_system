import crypto from "node:crypto";
import { getRedis, runRedis } from "../config/redis.js";
import {
  getRefreshTtlSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/helpers.js";

const tokenHash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const unavailable = () =>
  Object.assign(new Error("Authentication is temporarily unavailable."), {
    status: 503,
  });
const sessionKey = (sessionId) => `auth:session:${sessionId}`;
const userDevicesKey = (userId) => `auth:user:${userId}:devices`;
const deviceSessionsKey = (deviceId) => `auth:device:${deviceId}:sessions`;

const sessionToken = (user, sessionId) =>
  signRefreshToken({ id: user.id, sid: sessionId, jti: crypto.randomUUID() });

const nowIso = () => new Date().toISOString();

const saveSession = async (
  redis,
  user,
  deviceId,
  sessionId,
  refreshToken,
  context,
) => {
  const now = nowIso();
  const expiresAt = new Date(
    Date.now() + getRefreshTtlSeconds() * 1000,
  ).toISOString();
  const session = {
    sessionId,
    userId: user.id,
    deviceId,
    role: user.role,
    email: user.email,
    createdAt: now,
    lastUsedAt: now,
    expiresAt,
    status: "active",
    ip: String(context.ip || "").slice(0, 64),
    userAgent: String(context.userAgent || "").slice(0, 512),
    tokenHash: tokenHash(refreshToken),
  };

  await runRedis("session write", async () => {
    await redis.set(sessionKey(sessionId), session, {
      ex: getRefreshTtlSeconds(),
    });
    await redis.sadd(userDevicesKey(user.id), deviceId);
    await redis.expire(userDevicesKey(user.id), getRefreshTtlSeconds());
    await redis.sadd(deviceSessionsKey(deviceId), sessionId);
    await redis.expire(deviceSessionsKey(deviceId), getRefreshTtlSeconds());
  });

  return session;
};

export const createSessionTokens = async ({
  user,
  deviceId,
  ip,
  userAgent,
}) => {
  const redis = getRedis();
  if (!redis) throw unavailable();
  const sessionId = crypto.randomUUID();
  const refreshToken = sessionToken(user, sessionId);
  await saveSession(redis, user, deviceId, sessionId, refreshToken, {
    ip,
    userAgent,
  });
  console.info("Refresh session created.", {
    userId: user.id,
    deviceId,
    sessionId,
  });
  return {
    token: signAccessToken({ id: user.id, role: user.role, email: user.email }),
    refreshToken,
  };
};

export const rotateSessionTokens = async (refreshToken, context) => {
  const decoded = verifyRefreshToken(refreshToken);
  const redis = getRedis();
  if (!redis) throw unavailable();

  const session = await runRedis("session rotation", () =>
    redis.getdel(sessionKey(decoded.sid)),
  );
  if (
    !session ||
    session.userId !== decoded.id ||
    session.tokenHash !== tokenHash(refreshToken)
  ) {
    throw Object.assign(new Error("Invalid refresh session."), { status: 401 });
  }

  const user = {
    id: decoded.id,
    role: session.role,
    email: session.email || decoded.email,
  };
  const nextRefreshToken = sessionToken(user, decoded.sid);
  const now = nowIso();
  const nextSession = {
    ...session,
    role: user.role,
    email: user.email,
    lastUsedAt: now,
    expiresAt: new Date(
      Date.now() + getRefreshTtlSeconds() * 1000,
    ).toISOString(),
    ip: String(context.ip || session.ip || "").slice(0, 64),
    userAgent: String(context.userAgent || session.userAgent || "").slice(
      0,
      512,
    ),
    tokenHash: tokenHash(nextRefreshToken),
    status: "active",
  };

  await runRedis("session rotation write", () =>
    redis.set(sessionKey(decoded.sid), nextSession, {
      ex: getRefreshTtlSeconds(),
    }),
  );

  console.info("Refresh token rotated.", {
    userId: user.id,
    deviceId: session.deviceId,
    sessionId: decoded.sid,
  });
  return {
    token: signAccessToken({ id: user.id, role: user.role, email: user.email }),
    refreshToken: nextRefreshToken,
  };
};

export const revokeSession = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const redis = getRedis();
    if (!redis) return;

    const session = await runRedis("session revocation", () =>
      redis.getdel(sessionKey(decoded.sid)),
    );
    if (session) {
      await runRedis("session membership cleanup", async () => {
        await redis.srem(deviceSessionsKey(session.deviceId), decoded.sid);
        await redis.srem(userDevicesKey(session.userId), session.deviceId);
      });
      console.info("Refresh session revoked.", {
        userId: session.userId,
        deviceId: session.deviceId,
        sessionId: decoded.sid,
      });
    }
  } catch (error) {
    // Logout is intentionally idempotent. Infrastructure failures are logged
    // by runRedis but never expose session details to the client.
  }
};

export const revokeUserSessions = async (userId) => {
  const redis = getRedis();
  if (!redis) return;

  const deviceIds = await runRedis(
    "user session lookup",
    () => redis.smembers(userDevicesKey(userId)) || [],
  );
  for (const deviceId of deviceIds) {
    const sessionIds = await runRedis(
      "device session lookup",
      () => redis.smembers(deviceSessionsKey(deviceId)) || [],
    );
    for (const sessionId of sessionIds) {
      await runRedis("user session revocation", () =>
        redis.del(sessionKey(sessionId)),
      );
    }
    await runRedis("device session revocation", () =>
      redis.del(deviceSessionsKey(deviceId)),
    );
  }
  await runRedis("user device revocation", () =>
    redis.del(userDevicesKey(userId)),
  );
};
