import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";

const savedEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FLY_APP_NAME: process.env.FLY_APP_NAME,
  VERCEL: process.env.VERCEL,
  API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX,
};
process.env.NODE_ENV = "production";
process.env.PORT = "0";
process.env.VERCEL = "1";
delete process.env.FLY_APP_NAME;
delete process.env.API_RATE_LIMIT_MAX;

const app = (await import("../app.js")).default;

test.after(() => {
  process.env.NODE_ENV = savedEnv.NODE_ENV;
  process.env.PORT = savedEnv.PORT;
  process.env.FLY_APP_NAME = savedEnv.FLY_APP_NAME;
  process.env.VERCEL = savedEnv.VERCEL;
  process.env.API_RATE_LIMIT_MAX = savedEnv.API_RATE_LIMIT_MAX;
});

test("Vercel trusts its direct proxy hop for client IPs", () => {
  assert.equal(app.get("trust proxy"), 1);
});

const listen = () =>
  new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });

const request = (server, path, { origin, method = "GET" } = {}) =>
  new Promise((resolve, reject) => {
    const headers = {
      // Simulate Fly's proxy terminating TLS in front of the app.
      Host: "cpt1.fly.dev",
      "X-Forwarded-Proto": "https",
    };
    if (origin) headers.Origin = origin;
    const req = http.request(
      { port: server.address().port, path, method, headers },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode, body, headers: res.headers }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });

test("the liveness route answers 200 behind a TLS-terminating proxy", async () => {
  const server = await listen();
  try {
    const { status, body } = await request(server, "/");
    assert.equal(status, 200);
    assert.match(body, /API is running/);
  } finally {
    server.close();
  }
});

test("Vercel allows normal API traffic without the local 300-request cap", async () => {
  const server = await listen();
  try {
    const { headers } = await request(server, "/api/does-not-exist");
    assert.equal(headers["ratelimit-limit"], "3000");
  } finally {
    server.close();
  }
});

test("a same-origin state-changing request clears both CORS and CSRF", async () => {
  const server = await listen();
  try {
    const { status } = await request(server, "/api/auth/login", {
      method: "POST",
      origin: "https://cpt1.fly.dev",
    });
    // 415 comes from validateRequestBody, which runs *after* the CORS and CSRF
    // gates. Reaching it at all proves the origin was not rejected.
    assert.notEqual(status, 403);
    assert.equal(status, 415);
  } finally {
    server.close();
  }
});

test("a foreign origin is still refused with the CORS error code", async () => {
  const server = await listen();
  try {
    const { status, body } = await request(server, "/api/auth/login", {
      method: "POST",
      origin: "https://evil.example.com",
    });
    assert.equal(status, 403);
    assert.match(body, /CORS_ORIGIN_DENIED/);
  } finally {
    server.close();
  }
});

test("an unmatched API path returns JSON, not the SPA shell", async () => {
  const server = await listen();
  try {
    const { status } = await request(server, "/api/does-not-exist");
    assert.equal(status, 404);
  } finally {
    server.close();
  }
});

test("the SPA fallback serves HTML for a client-side deep link", async () => {
  const server = await listen();
  try {
    const { status, body } = await request(server, "/sales");
    assert.equal(status, 200);
    assert.match(body, /<!doctype html/i);
  } finally {
    server.close();
  }
});

test("health reports degraded instead of the process dying without a database", async () => {
  const server = await listen();
  try {
    const { status, body } = await request(server, "/api/health");
    assert.equal(status, 503);
    assert.match(body, /"database":"down"/);
    assert.match(body, /"status":"degraded"/);
  } finally {
    server.close();
  }
});