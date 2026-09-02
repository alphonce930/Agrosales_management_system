import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => bcrypt.hash(password, 10);
export const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'golden-agro-secret', { expiresIn: '7d' });

export const formatError = (message, status = 400) => ({
  success: false,
  message,
  status
});

export const generateNumber = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
