import test from "node:test";
import assert from "node:assert/strict";

import {
  isOriginAllowed,
  resolveSelfOrigin,
  resetAllowedOriginsCache,
} from "../config/corsOrigins.js";

const req = (headers = {}, { secure = false } = {}) => ({
  secure,
  get: (name) => headers[name.toLowerCase()],
});

test.beforeEach(() => {
  resetAllowedOriginsCache();
});

test("self origin is reconstructed from Host and X-Forwarded-Proto", () => {
  assert.equal(
    resolveSelfOrigin(req({ host: "cpt1.fly.dev", "x-forwarded-proto": "https" })),
    "https://cpt1.fly.dev",
  );
});

test("self origin falls back to the connection scheme when no proxy header", () => {
  assert.equal(
    resolveSelfOrigin(req({ host: "localhost:5000" }, { secure: true })),
    "https://localhost:5000",
  );
  assert.equal(
    resolveSelfOrigin(req({ host: "localhost:5000" })),
    "http://localhost:5000",
  );
});

test("self origin is empty when Host is missing or proto is not http(s)", () => {
  assert.equal(resolveSelfOrigin(req({})), "");
  assert.equal(
    resolveSelfOrigin(req({ host: "cpt1.fly.dev", "x-forwarded-proto": "gopher" })),
    "",
  );
});

test("a same-origin write is allowed on a deployment hostname", () => {
  const origin = "https://cpt1.fly.dev";
  assert.equal(isOriginAllowed(origin, resolveSelfOrigin(req({
    host: "cpt1.fly.dev",
    "x-forwarded-proto": "https",
  }))), true);
});

test("an unlisted foreign origin stays blocked even when self origin is known", () => {
  assert.equal(
    isOriginAllowed("https://evil.example.com", "https://cpt1.fly.dev"),
    false,
  );
});

test("a request with no Origin header is never blocked", () => {
  assert.equal(isOriginAllowed(undefined, "https://cpt1.fly.dev"), true);
  assert.equal(isOriginAllowed("", "https://cpt1.fly.dev"), true);
});

test("the opaque null origin is rejected", () => {
  assert.equal(isOriginAllowed("null", "https://cpt1.fly.dev"), false);
});

test("an explicitly allowlisted origin is accepted", () => {
  process.env.FRONTEND_URL = "https://app.example.test";
  resetAllowedOriginsCache();
  try {
    assert.equal(isOriginAllowed("https://app.example.test"), true);
    assert.equal(isOriginAllowed("https://APP.example.test/"), true);
  } finally {
    delete process.env.FRONTEND_URL;
    resetAllowedOriginsCache();
  }
});

test("Vercel preview hosts are refused unless the preview opt-in is enabled", () => {
  const preview =
    "https://agrosales-management-system-p3xt-abc123.vercel.app";
  assert.equal(isOriginAllowed(preview), false);

  process.env.CORS_ALLOW_VERCEL_PREVIEWS = "true";
  resetAllowedOriginsCache();
  try {
    assert.equal(isOriginAllowed(preview), true);
    // A different project prefix must not be swept in by the pattern.
    assert.equal(
      isOriginAllowed("https://some-other-project-abc123.vercel.app"),
      false,
    );
  } finally {
    delete process.env.CORS_ALLOW_VERCEL_PREVIEWS;
    resetAllowedOriginsCache();
  }
});

test("Vercel deployments allow only previews for the configured frontend project", () => {
  const savedVercel = process.env.VERCEL;
  const savedPrefix = process.env.VERCEL_PREVIEW_PREFIX;
  process.env.VERCEL = "1";
  delete process.env.VERCEL_PREVIEW_PREFIX;
  resetAllowedOriginsCache();

  try {
    assert.equal(
      isOriginAllowed(
        "https://agrosales-management-system-p3xt-dtpwy9mm3.vercel.app",
      ),
      true,
    );
    assert.equal(
      isOriginAllowed("https://unrelated-project-dtpwy9mm3.vercel.app"),
      false,
    );
  } finally {
    if (savedVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedVercel;
    if (savedPrefix === undefined) delete process.env.VERCEL_PREVIEW_PREFIX;
    else process.env.VERCEL_PREVIEW_PREFIX = savedPrefix;
    resetAllowedOriginsCache();
  }
});