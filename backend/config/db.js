import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'golden_agrochemicals',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 20,
  maxIdle: Number(process.env.DB_MAX_IDLE) || 10,
  idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS) || 60000,
  queueLimit: 0,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000
});

const allowMemoryFallback = process.env.ALLOW_MEMORY_DB === 'true';
let databaseUnavailableUntil = 0;
const databaseRetryDelay = Number(process.env.DB_RETRY_DELAY_MS) || 30000;

const isConnectionError = (error) => [
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'
].includes(error?.code);

const unavailableError = () => {
  const error = new Error('Database is unavailable. Check the database connection and try again.');
  error.code = 'DB_UNAVAILABLE';
  error.status = 503;
  return error;
};

const fallbackStore = {
  users: [],
  activityLogs: [],
  products: [],
  customers: []
};

export const ensureFallbackSeed = async () => {
  if (fallbackStore.users.length) return;

  const { hashPassword } = await import('../utils/helpers.js');
  fallbackStore.users = [{
    id: 1,
    full_name: 'Super Administrator',
    username: 'superadmin',
    email: 'superadmin@goldenagro.com',
    phone: '+255700000000',
    location: 'Dar es Salaam',
    password: await hashPassword('SuperAdmin@123'),
    role: 'super_admin',
    status: 'verified',
    created_at: new Date().toISOString()
  }, {
    id: 2,
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

  if (normalized.startsWith('SELECT id FROM users WHERE username = ?')) {
    return fallbackStore.users.filter((user) => user.username === params[0]);
  }

  if (normalized.startsWith('SELECT * FROM users WHERE google_id = ?')) {
    return fallbackStore.users.filter((user) => user.google_id === params[0]);
  }

  if (normalized.startsWith('SELECT * FROM users WHERE email = ?')) {
    return fallbackStore.users.filter((user) => user.email === params[0]);
  }

  if (normalized.startsWith('SELECT * FROM users WHERE email = ? OR username = ?')) {
    const search = params[0] || '';
    return fallbackStore.users.filter((user) => user.email === search || user.username === search);
  }

  if (normalized.startsWith('SELECT * FROM users WHERE id = ?')) {
    const id = Number(params[0]);
    return fallbackStore.users.filter((user) => user.id === id);
  }

  if (normalized.startsWith('SELECT id, full_name, username, email, phone, location, profile_picture, auth_provider, role, status FROM users WHERE id = ?')) {
    const id = Number(params[0]);
    return fallbackStore.users.filter((user) => user.id === id);
  }

  if (normalized.startsWith('SELECT * FROM users')) {
    return fallbackStore.users;
  }

  if (normalized.startsWith('INSERT INTO users')) {
    const isGoogleUser = normalized.includes('google_id');
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
      google_id: isGoogleUser ? params[8] : null,
      profile_picture: isGoogleUser ? params[9] : null,
      auth_provider: isGoogleUser ? params[10] : 'local',
      created_at: new Date().toISOString()
    };
    fallbackStore.users.push(newUser);
    return { insertId: newUser.id };
  }

  if (normalized.startsWith('UPDATE users SET role = ? AND status = ?') || normalized.startsWith('UPDATE users SET role = ?, status = ?')) {
    const user = fallbackStore.users.find((entry) => entry.id === Number(params[2]));
    if (user) {
      user.role = params[0];
      user.status = params[1];
    }
    return { affectedRows: user ? 1 : 0 };
  }

  if (normalized.startsWith('UPDATE users SET google_id = ?')) {
    const user = fallbackStore.users.find((entry) => entry.id === Number(params[4]));
    if (user) {
      user.google_id = params[0];
      user.profile_picture = params[1];
      user.auth_provider = params[2];
      user.status = params[3];
    }
    return { affectedRows: user ? 1 : 0 };
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

  if (normalized.startsWith('SELECT c.*, c.initial_amount + COALESCE')) {
    const customers = [...fallbackStore.customers].sort((first, second) => new Date(second.created_at) - new Date(first.created_at));
    if (normalized.includes('WHERE c.id = ?')) {
      return customers.filter((customer) => customer.id === Number(params[0]));
    }
    return customers;
  }

  if (normalized.startsWith('INSERT INTO customers')) {
    const customer = {
      id: fallbackStore.customers.length ? Math.max(...fallbackStore.customers.map((entry) => entry.id)) + 1 : 1,
      customer_code: params[0],
      full_name: params[1],
      phone: params[2],
      alternative_phone: params[3],
      email: params[4],
      location: params[5],
      address: params[6],
      customer_type: params[7],
      initial_amount: params[8],
      notes: params[9],
      balance: params[8],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    fallbackStore.customers.push(customer);
    return { insertId: customer.id };
  }

  if (normalized.startsWith('SELECT * FROM customers WHERE id = ?')) {
    return fallbackStore.customers.filter((customer) => customer.id === Number(params[0]));
  }

  if (normalized.startsWith('DELETE FROM customers WHERE id = ?')) {
    const id = Number(params[0]);
    const originalLength = fallbackStore.customers.length;
    fallbackStore.customers = fallbackStore.customers.filter((customer) => customer.id !== id);
    return { affectedRows: originalLength - fallbackStore.customers.length };
  }

  if (normalized.startsWith('SELECT p.*, c.name AS category_name FROM products p')) {
    return [...fallbackStore.products].sort((first, second) => new Date(second.created_at) - new Date(first.created_at));
  }

  if (normalized.startsWith('SELECT * FROM products WHERE id = ?')) {
    const id = Number(params[0]);
    return fallbackStore.products.filter((product) => product.id === id);
  }

  if (normalized.startsWith('INSERT INTO products')) {
    const product = {
      id: fallbackStore.products.length ? Math.max(...fallbackStore.products.map((entry) => entry.id)) + 1 : 1,
      product_code: params[0],
      name: params[1],
      description: params[2],
      category_id: params[3],
      unit: params[4],
      quantity: params[5],
      buying_price: params[6],
      selling_price: params[7],
      minimum_stock: params[8],
      status: params[9],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_name: null
    };
    fallbackStore.products.push(product);
    return { insertId: product.id };
  }

  if (normalized.startsWith('DELETE FROM products WHERE id = ?')) {
    const id = Number(params[0]);
    const originalLength = fallbackStore.products.length;
    fallbackStore.products = fallbackStore.products.filter((product) => product.id !== id);
    return { affectedRows: originalLength - fallbackStore.products.length };
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
  if (Date.now() < databaseUnavailableUntil) {
    if (allowMemoryFallback) return fallbackQuery(sql, params);
    throw unavailableError();
  }

  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    if (!isConnectionError(error)) throw error;
    databaseUnavailableUntil = Date.now() + databaseRetryDelay;
    console.warn(`Database connection unavailable; retrying in ${databaseRetryDelay / 1000} seconds.`);
    if (allowMemoryFallback) return fallbackQuery(sql, params);
    throw unavailableError();
  }
};

export const getConnection = async () => {
  if (Date.now() < databaseUnavailableUntil) throw unavailableError();
  try {
    return await pool.getConnection();
  } catch (error) {
    if (isConnectionError(error)) {
      databaseUnavailableUntil = Date.now() + databaseRetryDelay;
      throw unavailableError();
    }
    throw error;
  }
};

export async function initializeDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    if (!isConnectionError(error)) throw error;
    databaseUnavailableUntil = Date.now() + databaseRetryDelay;
    if (allowMemoryFallback) {
      console.warn('MySQL not available; using the configured in-memory development store. Data will not persist.');
      await ensureFallbackSeed();
      return false;
    }
    console.error('MySQL is not available. Configure DB_* variables and apply backend/database/schema.sql.');
    return false;
  }
}

export default pool;
