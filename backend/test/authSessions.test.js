import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

const store = new Map();
const redis = {
  async set(key, value) {
    store.set(key, value);
    return "OK";
  },
  async get(key) {
    return store.get(key) ?? null;
  },
  async getdel(key) {
    const value = store.get(key) ?? null;
    store.delete(key);
    return value;
  },
  async del(key) {
    return store.delete(key) ? 1 : 0;
  },
  async incr(key) {
    const next = (store.get(key) ?? 0) + 1;
    store.set(key, next);
    return next;
  },
  async expire(key, ttl) {
    return 1;
  },
  async sadd(key, value) {
    const current = store.get(key) ?? new Set();
    const next = new Set(current);
    next.add(value);
    store.set(key, next);
    return next.size;
  },
  async srem(key, value) {
    const current = store.get(key) ?? new Set();
    const next = new Set(current);
    next.delete(value);
    store.set(key, next);
    return current.size !== next.size ? 1 : 0;
  },
  async smembers(key) {
    return [...(store.get(key) ?? new Set())];
  },
};

const { setRedisClient } = await import("../config/redis.js");
const { createSessionTokens, rotateSessionTokens, revokeSession } =
  await import("../services/authSessions.js");
const { registerFailedLogin, clearFailedLoginLimit, getDeviceCookieName } =
  await import("../middleware/loginRateLimit.js");
setRedisClient(redis);

const user = { id: 7, role: "staff", email: "staff@example.test" };
const context = { ip: "127.0.0.1", userAgent: "node-test" };

async function makeReq(deviceId, email = user.email) {
  return {
    body: { email },
    headers: {
      "user-agent": "node-test",
      cookie: deviceId ? `${getDeviceCookieName()}=${deviceId}` : "",
    },
    ip: "127.0.0.1",
  };
}

test("separate logins create independent refresh sessions", async () => {
  store.clear();
  const [first, second] = await Promise.all([
    createSessionTokens({ user, deviceId: "device-a", ...context }),
    createSessionTokens({ user, deviceId: "device-b", ...context }),
  ]);
  assert.notEqual(first.refreshToken, second.refreshToken);
  const sessionKeys = Array.from(store.keys()).filter((key) =>
    key.startsWith("auth:session:"),
  );
  assert.equal(sessionKeys.length, 2);
});

test("different users and devices receive distinct session keys", async () => {
  store.clear();
  const otherUser = { id: 8, role: "staff", email: "other@example.test" };
  await Promise.all([
    createSessionTokens({ user, deviceId: "device-a", ...context }),
    createSessionTokens({ user, deviceId: "device-b", ...context }),
    createSessionTokens({ user: otherUser, deviceId: "device-c", ...context }),
  ]);
  const sessionKeys = Array.from(store.keys()).filter((key) =>
    key.startsWith("auth:session:"),
  );
  assert.equal(sessionKeys.length, 3);
  assert.equal(new Set(sessionKeys).size, 3);
});

test("simultaneous refreshes consume a refresh token only once", async () => {
  store.clear();
  const initial = await createSessionTokens({ user, ...context });
  const results = await Promise.allSettled([
    rotateSessionTokens(initial.refreshToken, context),
    rotateSessionTokens(initial.refreshToken, context),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
  await assert.rejects(
    () => rotateSessionTokens(initial.refreshToken, context),
    {
      status: 401,
    },
  );
});

test("logout revokes only the presented session", async () => {
  store.clear();
  const first = await createSessionTokens({ user, ...context });
  const second = await createSessionTokens({ user, ...context });
  await revokeSession(first.refreshToken);
  await assert.rejects(() => rotateSessionTokens(first.refreshToken, context), {
    status: 401,
  });
  await assert.doesNotReject(() =>
    rotateSessionTokens(second.refreshToken, context),
  );
});

test("failed login attempts are tracked per device, not per user", async () => {
  store.clear();
  const deviceA = "device-a";
  const deviceB = "device-b";
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await registerFailedLogin(await makeReq(deviceA), res);
    assert.equal(result, true);
  }

  const deviceBResult = await registerFailedLogin(await makeReq(deviceB), res);
  assert.equal(deviceBResult, true);
  const deviceAKeys = Array.from(store.keys()).filter((key) =>
    key.includes(`auth:device:${deviceA}:login_attempts`),
  );
  assert.equal(deviceAKeys.length, 1);
  const deviceBKeys = Array.from(store.keys()).filter((key) =>
    key.includes(`auth:device:${deviceB}:login_attempts`),
  );
  assert.equal(deviceBKeys.length, 1);
});

test("device-aware sessions stay independent across devices", async () => {
  store.clear();
  const deviceA = "device-a";
  const deviceB = "device-b";

  const first = await createSessionTokens({
    user,
    deviceId: deviceA,
    ...context,
  });
  const second = await createSessionTokens({
    user,
    deviceId: deviceB,
    ...context,
  });

  assert.ok(
    Array.from(store.keys()).some((key) =>
      key.includes(`auth:device:${deviceA}:sessions`),
    ),
  );
  assert.ok(
    Array.from(store.keys()).some((key) =>
      key.includes(`auth:device:${deviceB}:sessions`),
    ),
  );
  assert.notEqual(first.refreshToken, second.refreshToken);
});
