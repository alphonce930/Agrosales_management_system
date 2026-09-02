
import app from './app.js';
import dotenv from 'dotenv';
import { initializeDatabase, query } from './config/db.js';
import { hashPassword } from './utils/helpers.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

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

const bootstrap = async () => {
  try {
    await initializeDatabase();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(
        `Golden Agrochemicals backend running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

bootstrap();


