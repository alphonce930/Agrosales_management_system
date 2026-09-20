import express from "express";
import { query } from "../config/db.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const staffScope =
      req.user.role === "staff" ? "WHERE c.created_by = ?" : "";
    const customers = await query(
      `
      SELECT c.*, COALESCE(creator.full_name, 'Unassigned') AS created_by_name,
        c.initial_amount + COALESCE(sales_balance.balance, 0) AS balance
      FROM customers c
      LEFT JOIN users creator ON creator.id = c.created_by
      LEFT JOIN (
        SELECT customer_id, SUM(balance) AS balance
        FROM sales
        GROUP BY customer_id
      ) AS sales_balance ON sales_balance.customer_id = c.id
      ${staffScope}
      ORDER BY c.created_at DESC
    `,
      req.user.role === "staff" ? [req.user.id] : [],
    );
    return res.json(customers);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch customers." });
  }
});

router.post("/", authorize("admin", "staff"), async (req, res) => {
  try {
    const {
      full_name,
      phone,
      alternative_phone,
      email,
      location,
      address,
      customer_type,
      initial_amount,
      notes,
    } = req.body;
    if (!full_name || !phone || !location || Number(initial_amount ?? 0) < 0) {
      return res
        .status(400)
        .json({ message: "Full name, phone, and location are required." });
    }

    const customerCode = `CUST-${Date.now()}`;
    const result = await query(
      "INSERT INTO customers (customer_code, full_name, phone, alternative_phone, email, location, address, customer_type, initial_amount, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        customerCode,
        full_name,
        phone,
        alternative_phone || "",
        email || "",
        location,
        address || "",
        customer_type || "individual",
        Number(initial_amount ?? 0),
        notes || "",
        req.user.id,
      ],
    );

    await query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "Customer added",
        "customer",
        result.insertId,
        `Customer ${full_name} added`,
      ],
    );

    const createdCustomers = await query(
      `
      SELECT c.*, COALESCE(creator.full_name, 'Unassigned') AS created_by_name,
        c.initial_amount + COALESCE(sales_balance.balance, 0) AS balance
      FROM customers c
      LEFT JOIN users creator ON creator.id = c.created_by
      LEFT JOIN (
        SELECT customer_id, SUM(balance) AS balance
        FROM sales
        GROUP BY customer_id
      ) AS sales_balance ON sales_balance.customer_id = c.id
      WHERE c.id = ?
    `,
      [result.insertId],
    );

    return res
      .status(201)
      .json({
        message: "Customer created successfully.",
        customer: createdCustomers[0],
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Customer creation failed." });
  }
});

router.get("/:id", async (req, res) => {
  const customers = await query(
    `SELECT * FROM customers WHERE id = ?${req.user.role === "staff" ? " AND created_by = ?" : ""}`,
    req.user.role === "staff" ? [req.params.id, req.user.id] : [req.params.id],
  );
  if (!customers.length)
    return res.status(404).json({ message: "Customer not found." });
  return res.json(customers[0]);
});

router.put("/:id", authorize("admin", "staff"), async (req, res) => {
  const {
    full_name,
    phone,
    alternative_phone,
    email,
    location,
    address,
    customer_type,
    notes,
  } = req.body;
  await query(
    `UPDATE customers SET full_name = ?, phone = ?, alternative_phone = ?, email = ?, location = ?, address = ?, customer_type = ?, notes = ? WHERE id = ?${req.user.role === "staff" ? " AND created_by = ?" : ""}`,
    req.user.role === "staff"
      ? [
          full_name,
          phone,
          alternative_phone || "",
          email || "",
          location,
          address || "",
          customer_type || "individual",
          notes || "",
          req.params.id,
          req.user.id,
        ]
      : [
          full_name,
          phone,
          alternative_phone || "",
          email || "",
          location,
          address || "",
          customer_type || "individual",
          notes || "",
          req.params.id,
        ],
  );
  return res.json({ message: "Customer updated successfully." });
});

router.delete("/:id", authorize("admin", "staff"), async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res
        .status(400)
        .json({ message: "A valid customer ID is required." });
    }

    const customers = await query(
      `SELECT id FROM customers WHERE id = ?${req.user.role === "staff" ? " AND created_by = ?" : ""}`,
      req.user.role === "staff" ? [customerId, req.user.id] : [customerId],
    );
    if (!customers.length)
      return res.status(404).json({ message: "Customer not found." });

    const sales = await query(
      "SELECT COUNT(*) AS sale_count FROM sales WHERE customer_id = ?",
      [customerId],
    );
    if (Number(sales[0]?.sale_count || 0) > 0) {
      return res
        .status(409)
        .json({
          message:
            "This customer cannot be deleted because they have sales history.",
        });
    }

    await query("DELETE FROM customers WHERE id = ?", [customerId]);
    return res.json({ message: "Customer deleted successfully.", customerId });
  } catch (error) {
    if (error.code === "23503") {
      return res
        .status(409)
        .json({
          message:
            "This customer cannot be deleted because they are referenced by existing records.",
        });
    }
    return res
      .status(500)
      .json({ message: error.message || "Customer deletion failed." });
  }
});

export default router;
