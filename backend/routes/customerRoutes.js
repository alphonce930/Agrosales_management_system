import express from 'express';
import { query } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const customers = await query(`
      SELECT c.*, c.initial_amount + COALESCE(sales_balance.balance, 0) AS balance
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(balance) AS balance
        FROM sales
        GROUP BY customer_id
      ) AS sales_balance ON sales_balance.customer_id = c.id
      ORDER BY c.created_at DESC
    `);
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch customers.' });
  }
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    const { full_name, phone, alternative_phone, email, location, address, customer_type, initial_amount, notes } = req.body;
    if (!full_name || !phone || !location || Number(initial_amount ?? 0) < 0) {
      return res.status(400).json({ message: 'Full name, phone, and location are required.' });
    }

    const customerCode = `CUST-${Date.now()}`;
    const result = await query(
      'INSERT INTO customers (customer_code, full_name, phone, alternative_phone, email, location, address, customer_type, initial_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customerCode, full_name, phone, alternative_phone || '', email || '', location, address || '', customer_type || 'individual', Number(initial_amount ?? 0), notes || '']
    );

    await query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Customer added', 'customer', result.insertId, `Customer ${full_name} added`]);

    const createdCustomers = await query(`
      SELECT c.*, c.initial_amount + COALESCE(sales_balance.balance, 0) AS balance
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(balance) AS balance
        FROM sales
        GROUP BY customer_id
      ) AS sales_balance ON sales_balance.customer_id = c.id
      WHERE c.id = ?
    `, [result.insertId]);

    return res.status(201).json({ message: 'Customer created successfully.', customer: createdCustomers[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Customer creation failed.' });
  }
});

router.get('/:id', async (req, res) => {
  const customers = await query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customers.length) return res.status(404).json({ message: 'Customer not found.' });
  return res.json(customers[0]);
});

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  const { full_name, phone, alternative_phone, email, location, address, customer_type, notes } = req.body;
  await query(
    'UPDATE customers SET full_name = ?, phone = ?, alternative_phone = ?, email = ?, location = ?, address = ?, customer_type = ?, notes = ? WHERE id = ?',
    [full_name, phone, alternative_phone || '', email || '', location, address || '', customer_type || 'individual', notes || '', req.params.id]
  );
  return res.json({ message: 'Customer updated successfully.' });
});

router.delete('/:id', authorize('admin', 'staff'), async (req, res) => {
  await query('DELETE FROM customers WHERE id = ?', [req.params.id]);
  return res.json({ message: 'Customer deleted successfully.' });
});

export default router;
