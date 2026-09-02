import express from 'express';
import { query, getConnection } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const sales = await query(`
    SELECT s.*, c.full_name AS customer_name, u.full_name AS staff_name
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = s.staff_id
    ORDER BY s.created_at DESC
  `);
  return res.json(sales);
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { customer_id, products, payment_type, amount_paid = 0, notes = '' } = req.body;
    if (!customer_id || !Array.isArray(products) || !products.length) {
      return res.status(400).json({ message: 'Customer and products are required.' });
    }

    let totalAmount = 0;
    for (const item of products) {
      const productRows = await connection.query('SELECT id, quantity, selling_price FROM products WHERE id = ?', [item.product_id]);
      const product = productRows[0][0];
      if (!product) throw new Error('Product not found.');
      if (product.quantity < item.quantity) throw new Error(`Insufficient stock for product ${product.id}.`);
      totalAmount += Number(item.quantity) * Number(product.selling_price);
    }

    const paymentType = payment_type || 'cash';
    const balance = totalAmount - Number(amount_paid);
    const status = paymentType === 'cash' ? 'paid' : (balance <= 0 ? 'paid' : 'partially_paid');

    const saleNumber = `SALE-${Date.now()}`;
    const saleResult = await connection.query(
      'INSERT INTO sales (sale_number, customer_id, staff_id, total_amount, amount_paid, balance, payment_type, status, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [saleNumber, customer_id, req.user.id, totalAmount, amount_paid, balance, paymentType, status]
    );

    const saleId = saleResult[0].insertId;

    for (const item of products) {
      const productRows = await connection.query('SELECT id, quantity, selling_price FROM products WHERE id = ?', [item.product_id]);
      const product = productRows[0][0];
      const subtotal = Number(item.quantity) * Number(product.selling_price);
      await connection.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.product_id, item.quantity, product.selling_price, subtotal]
      );
      await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    if (Number(amount_paid) > 0) {
      await connection.query(
        'INSERT INTO payments (payment_number, customer_id, sale_id, amount, payment_method, staff_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['PAY-' + Date.now(), customer_id, saleId, Number(amount_paid), 'cash', req.user.id, notes || '']
      );
    }

    const receiptNumber = `RCPT-${Date.now()}`;
    await connection.query(
      'INSERT INTO receipts (receipt_number, sale_id, customer_id, staff_id) VALUES (?, ?, ?, ?)',
      [receiptNumber, saleId, customer_id, req.user.id]
    );

    await connection.query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Sale created', 'sale', saleId, `Sale ${saleNumber} created`]);

    await connection.commit();
    return res.status(201).json({ message: 'Sale completed successfully.', saleId });
  } catch (error) {
    await connection.rollback();
    return res.status(400).json({ message: error.message || 'Sale failed.' });
  } finally {
    connection.release();
  }
});

router.get('/:id', async (req, res) => {
  const sales = await query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
  if (!sales.length) return res.status(404).json({ message: 'Sale not found.' });
  return res.json(sales[0]);
});

export default router;
