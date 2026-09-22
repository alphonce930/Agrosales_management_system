import express from "express";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import { query } from "../config/db.js";
import {
  hashPassword,
  comparePassword,
  getRefreshTtlSeconds,
} from "../utils/helpers.js";
import { protect } from "../middleware/auth.js";
import { getClientIp } from "../utils/clientIp.js";
import {
  loginIpLimit,
  registerIpLimit,
  registerFailedLogin,
  clearFailedLoginLimit,
  resolveDeviceId,
  getDeviceCookieName,
} from "../middleware/loginRateLimit.js";
import {
  createSessionTokens,
  rotateSessionTokens,
  revokeSession,
  revokeUserSessions,
} from "../services/authSessions.js";

dotenv.config();

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const loginAttemptLimiter = loginIpLimit;
const registerAttemptLimiter = registerIpLimit;

const refreshCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-agro_refresh"
    : "agro_refresh";

const setDeviceCookie = (res, deviceId) =>
  res.cookie(getDeviceCookieName(), deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.REFRESH_COOKIE_SAME_SITE || "lax").toLowerCase(),
    path: "/",
    maxAge: 90 * 24 * 60 * 60 * 1000,
  });

const readDeviceCookie = (req) => {
  const value = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${getDeviceCookieName()}=`))
    ?.slice(getDeviceCookieName().length + 1);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const refreshCookieOptions = () => {
  const production = process.env.NODE_ENV === "production";
  const sameSite = (
    process.env.REFRESH_COOKIE_SAME_SITE || (production ? "none" : "lax")
  ).toLowerCase();
  return {
    httpOnly: true,
    secure: production || sameSite === "none",
    sameSite: ["lax", "strict", "none"].includes(sameSite) ? sameSite : "lax",
    path: "/",
    maxAge: getRefreshTtlSeconds() * 1000,
  };
};

const readCookie = (req, name) => {
  const value = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const setRefreshCookie = (res, refreshToken) =>
  res.cookie(refreshCookieName(), refreshToken, refreshCookieOptions());

const clearRefreshCookie = (res) =>
  res.clearCookie(refreshCookieName(), {
    ...refreshCookieOptions(),
    maxAge: undefined,
    expires: new Date(0),
  });

const clearDeviceCookie = (res) =>
  res.clearCookie(getDeviceCookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.REFRESH_COOKIE_SAME_SITE || "lax").toLowerCase(),
    path: "/",
    expires: new Date(0),
  });

const sendAuthenticated = (res, tokens, user) => {
  setRefreshCookie(res, tokens.refreshToken);
  // Refresh credentials deliberately never enter JavaScript/localStorage.
  return res.json(
    user
      ? { token: tokens.token, user: safeUser(user) }
      : { token: tokens.token },
  );
};

const issueTokens = (req, user, deviceId) =>
  createSessionTokens({
    user,
    deviceId,
    ip: getClientIp(req),
    userAgent: req.get("user-agent"),
  });

const safeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  username: user.username,
  email: user.email,
  phone: user.phone,
  location: user.location,
  profile_picture: user.profile_picture || null,
  auth_provider: user.auth_provider || "local",
  role: user.role,
  status: user.status,
  created_at: user.created_at,
});

const createUsername = async (email) => {
  const base =
    email
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 40) || "googleuser";
  let username = base;
  let suffix = 1;
  while (
    (await query("SELECT id FROM users WHERE username = ?", [username])).length
  ) {
    username = `${base}${suffix}`;
    suffix += 1;
  }
  return username;
};

router.post("/register", registerAttemptLimiter, async (req, res) => {
  try {
    const {
      full_name,
      username,
      email,
      phone,
      location,
      password,
      confirmPassword,
    } = req.body;

    if (!full_name || !username || !email || !phone || !location || !password) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[!@#$%^&*]/.test(password)
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const existing = await query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username],
    );
    if (existing.length) {
      return res
        .status(409)
        .json({ message: "User with this email or username already exists." });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO users (full_name, username, email, phone, location, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        full_name,
        username,
        email,
        phone,
        location,
        passwordHash,
        "staff",
        "pending",
      ],
    );

    await query(
      "INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)",
      [
        result.insertId,
        "Staff registered",
        "user",
        "New staff registration pending verification",
      ],
    );

    return res.status(201).json({
      message: "Registration successful. Awaiting admin verification.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Registration failed." });
  }
});

router.post("/login", loginAttemptLimiter, async (req, res) => {
  try {
    const deviceId = resolveDeviceId(req, res, { createIfMissing: true });
    const { email, password } = req.body;
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const identity = email.trim().toLowerCase();
    const users = await query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [identity, identity],
    );
    if (!users.length) {
      if (!(await registerFailedLogin(req, res, deviceId))) return;
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = users[0];
    if (user.status !== "verified") {
      return res.status(403).json({
        message:
          "Your account is pending or suspended. Please contact the admin.",
      });
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      if (!(await registerFailedLogin(req, res, deviceId))) return;
      return res.status(401).json({ message: "Invalid credentials." });
    }

    await clearFailedLoginLimit(identity, deviceId);
    const tokens = await issueTokens(req, user, deviceId);
    setDeviceCookie(res, deviceId);
    return sendAuthenticated(res, tokens, user);
  } catch (error) {
    if (error.status === 503) {
      return res.status(503).json({
        message:
          "Authentication is temporarily unavailable. Please try again shortly.",
      });
    }
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
});

router.post("/google", async (req, res) => {
  try {
    const deviceId = resolveDeviceId(req, res, { createIfMissing: true });
    const { credential } = req.body;
    if (
      typeof credential !== "string" ||
      credential.length > 10000 ||
      !process.env.GOOGLE_CLIENT_ID
    ) {
      return res
        .status(400)
        .json({ message: "Google authentication is not configured." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res
        .status(401)
        .json({ message: "Google account verification failed." });
    }

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();
    let users = await query("SELECT * FROM users WHERE google_id = ?", [
      googleId,
    ]);
    let user = users[0];

    if (!user) {
      users = await query("SELECT * FROM users WHERE email = ?", [email]);
      user = users[0];
    }

    if (user) {
      if (user.status !== "verified") {
        return res.status(403).json({
          message:
            "This account is pending or suspended. Please contact the admin.",
        });
      }

      await query(
        "UPDATE users SET google_id = ?, profile_picture = ?, auth_provider = ? WHERE id = ?",
        [
          googleId,
          payload.picture || user.profile_picture || null,
          "google",
          user.id,
        ],
      );
      user = {
        ...user,
        google_id: googleId,
        profile_picture: payload.picture || user.profile_picture || null,
        auth_provider: "google",
        status: "verified",
      };
    } else {
      const username = await createUsername(email);
      const passwordHash = await hashPassword(
        crypto.randomBytes(32).toString("hex"),
      );
      const result = await query(
        `INSERT INTO users
          (full_name, username, email, phone, location, password, role, status, google_id, profile_picture, auth_provider)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.name || email.split("@")[0],
          username,
          email,
          "",
          "",
          passwordHash,
          "staff",
          "verified",
          googleId,
          payload.picture || null,
          "google",
        ],
      );
      const created = await query("SELECT * FROM users WHERE id = ?", [
        result.insertId,
      ]);
      user = created[0] || {
        id: result.insertId,
        full_name: payload.name || email.split("@")[0],
        username,
        email,
        role: "staff",
        status: "verified",
        profile_picture: payload.picture || null,
        auth_provider: "google",
      };
      await query(
        "INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)",
        [
          user.id,
          "Google account created",
          "user",
          "Account created through Google authentication",
        ],
      );
    }

    const tokens = await issueTokens(req, user);
    return sendAuthenticated(res, tokens, user);
  } catch (error) {
    console.error("Google authentication failed:", error.message);
    if (error.status === 503) {
      return res.status(503).json({
        message:
          "Authentication is temporarily unavailable. Please try again shortly.",
      });
    }
    return res
      .status(401)
      .json({ message: "Google authentication failed. Please try again." });
  }
});

