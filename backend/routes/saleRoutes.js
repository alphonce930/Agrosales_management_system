import express from "express";
import { query, getConnection } from "../config/db.js";
import { protect, authorize } from "../middleware/auth.js";
import { reserveIdempotencyKey, completeIdempotencyKey, abandonIdempotencyKey } from "../services/idempotency.js";

const router = express.Router();
router.use(protect);

const unitMultipliers = { single: 1, dozen: 12 };

const parseMoneyToCents = (value, label = "Amount") => {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error(
      `${label} must be a non-negative amount with no more than two decimal places.`,
    );
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
};

const centsToDecimal = (cents) =>
  `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;

// This is deliberately server-side: the browser preview is helpful, but never
// trusted for price or stock calculations.
const calculateSale = (product, quantity, unit) => {
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error(
      "Each sale quantity must be a whole number greater than zero.",
    );
  if (!["single", "dozen", "box"].includes(unit))
    throw new Error("Selling unit must be single, dozen, or box.");

  const piecesPerBox = Number(product.pieces_per_box);
  const multiplier =
    unit === "box"
      ? Number.isInteger(piecesPerBox) && piecesPerBox > 0
        ? piecesPerBox
        : null
      : unitMultipliers[unit];
  if (!multiplier)
    throw new Error(
      `Product ${product.id} needs a valid pieces-per-box value before it can be sold by box.`,
    );

  const baseQuantity = quantity * multiplier;
  if (!Number.isSafeInteger(baseQuantity))
    throw new Error("Sale quantity is too large.");
  const unitPriceCents = parseMoneyToCents(
    product.selling_price,
    "Product price",
  );
  if (unitPriceCents <= 0n)
    throw new Error(`Product ${product.id} has an invalid selling price.`);
  return {
    quantity,
    unit,
    baseQuantity,
    unitPrice: centsToDecimal(unitPriceCents),
    subtotal: centsToDecimal(BigInt(baseQuantity) * unitPriceCents),
    subtotalCents: BigInt(baseQuantity) * unitPriceCents,
  };
};

const ensureReceiptForSale = async (
  connection,
  { saleId, customerId, staffId, receiptNumber },
) => {
  const [existing] = await connection.query(
    "SELECT id FROM receipts WHERE sale_id = ? LIMIT 1",
    [saleId],
  );
  if (existing.length) return existing[0];

  const [result] = await connection.query(
    "INSERT INTO receipts (receipt_number, sale_id, customer_id, staff_id) VALUES (?, ?, ?, ?)",
    [receiptNumber, saleId, customerId, staffId],
  );

  return { id: result.insertId };
};

router.get("/", async (req, res) => {
  const staffScope = req.user.role === "staff" ? "WHERE s.staff_id = ?" : "";
  const sales = await query(
    `
    SELECT s.*, c.full_name AS customer_name, u.full_name AS staff_name
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = s.staff_id
    ${staffScope}
    ORDER BY s.created_at DESC
  `,
    req.user.role === "staff" ? [req.user.id] : [],
  );
  return res.json(sales);
});

router.post("/", authorize("admin", "staff"), async (req, res) => {
  let connection;
  let transactionStarted = false;
  let idempotencyReservation;
  try {
    const {
      customer_id,
      products,
      payment_type,
      amount_paid = 0,
      notes = "",
    } = req.body;
    const customerId = Number(customer_id);
    if (!Number.isInteger(customerId) || customerId <= 0)
      throw new Error("A customer must be selected.");
    if (!Array.isArray(products) || !products.length)
      throw new Error("At least one product is required to complete a sale.");

    idempotencyReservation = await reserveIdempotencyKey(
      "sale", req.user.id, req.get("Idempotency-Key"),
    );
    if (idempotencyReservation.response)
      return res.status(200).json(idempotencyReservation.response);
    if (idempotencyReservation.processing)
      return res.status(409).json({ message: "This sale is already being processed." });

    connection = await getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [customers] = await connection.query(
      `SELECT id FROM customers WHERE id = ?${req.user.role === "staff" ? " AND created_by = ?" : ""}`,
      req.user.role === "staff" ? [customerId, req.user.id] : [customerId],
    );
    if (!customers.length)
      throw new Error(
        req.user.role === "staff"
          ? "You can only create sales for your own customers."
          : "Selected customer was not found.",
      );

    const requestedItems = new Map();
    for (const item of products) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId <= 0)
        throw new Error("Each sale item must have a valid product ID.");
      if (!Number.isInteger(quantity) || quantity <= 0)
        throw new Error(
          "Each sale quantity must be a whole number greater than zero.",
        );
      const unit = item.unit || "single";
      if (!["single", "dozen", "box"].includes(unit))
        throw new Error("Selling unit must be single, dozen, or box.");
      const productItems = requestedItems.get(productId) || [];
      productItems.push({ quantity, unit });
      requestedItems.set(productId, productItems);
    }

    const saleItems = [];
    let totalAmountCents = 0n;
    for (const [productId, requestedProductItems] of requestedItems) {
      const productRows = await connection.query(
        "SELECT id, quantity, selling_price, pieces_per_box FROM products WHERE id = ? FOR UPDATE",
        [productId],
      );
      const product = productRows[0][0];
      if (!product) throw new Error(`Product ${productId} was not found.`);
      const calculatedItems = requestedProductItems.map((item) =>
        calculateSale(product, item.quantity, item.unit),
      );
      const baseQuantity = calculatedItems.reduce(
        (sum, item) => sum + item.baseQuantity,
        0,
      );
      if (Number(product.quantity) < baseQuantity)
        throw new Error(
          `Quantity for product ${product.id} is greater than available stock.`,
        );
      calculatedItems.forEach((item) => {
        totalAmountCents += item.subtotalCents;
        saleItems.push({ product, ...item });
      });
    }

    const totalAmount = centsToDecimal(totalAmountCents);

    const paymentType = payment_type || "cash";
    if (!["cash", "lending"].includes(paymentType))
      throw new Error("Payment method must be cash or lending.");
    const enteredAmountCents = parseMoneyToCents(amount_paid, "Payment amount");
    const paidAmountCents =
      paymentType === "cash" && enteredAmountCents === 0n
        ? totalAmountCents
        : enteredAmountCents;
    if (paidAmountCents > totalAmountCents)
      throw new Error(
        "Payment amount must be between zero and the sale total.",
      );
    const balanceCents = totalAmountCents - paidAmountCents;
    const paidAmount = centsToDecimal(paidAmountCents);
    const balance = centsToDecimal(balanceCents);
    const status =
      paymentType === "cash"
        ? "paid"
        : balanceCents === 0n
          ? "paid"
          : paidAmountCents === 0n
            ? "unpaid"
            : "partially_paid";

    const saleNumber = `SALE-${Date.now()}`;
    const [saleRows] = await connection.query(
      "INSERT INTO sales (sale_number, customer_id, staff_id, total_amount, amount_paid, balance, payment_type, status, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW()) RETURNING id",
      [
        saleNumber,
        customerId,
        req.user.id,
        totalAmount,
        paidAmount,
        balance,
        paymentType,
        status,
      ],
    );

    const saleId = saleRows[0]?.id;
    if (!Number.isInteger(Number(saleId)) || Number(saleId) <= 0)
      throw new Error("The database did not return a valid sale ID.");

    for (const item of saleItems) {
      await connection.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, unit, base_quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          saleId,
          item.product.id,
          item.quantity,
          item.unit,
          item.baseQuantity,
          item.unitPrice,
          item.subtotal,
        ],
      );
    }

    const stockByProduct = new Map();
    for (const item of saleItems) {
      stockByProduct.set(
        item.product.id,
        (stockByProduct.get(item.product.id) || 0) + item.baseQuantity,
      );
    }
    for (const [productId, baseQuantity] of stockByProduct) {
      await connection.query(
        "UPDATE products SET quantity = quantity - ?, status = CASE WHEN quantity - ? <= 0 THEN 'out_of_stock' ELSE status END WHERE id = ?",
        [baseQuantity, baseQuantity, productId],
      );
    }

    if (paidAmountCents > 0n) {
      await connection.query(
        "INSERT INTO payments (payment_number, customer_id, sale_id, amount, payment_method, staff_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          "PAY-" + Date.now(),
          customerId,
          saleId,
          paidAmount,
          "cash",
          req.user.id,
          notes || "",
        ],
      );
    }

    const receiptNumber = `RCPT-${Date.now()}`;
    await ensureReceiptForSale(connection, {
      saleId,
      customerId,
      staffId: req.user.id,
      receiptNumber,
    });

    await connection.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "Sale created",
        "sale",
        saleId,
        `Sale ${saleNumber} created`,
      ],
    );

    await connection.commit();
    transactionStarted = false;
    const [completedSaleRows] = await connection.query(
      "SELECT * FROM sales WHERE id = ?",
      [saleId],
    );
    const [completedItemRows] = await connection.query(
      "SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id",
      [saleId],
    );
    const response = {
      message: "Sale completed successfully.",
      sale: completedSaleRows[0],
      items: completedItemRows,
    };
    await completeIdempotencyKey(idempotencyReservation, response);
    return res.status(201).json(response);
  } catch (error) {
    if (connection && transactionStarted) await connection.rollback();
    // A failed transaction may safely be retried with the same key.
    await abandonIdempotencyKey(idempotencyReservation).catch(() => {});
    const status =
      error.status || (error.code === "DB_UNAVAILABLE" ? 503 : 400);
    return res
      .status(status)
      .json({ message: error.message || "Sale failed." });
  } finally {
    connection?.release();
  }
});

router.get("/:id", async (req, res) => {
  const sales = await query(
    `SELECT * FROM sales WHERE id = ?${req.user.role === "staff" ? " AND staff_id = ?" : ""}`,
    req.user.role === "staff" ? [req.params.id, req.user.id] : [req.params.id],
  );
  if (!sales.length)
    return res.status(404).json({ message: "Sale not found." });
  return res.json(sales[0]);
});

export default router;
