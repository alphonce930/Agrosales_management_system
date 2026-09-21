import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redis = null;
let initialized = false;
let loginIpRatelimit = null;

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
