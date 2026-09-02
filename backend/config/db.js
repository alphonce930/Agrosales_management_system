import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'golden_agrochemicals',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const fallbackStore = {
  users: [],
  activityLogs: []
};

export const ensureFallbackSeed = async () => {
  if (fallbackStore.users.length) return;

  const { hashPassword } = await import('../utils/helpers.js');
  fallbackStore.users = [{
    id: 1,
    full_name: 'System Administrator',
    username: 'admin',
    email: 'admin@goldenagro.com',
    phone: '+255700000001',
    location: 'Dar es Salaam',
    password: await hashPassword('Admin@123'),
    role: 'admin',
    status: 'verified',
    created_at: new Date().toISOString()
  }];
  fallbackStore.activityLogs = [{
    id: 1,
    user_id: 1,
    action: 'System initialized',
    entity_type: 'system',
    details: 'Fallback memory store created',
    created_at: new Date().toISOString()
  }];
};

const fallbackQuery = async (sql, params = []) => {
  await ensureFallbackSeed();
  const normalized = sql.trim().replace(/\s+/g, ' ');

  if (normalized.startsWith('SELECT id, username, email FROM users WHERE username = ? OR email = ?') || normalized.startsWith('SELECT id FROM users WHERE email = ? OR username = ?')) {
    const search = params[0] || '';
    return fallbackStore.users.filter((user) => user.email === search || user.username === search);
  }

  if (normalized.startsWith('SELECT * FROM users WHERE email = ? OR username = ?')) {
    const search = params[0] || '';
    return fallbackStore.users.filter((user) => user.email === search || user.username === search);
  }

  if (normalized.startsWith('SELECT * FROM users WHERE id = ?')) {
    const id = Number(params[0]);
    return fallbackStore.users.filter((user) => user.id === id);
  }

  if (normalized.startsWith('SELECT * FROM users')) {
    return fallbackStore.users;
  }

  if (normalized.startsWith('INSERT INTO users')) {
    const newUser = {
      id: fallbackStore.users.length ? Math.max(...fallbackStore.users.map((u) => u.id)) + 1 : 1,
      full_name: params[0],
      username: params[1],
      email: params[2],
      phone: params[3],
      location: params[4],
      password: params[5],
      role: params[6],
      status: params[7],
      created_at: new Date().toISOString()
    };
    fallbackStore.users.push(newUser);
    return { insertId: newUser.id };
  }

  if (normalized.startsWith('INSERT INTO activity_logs')) {
    const newLog = {
      id: fallbackStore.activityLogs.length ? Math.max(...fallbackStore.activityLogs.map((l) => l.id)) + 1 : 1,
      user_id: params[0],
      action: params[1],
      entity_type: params[2],
      details: params[3],
      created_at: new Date().toISOString()
    };
    fallbackStore.activityLogs.push(newLog);
    return { insertId: newLog.id };
  }

  if (normalized.startsWith('UPDATE users SET status = ? WHERE id = ?')) {
    const status = params[0];
    const targetId = Number(params[1]);
    const user = fallbackStore.users.find((entry) => entry.id === targetId);
    if (user) user.status = status;
    return { affectedRows: user ? 1 : 0 };
  }

  return [];
};

export const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.warn('Database unavailable; using in-memory fallback for local development.', error.message);
    return fallbackQuery(sql, params);
  }
};

export const getConnection = () => pool.getConnection();

export async function initializeDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.warn('MySQL not available; continuing in local memory mode.', error.message);
    await ensureFallbackSeed();
    return false;
  }
}

export default pool;