// A refresh request already requires a one-time, HttpOnly session credential.
// Do not count normal token refreshes against the login-attempt budget shared
// by users behind the same NAT/proxy.
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = readCookie(req, refreshCookieName());
    if (!refreshToken)
      return res.status(400).json({ message: "Refresh token is required." });
    const tokens = await rotateSessionTokens(refreshToken, {
      ip: getClientIp(req),
      userAgent: req.get("user-agent"),
    });
    const deviceId =
      readDeviceCookie(req) ||
      resolveDeviceId(req, res, { createIfMissing: true });
    if (deviceId) setDeviceCookie(res, deviceId);
    return sendAuthenticated(res, tokens);
  } catch (error) {
    return res.status(error.status || 401).json({
      message:
        error.status === 503
          ? "Authentication is temporarily unavailable."
          : "Your session has expired. Please sign in again.",
    });
  }
});

router.post("/logout", async (req, res) => {
  await revokeSession(readCookie(req, refreshCookieName()));
  clearRefreshCookie(res);
  clearDeviceCookie(res);
  return res.status(204).end();
});

router.post("/logout-all", protect, async (req, res) => {
  await revokeUserSessions(req.user.id);
  clearRefreshCookie(res);
  clearDeviceCookie(res);
  return res.status(204).end();
});

router.get("/me", protect, async (req, res) => {
  return res.json({ user: req.user });
});

router.put("/profile-picture", protect, async (req, res) => {
  const { profile_picture } = req.body;
  const imagePattern =
    /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

  if (
    typeof profile_picture !== "string" ||
    !imagePattern.test(profile_picture)
  ) {
    return res
      .status(400)
      .json({ message: "Please upload a valid JPG, PNG, WEBP, or GIF image." });
  }

  const encodedImage = profile_picture.split(",")[1];
  if (Buffer.byteLength(encodedImage, "base64") > 700 * 1024) {
    return res
      .status(400)
      .json({ message: "Profile picture must be smaller than 700 KB." });
  }

  await query("UPDATE users SET profile_picture = ? WHERE id = ?", [
    profile_picture,
    req.user.id,
  ]);
  return res.json({
    message: "Profile picture updated successfully.",
    user: { ...req.user, profile_picture },
  });
});

export default router;
