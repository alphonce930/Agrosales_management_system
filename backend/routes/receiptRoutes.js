import express from 'express';
import { query } from '../config/db.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const receipts = await query(`
    SELECT
      r.*,
      s.sale_number,
      s.total_amount,
      s.amount_paid,
      s.balance,
      s.payment_type,
      s.status AS sale_status,
      c.full_name AS customer_name,
      u.full_name AS staff_name
    FROM receipts r
    JOIN sales s ON s.id = r.sale_id
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.staff_id
    ORDER BY r.issued_at DESC
  `);
  return res.json(receipts);
});

router.get('/:id', async (req, res) => {
  const receipts = await query(`
    SELECT
      r.*,
      s.sale_number,
      s.total_amount,
      s.amount_paid,
      s.balance,
      s.payment_type,
      s.status AS sale_status,
      c.full_name AS customer_name,
      u.full_name AS staff_name
    FROM receipts r
    JOIN sales s ON s.id = r.sale_id
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.staff_id
    WHERE r.id = ?
  `, [req.params.id]);
  if (!receipts.length) return res.status(404).json({ message: 'Receipt not found.' });
  return res.json(receipts[0]);
});

export default router;
