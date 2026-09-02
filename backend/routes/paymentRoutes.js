import express from 'express';
import { query } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const payments = await query(`
    SELECT p.*, c.full_name AS customer_name, u.full_name AS staff_name
    FROM payments p
    JOIN customers c ON c.id = p.customer_id
    JOIN users u ON u.id = p.staff_id
    ORDER BY p.created_at DESC
  `);
  return res.json(payments);
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    const { customer_id, sale_id, amount, payment_method, notes } = req.body;
    if (!customer_id || !sale_id || !amount) {
      return res.status(400).json({ message: 'Customer, sale, and amount are required.' });
    }

    const sales = await query('SELECT * FROM sales WHERE id = ?', [sale_id]);
    if (!sales.length) {
      return res.status(404).json({ message: 'Sale not found.' });
    }

    const sale = sales[0];
    if (Number(amount) > Number(sale.balance)) {
      return res.status(400).json({ message: 'Payment cannot exceed outstanding balance.' });
    }

    const paymentResult = await query(
      'INSERT INTO payments (payment_number, customer_id, sale_id, amount, payment_method, staff_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PAY-' + Date.now(), customer_id, sale_id, Number(amount), payment_method || 'cash', req.user.id, notes || '']
    );

    const newBalance = Number(sale.balance) - Number(amount);
    const nextStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    await query('UPDATE sales SET amount_paid = amount_paid + ?, balance = ?, status = ? WHERE id = ?', [Number(amount), newBalance, nextStatus, sale_id]);

    await query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Payment recorded', 'payment', paymentResult.insertId, `Payment of ${amount} recorded`]);

    return res.status(201).json({ message: 'Payment recorded successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Payment failed.' });
  }
});

export default router;
