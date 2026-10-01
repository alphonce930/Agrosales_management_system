import test from "node:test";
import assert from "node:assert/strict";

import { sendPasswordResetEmail } from "../services/emailService.js";

test("password reset email links use the configured frontend URL", async () => {
  const savedEnv = {
    EMAIL_SERVICE: process.env.EMAIL_SERVICE,
    PASSWORD_RESET_URL: process.env.PASSWORD_RESET_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  };
  const savedFetch = globalThis.fetch;
  let emailRequest;

  process.env.EMAIL_SERVICE = "resend";
  process.env.PASSWORD_RESET_URL = "https://frontend.example.test/";
  process.env.FRONTEND_URL = "https://api.example.test,https://frontend.example.test";
  process.env.RESEND_API_KEY = "test-api-key";
  process.env.RESEND_FROM_EMAIL = "noreply@example.test";
  globalThis.fetch = async (url, options) => {
    emailRequest = { url, options };
    return { ok: true };
  };

  try {
    await sendPasswordResetEmail("user@example.test", "test-reset-token");
    assert.equal(emailRequest.url, "https://api.resend.com/emails");
    assert.match(
      JSON.parse(emailRequest.options.body).html,
      /https:\/\/frontend\.example\.test\/reset-password\?token=test-reset-token/,
    );
  } finally {
    globalThis.fetch = savedFetch;
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
