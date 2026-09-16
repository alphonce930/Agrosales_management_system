import express from 'express';
import { query, getConnection } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const unitMultipliers = { single: 1, dozen: 12 };

const parseMoneyToCents = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Payment amounts must have no more than two decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
};

const centsToDecimal = (cents) => `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;

// This is deliberately server-side: the browser preview is helpful, but never
// trusted for price or stock calculations.
const calculateSale = (product, quantity, unit) => {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Each sale quantity must be a whole number greater than zero.');
  if (!['single', 'dozen', 'box'].includes(unit)) throw new Error('Selling unit must be single, dozen, or box.');

  const piecesPerBox = Number(product.pieces_per_box);
  const multiplier = unit === 'box'
    ? (Number.isInteger(piecesPerBox) && piecesPerBox > 0 ? piecesPerBox : null)
    : unitMultipliers[unit];
  if (!multiplier) throw new Error(`Product ${product.id} needs a valid pieces-per-box value before it can be sold by box.`);

  const baseQuantity = quantity * multiplier;
  if (!Number.isSafeInteger(baseQuantity)) throw new Error('Sale quantity is too large.');
  const unitPriceCents = parseMoneyToCents(product.selling_price);
  return {
    quantity,
    unit,
    baseQuantity,
    unitPrice: centsToDecimal(unitPriceCents),
    subtotal: centsToDecimal(BigInt(baseQuantity) * unitPriceCents),
    subtotalCents: BigInt(baseQuantity) * unitPriceCents
  };
};

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

    if (req.user.role === 'staff') {
      const [customers] = await connection.query(
        'SELECT id FROM customers WHERE id = ? AND created_by = ?',
        [customer_id, req.user.id]
      );
      if (!customers.length) throw new Error('You can only create sales for your own customers.');
    }

    const requestedItems = new Map();
    for (const item of products) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Each sale product and quantity must be valid.');
      }
      const unit = item.unit || 'single';
      if (!['single', 'dozen', 'box'].includes(unit)) throw new Error('Selling unit must be single, dozen, or box.');
      const productItems = requestedItems.get(productId) || [];
      productItems.push({ quantity, unit });
      requestedItems.set(productId, productItems);
    }

    const saleItems = [];
    let totalAmountCents = 0n;
    for (const [productId, requestedProductItems] of requestedItems) {
      const productRows = await connection.query('SELECT id, quantity, selling_price, pieces_per_box FROM products WHERE id = ? FOR UPDATE', [productId]);
      const product = productRows[0][0];
      if (!product) throw new Error('Product not found.');
      const calculatedItems = requestedProductItems.map((item) => calculateSale(product, item.quantity, item.unit));
      const baseQuantity = calculatedItems.reduce((sum, item) => sum + item.baseQuantity, 0);
      if (Number(product.quantity) < baseQuantity) throw new Error(`Insufficient stock for product ${product.id}.`);
      calculatedItems.forEach((item) => {
        totalAmountCents += item.subtotalCents;
        saleItems.push({ product, ...item });
      });
    }

    const totalAmount = centsToDecimal(totalAmountCents);

    const paymentType = payment_type || 'cash';
    if (!['cash', 'lending'].includes(paymentType)) throw new Error('Payment type must be cash or lending.');
    const enteredAmountCents = parseMoneyToCents(amount_paid);
    const paidAmountCents = paymentType === 'cash' && enteredAmountCents === 0n ? totalAmountCents : enteredAmountCents;
    if (paidAmountCents > totalAmountCents) throw new Error('Payment amount must be between zero and the sale total.');
    const balanceCents = totalAmountCents - paidAmountCents;
    const paidAmount = centsToDecimal(paidAmountCents);
    const balance = centsToDecimal(balanceCents);
    const status = paymentType === 'cash' ? 'paid' : (balanceCents === 0n ? 'paid' : (paidAmountCents === 0n ? 'unpaid' : 'partially_paid'));

    const saleNumber = `SALE-${Date.now()}`;
    const saleResult = await connection.query(
      'INSERT INTO sales (sale_number, customer_id, staff_id, total_amount, amount_paid, balance, payment_type, status, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [saleNumber, customer_id, req.user.id, totalAmount, paidAmount, balance, paymentType, status]
    );

    const saleId = saleResult[0].insertId;

    for (const item of saleItems) {
      await connection.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit, base_quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [saleId, item.product.id, item.quantity, item.unit, item.baseQuantity, item.unitPrice, item.subtotal]
      );
      await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.baseQuantity, item.product.id]);
    }

    if (paidAmountCents > 0n) {
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
