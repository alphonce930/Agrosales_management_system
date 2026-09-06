import express from 'express';
import { query } from '../config/db.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('super_admin'));

router.get('/users', async (req, res) => {
  const users = await query(
    'SELECT id, full_name, username, email, phone, location, role, status, auth_provider, created_at FROM users ORDER BY created_at DESC'
  );
  return res.json(users);
});

router.put('/users/:id', async (req, res) => {
  const { role, status } = req.body;
  const validRoles = ['super_admin', 'admin', 'staff'];
  const validStatuses = ['pending', 'verified', 'suspended'];

  if (!validRoles.includes(role) || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'A valid role and status are required.' });
  }

  if (Number(req.params.id) === req.user.id && (role !== 'super_admin' || status !== 'verified')) {
    return res.status(400).json({ message: 'You cannot remove or suspend your own super admin access.' });
  }

  const result = await query('UPDATE users SET role = ?, status = ? WHERE id = ?', [role, status, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'User not found.' });

  await query(
    'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, 'User account updated', 'user', req.params.id, `Role: ${role}; Status: ${status}`]
  );
  return res.json({ message: 'User account updated successfully.' });
});

export default router;