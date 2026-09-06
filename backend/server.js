
import app from './app.js';
import dotenv from 'dotenv';
import { initializeDatabase, query } from './config/db.js';
import { hashPassword } from './utils/helpers.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const ensureColumn = async (table, column, definition) => {
  const rows = await query(
    `SELECT COUNT(*) AS column_count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );

  if (!Number(rows[0]?.column_count)) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`Added ${table}.${column} for database compatibility.`);
  }
};

const ensureIndex = async (table, index, columns) => {
  const rows = await query(
    `SELECT COUNT(*) AS index_count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, index]
  );

  if (!Number(rows[0]?.index_count)) {
    await query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` (${columns})`);
    console.log(`Added ${index} index for database compatibility.`);
  }
};

const seedAdmin = async () => {
  const rows = await query(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
    ['admin', 'admin@goldenagro.com']
  );

  if (rows.length > 0) {
    console.log('Admin account already exists. Skipping admin creation.');
    return;
  }

  const passwordHash = await hashPassword('Admin@123');

  await query(
    `INSERT INTO users
      (full_name, username, email, phone, location, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'System Administrator',
      'admin',
      'admin@goldenagro.com',
      '+255700000001',
      'Dar es Salaam',
      passwordHash,
      'admin',
      'verified'
    ]
  );

  console.log('Admin account created successfully.');
};

const seedSuperAdmin = async () => {
  const rows = await query(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    ['superadmin', 'superadmin@goldenagro.com']
  );

  if (rows.length > 0) return;

  const passwordHash = await hashPassword('SuperAdmin@123');
  await query(
    `INSERT INTO users
      (full_name, username, email, phone, location, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Super Administrator',
      'superadmin',
      'superadmin@goldenagro.com',
      '+255700000000',
      'Dar es Salaam',
      passwordHash,
      'super_admin',
      'verified'
    ]
  );
  console.log('Super admin account created successfully.');
};

const bootstrap = async () => {
  try {
    const databaseReady = await initializeDatabase();
    if (databaseReady || process.env.ALLOW_MEMORY_DB === 'true') {
      // Existing installations may predate Google sign-in support. Add these
      // columns before auth middleware can select them.
      await ensureColumn('users', 'google_id', 'VARCHAR(255) NULL UNIQUE AFTER password');
      await ensureColumn('users', 'profile_picture', 'TEXT NULL AFTER google_id');
      await ensureColumn('users', 'auth_provider', "ENUM('local','google') NOT NULL DEFAULT 'local' AFTER profile_picture");
      await query("ALTER TABLE users MODIFY role ENUM('super_admin','admin','staff') NOT NULL DEFAULT 'staff'");
      await ensureColumn('customers', 'initial_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_type');
      await ensureColumn('customers', 'created_by', 'INT NULL AFTER notes');
      await ensureIndex('customers', 'idx_customers_created_by', '`created_by`');
      await ensureColumn('receipts', 'notes', 'TEXT NULL AFTER staff_id');
      await query(`
        UPDATE customers c
        SET created_by = (
          SELECT log.user_id
          FROM activity_logs log
          WHERE log.entity_type = 'customer' AND log.entity_id = c.id AND log.user_id IS NOT NULL
          ORDER BY log.created_at ASC
          LIMIT 1
        )
        WHERE c.created_by IS NULL
      `);
      await seedSuperAdmin();
      await seedAdmin();
    } else {
      console.warn('Starting without a database. API requests will return 503 until MySQL is available.');
    }

    app.listen(PORT, () => {
      console.log(`Golden Agrochemicals backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

bootstrap();


