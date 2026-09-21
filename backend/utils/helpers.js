import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { durationToSeconds } from "./duration.js";

export const hashPassword = async (password) => bcrypt.hash(password, 10);
export const comparePassword = async (password, hash) =>
  bcrypt.compare(password, hash);

export const getAccessSecret = () =>
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

export const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

export const getAccessExpiresIn = () =>
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";

export const getRefreshExpiresIn = () =>
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const getRefreshTtlSeconds = () =>
  durationToSeconds(getRefreshExpiresIn(), 7 * 24 * 60 * 60);

export const signAccessToken = (payload) =>
  jwt.sign({ ...payload, typ: "access" }, getAccessSecret(), {
    algorithm: "HS256",
    expiresIn: getAccessExpiresIn(),
  });

export const signRefreshToken = (payload) =>
  jwt.sign({ ...payload, typ: "refresh" }, getRefreshSecret(), {
    algorithm: "HS256",
    expiresIn: getRefreshExpiresIn(),
  });

export const signToken = (payload) => signAccessToken(payload);

export const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, getAccessSecret(), {
    algorithms: ["HS256"],
  });
  if (decoded.typ && decoded.typ !== "access") {
    throw new Error("Invalid session.");
  }
  return decoded;
};

export const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, getRefreshSecret(), {
    algorithms: ["HS256"],
  });
  if (decoded.typ !== "refresh") {
    throw new Error("Invalid session.");
  }
  return decoded;
};

export const formatError = (message, status = 400) => ({
  success: false,
  message,
  status,
});

export const generateNumber = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
