import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redis = null;
let initialized = false;
let loginIpRatelimit = null;

const redisError = (action, error) => {
  // Upstash is a REST client, so there is no persistent socket to reconnect.
  // Each command is independently retried by the client/provider. Keep the
  // one shared client and surface outages as a safe, retryable failure.
  console.error(`Redis ${action} failed:`, error?.message || error);
};

export const isRedisConfigured = () =>
  Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

export const setRedisClient = (client) => {
  redis = client;
  initialized = true;
};

export const getRedis = () => {
  if (initialized) return redis;
  initialized = true;
  if (!isRedisConfigured()) {
    redis = null;
    return redis;
  }
  redis = Redis.fromEnv();
  return redis;
};

export const initializeRedis = async () => {
  const client = getRedis();
  if (!client) {
    console.warn("Redis is not configured; refresh-session endpoints will return 503.");
    return false;
  }

  try {
    await client.ping();
    console.log("Redis connection established.");
    return true;
  } catch (error) {
    redisError("startup health check", error);
    // Do not prevent API startup: a transient Upstash outage should not take
    // down unrelated PostgreSQL-backed functionality.
    return false;
  }
};

export const runRedis = async (action, operation) => {
  try {
    return await operation();
  } catch (error) {
    redisError(action, error);
    throw Object.assign(new Error("Authentication is temporarily unavailable."), {
      status: 503,
    });
  }
};

export const getLoginIpRatelimit = () => {
  const client = getRedis();
  if (!client) return null;
  if (!loginIpRatelimit) {
    const limit = Number(process.env.IP_RATE_LIMIT) || 20;
    const window = process.env.IP_RATE_WINDOW || "5m";
    loginIpRatelimit = new Ratelimit({ redis: client, limiter: Ratelimit.fixedWindow(limit, window), prefix: "auth:login:ip" });
  }
  return loginIpRatelimit;
};
