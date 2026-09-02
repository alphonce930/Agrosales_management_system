import express from 'express';
import { query } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.use(authorize('admin'));

router.get('/staff', async (req, res) => {
  const users = await query('SELECT * FROM users ORDER BY created_at DESC');
  return res.json(users);
});

router.put('/staff/:id/verify', async (req, res) => {
  await query('UPDATE users SET status = ? WHERE id = ?', ['verified', req.params.id]);
  await query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Staff verified', 'user', req.params.id, 'Staff account verified']);
  return res.json({ message: 'Staff verified successfully.' });
});

router.put('/staff/:id/suspend', async (req, res) => {
  await query('UPDATE users SET status = ? WHERE id = ?', ['suspended', req.params.id]);
  return res.json({ message: 'Staff suspended successfully.' });
});

router.get('/dashboard', async (req, res) => {
  const totals = await query(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role='staff') AS total_staff,
      (SELECT COUNT(*) FROM users WHERE role='staff' AND status='verified') AS verified_staff,
      (SELECT COUNT(*) FROM users WHERE role='staff' AND status='pending') AS pending_staff,
      (SELECT COUNT(*) FROM products) AS total_products,
      (SELECT COUNT(*) FROM customers) AS total_customers,
      (SELECT COALESCE(SUM(total_amount),0) FROM sales) AS total_sales,
      (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE payment_type='cash') AS total_cash_sales,
      (SELECT COALESCE(SUM(balance),0) FROM sales WHERE payment_type='lending') AS total_lending,
      (SELECT COALESCE(SUM(amount),0) FROM payments) AS total_payments,
      (SELECT COALESCE(SUM(balance),0) FROM sales WHERE balance > 0) AS outstanding_debt
  `);
  return res.json(totals[0]);
});

router.get('/reports', async (req, res) => {
  const overview = await query(`
    SELECT 
      (SELECT COUNT(*) FROM sales) AS sales_count,
      (SELECT COALESCE(SUM(total_amount),0) FROM sales) AS total_sales_value,
      (SELECT COALESCE(SUM(CASE WHEN payment_type='cash' THEN total_amount ELSE 0 END),0) FROM sales) AS cash_sales,
      (SELECT COALESCE(SUM(CASE WHEN payment_type='lending' THEN total_amount ELSE 0 END),0) FROM sales) AS lending_sales,
      (SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount_paid ELSE 0 END),0) FROM sales) AS paid_lending
  `);
  return res.json(overview[0]);
});

export default router;
