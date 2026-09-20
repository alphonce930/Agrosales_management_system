import express from "express";
import { query } from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const staffScope = req.user.role === "staff" ? "WHERE r.staff_id = ?" : "";
  const receipts = await query(
    `
    SELECT
      r.*,
      s.sale_number,
      s.total_amount,
      s.amount_paid,
      s.balance,
      s.payment_type,
      (SELECT p.payment_number FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_number,
      (SELECT p.amount FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_amount,
      (SELECT p.payment_method FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_method,
      (SELECT p.payment_date FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_date,
      s.status AS sale_status,
      c.full_name AS customer_name,
      u.full_name AS staff_name
    FROM receipts r
    JOIN sales s ON s.id = r.sale_id
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.staff_id
    ${staffScope}
    ORDER BY r.issued_at DESC
  `,
    req.user.role === "staff" ? [req.user.id] : [],
  );
  return res.json(receipts);
});

router.post("/", async (req, res) => {
  try {
    const saleId = Number(req.body.sale_id);
    const notes = String(req.body.notes || "").trim();
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return res
        .status(400)
        .json({ message: "Select a sale before generating a receipt." });
    }

    const sales = await query(
      `SELECT id, customer_id, staff_id FROM sales WHERE id = ?${req.user.role === "staff" ? " AND staff_id = ?" : ""}`,
      req.user.role === "staff" ? [saleId, req.user.id] : [saleId],
    );
    if (!sales.length)
      return res.status(404).json({ message: "Sale not found." });

    const sale = sales[0];
    const existing = await query(
      "SELECT id FROM receipts WHERE sale_id = ? LIMIT 1",
      [sale.id],
    );
    let receiptId;
    if (existing.length) {
      receiptId = existing[0].id;
      if (notes)
        await query("UPDATE receipts SET notes = ? WHERE id = ?", [
          notes,
          receiptId,
        ]);
    } else {
      const receiptNumber = `RCT-${Date.now()}-${Math.floor(
        Math.random() * 10000,
      )
        .toString()
        .padStart(4, "0")}`;
      const result = await query(
        "INSERT INTO receipts (receipt_number, sale_id, customer_id, staff_id, notes) VALUES (?, ?, ?, ?, ?)",
        [receiptNumber, sale.id, sale.customer_id, req.user.id, notes],
      );
      receiptId = result.insertId;
    }

    const receipts = await query(
      `
      SELECT r.*, s.sale_number, s.total_amount, s.amount_paid, s.balance, s.payment_type,
        (SELECT p.payment_number FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_number,
        (SELECT p.amount FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_amount,
        (SELECT p.payment_method FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_method,
        (SELECT p.payment_date FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_date,
        s.status AS sale_status, c.full_name AS customer_name, u.full_name AS staff_name
      FROM receipts r
      JOIN sales s ON s.id = r.sale_id
      JOIN customers c ON c.id = r.customer_id
      JOIN users u ON u.id = r.staff_id
      WHERE r.id = ?
    `,
      [receiptId],
    );
    return res
      .status(existing.length ? 200 : 201)
      .json({
        message: "E-receipt generated successfully.",
        receipt: receipts[0],
      });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Receipt generation failed." });
  }
});

router.get("/:id", async (req, res) => {
  const staffScope = req.user.role === "staff" ? " AND r.staff_id = ?" : "";
  const receipts = await query(
    `
    SELECT
      r.*,
      s.sale_number,
      s.total_amount,
      s.amount_paid,
      s.balance,
      s.payment_type,
      (SELECT p.payment_number FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_number,
      (SELECT p.amount FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_amount,
      (SELECT p.payment_method FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_method,
      (SELECT p.payment_date FROM payments p WHERE p.sale_id = r.sale_id ORDER BY p.payment_date DESC, p.id DESC LIMIT 1) AS payment_date,
      s.status AS sale_status,
      c.full_name AS customer_name,
      u.full_name AS staff_name
    FROM receipts r
    JOIN sales s ON s.id = r.sale_id
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.staff_id
    WHERE r.id = ?${staffScope}
  `,
    req.user.role === "staff" ? [req.params.id, req.user.id] : [req.params.id],
  );
  if (!receipts.length)
    return res.status(404).json({ message: "Receipt not found." });
  return res.json(receipts[0]);
});

export default router;
