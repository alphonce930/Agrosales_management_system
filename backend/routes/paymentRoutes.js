import express from 'express';
import { query, getConnection } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';
import { reserveIdempotencyKey, completeIdempotencyKey, abandonIdempotencyKey } from "../services/idempotency.js";

const router = express.Router();
router.use(protect);

const ensureReceiptForSale = async ({ saleId, customerId, staffId, receiptNumber }) => {
  const existing = await query('SELECT id FROM receipts WHERE sale_id = ? LIMIT 1', [saleId]);
  if (existing.length) return existing[0];

  const result = await query(
    'INSERT INTO receipts (receipt_number, sale_id, customer_id, staff_id) VALUES (?, ?, ?, ?)',
    [receiptNumber, saleId, customerId, staffId]
  );

  return { id: result.insertId };
};

router.get('/', async (req, res) => {
  const staffScope = req.user.role === 'staff' ? 'WHERE p.staff_id = ?' : '';
  const payments = await query(`
    SELECT p.*, c.full_name AS customer_name, u.full_name AS staff_name
    FROM payments p
    JOIN customers c ON c.id = p.customer_id
    JOIN users u ON u.id = p.staff_id
    ${staffScope}
    ORDER BY p.created_at DESC
  `, req.user.role === 'staff' ? [req.user.id] : []);
  return res.json(payments);
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  let connection;
  let transactionStarted = false;
  let idempotencyReservation;
  try {
    const { customer_id, sale_id, amount, payment_method, notes } = req.body;
    if (!customer_id || !sale_id || !amount) {
      return res.status(400).json({ message: 'Customer, sale, and amount are required.' });
    }

    idempotencyReservation = await reserveIdempotencyKey('payment', req.user.id, req.get('Idempotency-Key'));
    if (idempotencyReservation.response) return res.status(200).json(idempotencyReservation.response);
    if (idempotencyReservation.processing) return res.status(409).json({ message: 'This payment is already being processed.' });

    connection = await getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [sales] = await connection.query(
      `SELECT * FROM sales WHERE id = ?${req.user.role === 'staff' ? ' AND staff_id = ?' : ''} FOR UPDATE`,
      req.user.role === 'staff' ? [sale_id, req.user.id] : [sale_id]
    );
    if (!sales.length) {
      return res.status(404).json({ message: 'Sale not found.' });
    }

    const sale = sales[0];
    if (Number(sale.customer_id) !== Number(customer_id)) {
      return res.status(400).json({ message: 'The selected sale does not belong to this customer.' });
    }
    if (Number(amount) > Number(sale.balance)) {
      return res.status(400).json({ message: 'Payment cannot exceed outstanding balance.' });
    }

    const [paymentResult] = await connection.query(
      'INSERT INTO payments (payment_number, customer_id, sale_id, amount, payment_method, staff_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PAY-' + Date.now(), customer_id, sale_id, Number(amount), payment_method || 'cash', req.user.id, notes || '']
    );

    const newBalance = Number(sale.balance) - Number(amount);
    const nextStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    await connection.query('UPDATE sales SET amount_paid = amount_paid + ?, balance = ?, status = ? WHERE id = ?', [Number(amount), newBalance, nextStatus, sale_id]);

    const receiptNumber = `RCT-${Date.now()}`;
    const [existingReceipts] = await connection.query('SELECT id FROM receipts WHERE sale_id = ? LIMIT 1', [sale_id]);
    if (!existingReceipts.length) await connection.query('INSERT INTO receipts (receipt_number, sale_id, customer_id, staff_id) VALUES (?, ?, ?, ?)', [receiptNumber, sale_id, customer_id, req.user.id]);

    await connection.query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Payment recorded', 'payment', paymentResult.insertId, `Payment of ${amount} recorded`]);
    await connection.commit();
    transactionStarted = false;

    const response = { message: 'Payment recorded successfully.' };
    await completeIdempotencyKey(idempotencyReservation, response);
    return res.status(201).json(response);
  } catch (error) {
    if (connection && transactionStarted) await connection.rollback();
    await abandonIdempotencyKey(idempotencyReservation).catch(() => {});
    return res.status(error.status || (error.code === 'DB_UNAVAILABLE' ? 503 : 400)).json({ message: error.message || 'Payment failed.' });
  } finally {
    connection?.release();
  }
});

export default router;
