import express from 'express';
import { query, getConnection } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const ensureReceiptForSale = async (connection, { saleId, customerId, staffId, receiptNumber }) => {
  const [existing] = await connection.query('SELECT id FROM receipts WHERE sale_id = ? LIMIT 1', [saleId]);
  if (existing.length) return existing[0];

  const [result] = await connection.query(
    'INSERT INTO receipts (receipt_number, sale_id, customer_id, staff_id) VALUES (?, ?, ?, ?)',
    [receiptNumber, saleId, customerId, staffId]
  );

  return { id: result.insertId };
};

router.get('/', async (req, res) => {
  const staffScope = req.user.role === 'staff' ? 'WHERE s.staff_id = ?' : '';
  const sales = await query(`
    SELECT s.*, c.full_name AS customer_name, u.full_name AS staff_name
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = s.staff_id
    ${staffScope}
    ORDER BY s.created_at DESC
  `, req.user.role === 'staff' ? [req.user.id] : []);
  return res.json(sales);
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const { customer_id, products, payment_type, amount_paid = 0, notes = '' } = req.body;
    if (!customer_id || !Array.isArray(products) || !products.length) {
      return res.status(400).json({ message: 'Customer and products are required.' });
    }

    const saleItems = [];
    let totalAmount = 0;
    for (const item of products) {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Each product quantity must be greater than zero.');
      const productRows = await connection.query('SELECT id, quantity, selling_price FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
      const product = productRows[0][0];
      if (!product) throw new Error('Product not found.');
      if (Number(product.quantity) < quantity) throw new Error(`Insufficient stock for product ${product.id}.`);
      const subtotal = quantity * Number(product.selling_price);
      totalAmount += subtotal;
      saleItems.push({ product, quantity, subtotal });
    }

    const paymentType = payment_type || 'cash';
    const paidAmount = paymentType === 'cash' && Number(amount_paid) === 0 ? totalAmount : Number(amount_paid);
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > totalAmount) throw new Error('Payment amount must be between zero and the sale total.');
    const balance = totalAmount - paidAmount;
    const status = paymentType === 'cash' ? 'paid' : (balance <= 0 ? 'paid' : 'partially_paid');

    const saleNumber = `SALE-${Date.now()}`;
    const saleResult = await connection.query(
      'INSERT INTO sales (sale_number, customer_id, staff_id, total_amount, amount_paid, balance, payment_type, status, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [saleNumber, customer_id, req.user.id, totalAmount, paidAmount, balance, paymentType, status]
    );

    const saleId = saleResult[0].insertId;

    for (const item of saleItems) {
      await connection.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.product.id, item.quantity, item.product.selling_price, item.subtotal]
      );
      await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.product.id]);
    }

    if (paidAmount > 0) {
      await connection.query(
        'INSERT INTO payments (payment_number, customer_id, sale_id, amount, payment_method, staff_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['PAY-' + Date.now(), customer_id, saleId, paidAmount, 'cash', req.user.id, notes || '']
      );
    }

    const receiptNumber = `RCPT-${Date.now()}`;
    await ensureReceiptForSale(connection, {
      saleId,
      customerId: customer_id,
      staffId: req.user.id,
      receiptNumber
    });

    await connection.query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Sale created', 'sale', saleId, `Sale ${saleNumber} created`]);

    await connection.commit();
    return res.status(201).json({ message: 'Sale completed successfully.', saleId });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(error.status || 400).json({ message: error.message || 'Sale failed.' });
  } finally {
    connection?.release();
  }
});

router.get('/:id', async (req, res) => {
  const sales = await query(
    `SELECT * FROM sales WHERE id = ?${req.user.role === 'staff' ? ' AND staff_id = ?' : ''}`,
    req.user.role === 'staff' ? [req.params.id, req.user.id] : [req.params.id]
  );
  if (!sales.length) return res.status(404).json({ message: 'Sale not found.' });
  return res.json(sales[0]);
});

export default router;
