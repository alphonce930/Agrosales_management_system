import express from 'express';
import { query } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const products = await query('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.created_at DESC');
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch products.' });
  }
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    const { product_code, name, description, category_id, unit, quantity, buying_price, selling_price, minimum_stock, status } = req.body;
    if (!product_code || !name || !selling_price) {
      return res.status(400).json({ message: 'Product code, name, and selling price are required.' });
    }

    const result = await query(
      'INSERT INTO products (product_code, name, description, category_id, unit, quantity, buying_price, selling_price, minimum_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [product_code, name, description || '', category_id || null, unit || 'kg', quantity || 0, Number(buying_price) || 0, Number(selling_price), Number(minimum_stock) || 0, status || 'active']
    );

    await query('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'Product added', 'product', result.insertId, `Product ${name} added`]);

    return res.status(201).json({ message: 'Product created successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Product creation failed.' });
  }
});

router.get('/:id', async (req, res) => {
  const products = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!products.length) return res.status(404).json({ message: 'Product not found.' });
  return res.json(products[0]);
});

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  const { name, description, category_id, unit, quantity, buying_price, selling_price, minimum_stock, status } = req.body;
  await query(
    'UPDATE products SET name = ?, description = ?, category_id = ?, unit = ?, quantity = ?, buying_price = ?, selling_price = ?, minimum_stock = ?, status = ? WHERE id = ?',
    [name, description || '', category_id || null, unit || 'kg', quantity || 0, Number(buying_price) || 0, Number(selling_price), Number(minimum_stock) || 0, status || 'active', req.params.id]
  );
  return res.json({ message: 'Product updated successfully.' });
});

router.delete('/:id', authorize('admin', 'staff'), async (req, res) => {
  await query('DELETE FROM products WHERE id = ?', [req.params.id]);
  return res.json({ message: 'Product deleted successfully.' });
});

export default router;
