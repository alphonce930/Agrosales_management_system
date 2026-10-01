import dotenv from "dotenv";

dotenv.config({ path: "backend/.env", quiet: true });

const BASE = process.env.VERIFY_BASE || "http://127.0.0.1:5055";
const ALLOWED_ORIGIN = "http://localhost:5173";
const BLOCKED_ORIGIN = "https://evil.example.com";

const results = [];
const check = (name, passed, detail = "") => {
  results.push({ name, passed, detail });
  console.log(
    `${passed ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`,
  );
};

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  let body = null;
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text();
  }
  return { response, body, contentType };
};

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

// ---------------------------------------------------------------- health
{
  const { response, body } = await request("/api/health");
  check(
    "GET /api/health returns 200 JSON",
    response.status === 200,
    `status=${response.status}`,
  );
  check(
    "health reports database up",
    body?.database === "up",
    JSON.stringify(body),
  );
}

// ------------------------------------------------- login (correct creds)
let accessToken = null;
let refreshCookie = null;
const loginTimings = [];

if (!adminEmail || !adminPassword) {
  check("ADMIN credentials present in backend/.env", false);
} else {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const started = performance.now();
    const { response, body } = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    loginTimings.push(performance.now() - started);

    if (attempt === 0) {
      check(
        "POST /api/auth/login returns 200",
        response.status === 200,
        `status=${response.status}`,
      );
      check("login returns an access token", typeof body?.token === "string");
      check("login returns the user object", body?.user?.email === adminEmail);
      check(
        "login response never leaks the password hash",
        !JSON.stringify(body || {}).includes("$2"),
      );
      const cookies = response.headers.getSetCookie?.() || [];
      refreshCookie = cookies.map((c) => c.split(";")[0]).join("; ");
      check(
        "login sets a refresh cookie",
        cookies.some((c) => c.includes("agro_refresh")),
      );
      accessToken = body?.token;
    }
  }

  const sorted = [...loginTimings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(
    `INFO | login timing ms -> min=${sorted[0].toFixed(1)} median=${median.toFixed(1)} max=${sorted[sorted.length - 1].toFixed(1)}`,
  );
}

// ------------------------------------------------------ login (bad creds)
{
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
    body: JSON.stringify({
      email: adminEmail,
      password: "definitely-wrong-password",
    }),
  });
  check(
    "POST /api/auth/login with bad password returns 401",
    response.status === 401,
    `status=${response.status} body=${JSON.stringify(body)}`,
  );
}

// --------------------------------------------------------------- /auth/me
{
  const { response, body } = await request("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  check(
    "GET /api/auth/me with token returns 200",
    response.status === 200,
    `status=${response.status}`,
  );
  check("GET /api/auth/me returns the user", body?.user?.email === adminEmail);

  const unauth = await request("/api/auth/me");
  check(
    "GET /api/auth/me without token returns 401 JSON",
    unauth.response.status === 401 &&
      unauth.contentType.includes("application/json"),
    `status=${unauth.response.status} type=${unauth.contentType}`,
  );
}

// ------------------------------------------------------------- refresh
{
  const blocked = await request("/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BLOCKED_ORIGIN,
      Cookie: refreshCookie,
    },
    body: "{}",
  });
  check(
    "refresh from a disallowed origin is rejected (403)",
    blocked.response.status === 403,
    `status=${blocked.response.status}`,
  );

  const allowed = await request("/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      Cookie: refreshCookie,
    },
    body: "{}",
  });
  check(
    "refresh from an allowed origin succeeds (cookie auth + CSRF pass)",
    allowed.response.status === 200,
    `status=${allowed.response.status} body=${JSON.stringify(allowed.body)}`,
  );
  if (allowed.response.status === 200) {
    accessToken = allowed.body?.token || accessToken;
    const rotated = allowed.response.headers.getSetCookie?.() || [];
    refreshCookie =
      rotated.map((c) => c.split(";")[0]).join("; ") || refreshCookie;
  }
}

// -------------------------------------------------------- JSON 404 for API
{
  const { response, body, contentType } = await request(
    "/api/definitely-not-a-route",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  check(
    "unknown API route returns JSON 404 (not HTML)",
    response.status === 404 && contentType.includes("application/json"),
    `status=${response.status} type=${contentType}`,
  );
  check(
    "404 body carries a message",
    typeof body?.message === "string",
    JSON.stringify(body),
  );
}

// ------------------------------------------------------------ CORS preflight
{
  const preflight = await request("/api/sales", {
    method: "OPTIONS",
    headers: {
      Origin: ALLOWED_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers":
        "content-type,idempotency-key,authorization",
    },
  });
  const allowHeaders = (
    preflight.response.headers.get("access-control-allow-headers") || ""
  ).toLowerCase();
  check(
    "preflight for POST /api/sales is allowed",
    preflight.response.status === 204,
    `status=${preflight.response.status}`,
  );
  check(
    "preflight permits the Idempotency-Key header",
    allowHeaders.includes("idempotency-key"),
    `allow-headers=${allowHeaders}`,
  );
  check(
    "preflight returns the allow-origin header",
    preflight.response.headers.get("access-control-allow-origin") ===
      ALLOWED_ORIGIN,
  );

  const denied = await request("/api/sales", {
    method: "OPTIONS",
    headers: {
      Origin: BLOCKED_ORIGIN,
      "Access-Control-Request-Method": "POST",
    },
  });
  check(
    "preflight from a disallowed origin is rejected",
    denied.response.status === 403,
    `status=${denied.response.status}`,
  );
}

// ----------------------------------------------------- protected data route
{
  const { response, body } = await request("/api/customers", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  check(
    "GET /api/customers with token returns 200",
    response.status === 200,
    `status=${response.status}`,
  );
  check(
    "GET /api/customers returns an array",
    Array.isArray(body),
    typeof body,
  );
}

const failed = results.filter((r) => !r.passed);
console.log(
  `\nSUMMARY: ${results.length - failed.length}/${results.length} checks passed`,
);
if (failed.length) {
  console.log("FAILED CHECKS:");
  for (const item of failed) console.log(`  - ${item.name} :: ${item.detail}`);
  process.exitCode = 1;
}
