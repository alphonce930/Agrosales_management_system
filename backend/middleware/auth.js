import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'golden-agro-secret');
    const users = await query('SELECT id, full_name, username, email, phone, location, role, status FROM users WHERE id = ?', [decoded.id]);

    if (!users.length) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const user = users[0];
    if (user.status !== 'verified') {
      return res.status(403).json({ message: 'Your account is not verified yet.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to access this resource.' });
  }

  next();
};
