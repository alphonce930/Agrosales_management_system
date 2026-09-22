import crypto from "node:crypto";
import { getRedis, getLoginIpRatelimit } from "../config/redis.js";
import { Ratelimit } from "@upstash/ratelimit";
import { durationToSeconds } from "../utils/duration.js";
import { getClientIp } from "../utils/clientIp.js";

const genericMessage = {
  message: "Too many login attempts. Please try again later.",
};
const normalizeIdentity = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 254) || "unknown";
const safeKeyPart = (value) => encodeURIComponent(String(value || "unknown"));
const defaultDeviceCookieName = () =>
  process.env.NODE_ENV === "production" ? "__Host-agro_device" : "agro_device";
const parseCookieHeader = (req, name) => {
  const raw = req?.headers?.cookie || req?.cookies?.[name] || "";
  if (!raw) return null;
  const cookiePairs = String(raw).split(";");
  const match = cookiePairs
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
};

export const getDeviceCookieName = () =>
  process.env.DEVICE_COOKIE_NAME || defaultDeviceCookieName();

export const resolveDeviceId = (req, res, { createIfMissing = false } = {}) => {
  const cookieName = getDeviceCookieName();
  const existing = parseCookieHeader(req, cookieName) || req?.deviceId;
  if (existing) return existing;
  if (!createIfMissing) return null;
  const deviceId = `dvc_${crypto.randomBytes(24).toString("hex")}`;
  if (res && typeof res.cookie === "function") {
    res.cookie(cookieName, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.REFRESH_COOKIE_SAME_SITE || "lax",
      path: "/",
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });
  }
  return deviceId;
};

const incrementWithinWindow = async (key, limit, ttl) => {
  const redis = getRedis();
  if (!redis) return { allowed: true, count: 0 };
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttl);
  return { allowed: count <= limit, count };
};

const getDeviceAttemptKey = (deviceId) =>
  `auth:device:${safeKeyPart(deviceId)}:login_attempts`;
const getDeviceLockKey = (deviceId) =>
  `auth:device:${safeKeyPart(deviceId)}:lock`;
const getIdentityAttemptKey = (identity) =>
  `auth:login:failed:${safeKeyPart(identity)}`;
const getPreAuthKey = (identity, ip) =>
  `auth:login:preauth:${safeKeyPart(`${normalizeIdentity(identity)}:${String(ip || "unknown")}`)}`;

export const loginIpLimit = async (req, res, next) => {
  try {
    const limiter = getLoginIpRatelimit();
    if (!limiter) return next();
    const result = await limiter.limit(getClientIp(req));
    if (!result.allowed) {
      const reset = result.reset
        ? Math.ceil((result.reset - Date.now()) / 1000)
        : 60;
      res.setHeader("Retry-After", String(reset));
      return res.status(429).json(genericMessage);
    }
    return next();
  } catch (error) {
    console.error("Login IP rate-limit unavailable", error);
    return res
      .status(503)
      .json({ message: "Authentication is temporarily unavailable." });
  }
};

export const registerIpLimit = async (req, res, next) => {
  try {
    const client = getRedis();
    if (!client) return next();

    // Use a separate, more lenient rate limit for registration
    const limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.fixedWindow(
        Number(process.env.REGISTER_RATE_LIMIT) || 10,
        process.env.REGISTER_RATE_WINDOW || "1h",
      ),
      prefix: "auth:register:ip",
    });

    const result = await limiter.limit(getClientIp(req));
    if (!result.allowed) {
      const reset = result.reset
        ? Math.ceil((result.reset - Date.now()) / 1000)
        : 3600;
      res.setHeader("Retry-After", String(reset));
      return res.status(429).json({
        message: "Too many registration attempts. Please try again later.",
      });
    }
    return next();
  } catch (error) {
    console.error("Register IP rate-limit unavailable", error);
    // Don't block registration if rate limiting fails
    return next();
  }
};

export const registerFailedLogin = async (req, res, deviceIdOverride) => {
  const identity = normalizeIdentity(req.body?.email);
  const deviceId =
    deviceIdOverride || resolveDeviceId(req, res, { createIfMissing: true });
  const redis = getRedis();
  if (!redis) return true;

  try {
    const deviceLimit = Number(
      process.env.MAX_LOGIN_ATTEMPTS_PER_DEVICE ||
        process.env.LOGIN_RATE_LIMIT ||
        5,
    );
    const deviceWindow = durationToSeconds(
      process.env.LOGIN_ATTEMPT_WINDOW_SECONDS ||
        process.env.LOGIN_RATE_WINDOW ||
        "15m",
      900,
    );
    const deviceLockout = Number(
      process.env.DEVICE_LOCKOUT_SECONDS || deviceWindow,
    );
    const lockKey = getDeviceLockKey(deviceId);
    const deviceAttemptKey = getDeviceAttemptKey(deviceId);
    const identityAttemptKey = getIdentityAttemptKey(identity);
    const preAuthKey = getPreAuthKey(identity, getClientIp(req));

    const locked = await redis.get(lockKey);
    if (locked) {
      res.status(429).json({
        message:
          "This device has been temporarily locked due to repeated failed login attempts.",
      });
      return false;
    }

    const deviceResult = await incrementWithinWindow(
      deviceAttemptKey,
      deviceLimit,
      deviceWindow,
    );
    const identityResult = await incrementWithinWindow(
      identityAttemptKey,
      Number(process.env.LOGIN_RATE_LIMIT) || 5,
      durationToSeconds(process.env.LOGIN_RATE_WINDOW || "5m", 300),
    );
    const preAuthResult = await incrementWithinWindow(
      preAuthKey,
      Number(process.env.PREAUTH_LOGIN_RATE_LIMIT) || 20,
      durationToSeconds(process.env.PREAUTH_LOGIN_WINDOW || "15m", 900),
    );

    if (
      !deviceResult.allowed ||
      !identityResult.allowed ||
      !preAuthResult.allowed
    ) {
      await redis.set(lockKey, "locked", { ex: deviceLockout });
      res.status(429).json(genericMessage);
      return false;
    }
  } catch (error) {
    console.error("Failed-login rate-limit unavailable", error);
  }
  return true;
};

export const clearFailedLoginLimit = async (identity, deviceId) => {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = [
      getIdentityAttemptKey(normalizeIdentity(identity)),
      getPreAuthKey(identity, "*"),
    ];
    if (deviceId)
      keys.push(getDeviceAttemptKey(deviceId), getDeviceLockKey(deviceId));
    await Promise.all(keys.map((key) => redis.del(key)));
  } catch (error) {
    console.error("Unable to clear failed login counter", error);
  }
};
