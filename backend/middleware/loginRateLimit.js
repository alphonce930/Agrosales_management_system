import { getRedis, getLoginIpRatelimit } from "../config/redis.js";
import { durationToSeconds } from "../utils/duration.js";
import { getClientIp } from "../utils/clientIp.js";

const genericMessage = { message: "Too many login attempts. Please try again later." };
const normalizeIdentity = (value) => String(value || "").trim().toLowerCase().slice(0, 254) || "unknown";
const safeKeyPart = (value) => encodeURIComponent(value);

const incrementWithinWindow = async (key, limit, ttl) => {
  const redis = getRedis();
  if (!redis) return { allowed: true }; // local development only; production must configure Redis.
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttl);
  return { allowed: count <= limit, count };
};

export const loginIpLimit = async (req, res, next) => {
  try {
    const limiter = getLoginIpRatelimit();
    if (!limiter) return next();
    const result = await limiter.limit(getClientIp(req));
    if (!result.allowed) return res.status(429).json(genericMessage);
    return next();
  } catch (error) {
    console.error("Login IP rate-limit unavailable", error);
    return res.status(503).json({ message: "Authentication is temporarily unavailable." });
  }
};

export const registerFailedLogin = async (req, res) => {
  const identity = normalizeIdentity(req.body?.email);
  try {
    const result = await incrementWithinWindow(
      `auth:login:failed:${safeKeyPart(identity)}`,
      Number(process.env.LOGIN_RATE_LIMIT) || 5,
      durationToSeconds(process.env.LOGIN_RATE_WINDOW || "5m", 300),
    );
    if (!result.allowed) {
      res.status(429).json(genericMessage);
      return false;
    }
  } catch (error) {
    console.error("Failed-login rate-limit unavailable", error);
  }
  return true;
};

export const clearFailedLoginLimit = async (identity) => {
  const redis = getRedis();
  if (!redis) return;
  try { await redis.del(`auth:login:failed:${safeKeyPart(normalizeIdentity(identity))}`); }
  catch (error) { console.error("Unable to clear failed login counter", error); }
};
