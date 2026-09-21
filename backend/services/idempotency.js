import { getRedis } from "../config/redis.js";

const ttl = Number(process.env.IDEMPOTENCY_TTL_SECONDS) || 24 * 60 * 60;
const validKey = (key) => typeof key === "string" && /^[a-zA-Z0-9-]{16,128}$/.test(key);
const redisKey = (scope, userId, key) => `idempotency:${scope}:${userId}:${key}`;

export const reserveIdempotencyKey = async (scope, userId, requestKey) => {
  if (!validKey(requestKey)) return { enabled: false };
  const redis = getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") throw Object.assign(new Error("Request protection is temporarily unavailable."), { status: 503 });
    return { enabled: false };
  }
  const key = redisKey(scope, userId, requestKey);
  const created = await redis.set(key, { state: "processing" }, { nx: true, ex: ttl });
  if (created) return { enabled: true, key };
  const existing = await redis.get(key);
  if (existing?.state === "completed") return { enabled: true, key, response: existing.response };
  return { enabled: true, key, processing: true };
};

export const completeIdempotencyKey = async (reservation, response) => {
  if (!reservation?.enabled) return;
  const redis = getRedis();
  await redis.set(reservation.key, { state: "completed", response }, { ex: ttl });
};

export const abandonIdempotencyKey = async (reservation) => {
  if (!reservation?.enabled) return;
  const redis = getRedis();
  if (redis) await redis.del(reservation.key);
};
