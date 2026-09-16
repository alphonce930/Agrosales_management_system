import express from 'express';
import { query } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('admin', 'staff'));

const scope = (req) => req.user.role === 'staff' ? ' WHERE s.staff_id = ?' : '';
const scopeParams = (req) => req.user.role === 'staff' ? [req.user.id] : [];

router.get('/dashboard', async (req, res) => {
  const where = scope(req);
  const params = scopeParams(req);
  const [totals, monthly, products, payments, debt, staffPerformance] = await Promise.all([
    query(`SELECT COUNT(*) AS total_sales, COALESCE(SUM(s.total_amount), 0) AS total_sales_value, COALESCE(SUM(CASE WHEN s.payment_type = 'cash' THEN s.total_amount ELSE 0 END), 0) AS total_cash_sales, COALESCE(SUM(CASE WHEN s.payment_type = 'lending' THEN s.total_amount ELSE 0 END), 0) AS total_lending, COALESCE(SUM(s.balance), 0) AS outstanding_debt, COALESCE(SUM(s.amount_paid), 0) AS total_payments FROM sales s${where}`, params),
    query(`SELECT DATE_FORMAT(s.sale_date, '%b') AS name, COALESCE(SUM(s.total_amount), 0) AS value FROM sales s${where} GROUP BY YEAR(s.sale_date), MONTH(s.sale_date), DATE_FORMAT(s.sale_date, '%b') ORDER BY YEAR(s.sale_date), MONTH(s.sale_date)`, params),
    query(`SELECT p.name, COALESCE(SUM(COALESCE(si.base_quantity, si.quantity)), 0) AS sales FROM sale_items si JOIN products p ON p.id = si.product_id JOIN sales s ON s.id = si.sale_id${where} GROUP BY p.id, p.name ORDER BY sales DESC LIMIT 6`, params),
    query(`SELECT s.payment_type AS name, COUNT(*) AS value FROM sales s${where} GROUP BY s.payment_type`, params),
    query(`SELECT DATE_FORMAT(s.sale_date, '%b') AS name, COALESCE(SUM(s.total_amount), 0) AS total, COALESCE(SUM(s.amount_paid), 0) AS paid, COALESCE(SUM(s.balance), 0) AS outstanding FROM sales s WHERE s.payment_type = 'lending'${req.user.role === 'staff' ? ' AND s.staff_id = ?' : ''} GROUP BY YEAR(s.sale_date), MONTH(s.sale_date), DATE_FORMAT(s.sale_date, '%b') ORDER BY YEAR(s.sale_date), MONTH(s.sale_date)`, params),
    req.user.role === 'admin'
      ? query(`SELECT u.full_name AS name, COALESCE(SUM(s.total_amount), 0) AS sales FROM sales s JOIN users u ON u.id = s.staff_id GROUP BY u.id, u.full_name ORDER BY sales DESC LIMIT 6`)
      : Promise.resolve([])
  ]);

  const userCounts = req.user.role === 'admin'
    ? await query("SELECT COUNT(*) AS total_staff, SUM(status = 'verified') AS verified_staff, SUM(status = 'pending') AS pending_staff FROM users WHERE role = 'staff'")
    : [{ total_staff: 0, verified_staff: 0, pending_staff: 0 }];
  const productCount = await query('SELECT COUNT(*) AS total_products FROM products');
  const customerCount = await query(
    `SELECT COUNT(*) AS total_customers FROM customers${req.user.role === 'staff' ? ' WHERE created_by = ?' : ''}`,
    req.user.role === 'staff' ? [req.user.id] : []
  );

  return res.json({
    totals: { ...totals[0], ...userCounts[0], ...productCount[0], ...customerCount[0] },
    monthly: monthly.map((item) => ({ ...item, value: Number(item.value) })),
    products: products.map((item) => ({ ...item, sales: Number(item.sales) })),
    payments: payments.map((item) => ({ ...item, value: Number(item.value) })),
    debt: debt.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, key === 'name' ? value : Number(value)]))),
    staffPerformance: staffPerformance.map((item) => ({ ...item, sales: Number(item.sales) }))
  });
});

export default router;
