import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

const store = new Map();
const redis = {
  async set(key, value) { store.set(key, value); return "OK"; },
  async get(key) { return store.get(key) ?? null; },
  async getdel(key) {
    const value = store.get(key) ?? null;
    store.delete(key);
    return value;
  },
  async del(key) { return store.delete(key) ? 1 : 0; },
};

const { setRedisClient } = await import("../config/redis.js");
const { createSessionTokens, rotateSessionTokens, revokeSession } = await import("../services/authSessions.js");
setRedisClient(redis);

const user = { id: 7, role: "staff", email: "staff@example.test" };
const context = { ip: "127.0.0.1", userAgent: "node-test" };

test("separate logins create independent refresh sessions", async () => {
  store.clear();
  const [first, second] = await Promise.all([
    createSessionTokens({ user, ...context }),
    createSessionTokens({ user, ...context }),
  ]);
  assert.notEqual(first.refreshToken, second.refreshToken);
  assert.equal(store.size, 2);
});

test("simultaneous refreshes consume a refresh token only once", async () => {
  store.clear();
  const initial = await createSessionTokens({ user, ...context });
  const results = await Promise.allSettled([
    rotateSessionTokens(initial.refreshToken, context),
    rotateSessionTokens(initial.refreshToken, context),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  await assert.rejects(() => rotateSessionTokens(initial.refreshToken, context), {
    status: 401,
  });
});

test("logout revokes only the presented session", async () => {
  store.clear();
  const first = await createSessionTokens({ user, ...context });
  const second = await createSessionTokens({ user, ...context });
  await revokeSession(first.refreshToken);
  await assert.rejects(() => rotateSessionTokens(first.refreshToken, context), {
    status: 401,
  });
  await assert.doesNotReject(() => rotateSessionTokens(second.refreshToken, context));
});
