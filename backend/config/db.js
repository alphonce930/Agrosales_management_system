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

export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const getConnection = () => pool.getConnection();

export async function initializeDatabase() {
  const tables = [

    // 1. USERS
    `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50),
      location VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
      status ENUM('pending','verified','suspended') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_role (role),
      INDEX idx_users_status (status)
    )
    `,

    // 2. CATEGORIES
    `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,

    // 3. PRODUCTS
    `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category_id INT,
      unit VARCHAR(50) DEFAULT 'kg',
      quantity INT NOT NULL DEFAULT 0,
      buying_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      minimum_stock INT NOT NULL DEFAULT 0,
      status ENUM('active','out_of_stock','inactive')
        NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

      INDEX idx_products_category (category_id),
      INDEX idx_products_status (status)
    )
    `,

    // 4. CUSTOMERS
    `
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_code VARCHAR(100) NOT NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      alternative_phone VARCHAR(50),
      email VARCHAR(255),
      location VARCHAR(255),
      address TEXT,
      customer_type ENUM(
        'individual',
        'farmer',
        'business',
        'institution'
      ) NOT NULL DEFAULT 'individual',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_customers_name (full_name),
      INDEX idx_customers_phone (phone)
    )
    `,

    // 5. SALES
    `
    CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_number VARCHAR(100) NOT NULL UNIQUE,
      customer_id INT NOT NULL,
      staff_id INT NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
      balance DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_type ENUM('cash','lending') NOT NULL,
      status ENUM(
        'paid',
        'partially_paid',
        'unpaid'
      ) NOT NULL DEFAULT 'paid',
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

      FOREIGN KEY (staff_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

      INDEX idx_sales_customer (customer_id),
      INDEX idx_sales_staff (staff_id),
      INDEX idx_sales_date (sale_date)
    )
    `,

    // 6. SALE ITEMS
    `
    CREATE TABLE IF NOT EXISTS sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,

      FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE,

      FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT,

      INDEX idx_sale_items_sale (sale_id),
      INDEX idx_sale_items_product (product_id)
    )
    `,

    // 7. PAYMENTS
    `
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payment_number VARCHAR(100) NOT NULL UNIQUE,
      customer_id INT NOT NULL,
      sale_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method ENUM(
        'cash',
        'mobile_money',
        'bank'
      ) NOT NULL,
      staff_id INT NOT NULL,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

      FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE RESTRICT,

      FOREIGN KEY (staff_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

      INDEX idx_payments_customer (customer_id),
      INDEX idx_payments_sale (sale_id)
    )
    `,

    // 8. RECEIPTS
    `
    CREATE TABLE IF NOT EXISTS receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receipt_number VARCHAR(100) NOT NULL UNIQUE,
      sale_id INT NOT NULL,
      customer_id INT NOT NULL,
      staff_id INT NOT NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE RESTRICT,

      FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

      FOREIGN KEY (staff_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

      INDEX idx_receipts_sale (sale_id),
      INDEX idx_receipts_customer (customer_id)
    )
    `,

    // 9. ACTIVITY LOGS
    `
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100),
      entity_id INT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

      INDEX idx_activity_logs_user (user_id)
    )
    `
  ];

  try {
    for (let i = 0; i < tables.length; i++) {
      await pool.query(tables[i]);
      console.log(`Table ${i + 1} created/verified successfully`);
    }

    console.log('Database initialized successfully');

    return true;

  } catch (error) {
    console.error(
      'Database initialization failed:',
      error.message
    );

    throw error;
  }
}

export default pool;