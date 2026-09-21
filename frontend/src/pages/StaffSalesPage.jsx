import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Plus, Search, Trash2 } from "lucide-react";
import api from "../services/api";

const emptyItem = () => ({ product_id: "", unit: "single", quantity: 1 });
const money = (value) => `TZS ${Number(value || 0).toLocaleString()}`;
const unitLabels = { single: "Single", dozen: "Dozen", box: "Box" };
const piecesFor = (product, quantity, unit) => {
  const multiplier =
    unit === "dozen"
      ? 12
      : unit === "box"
        ? Number(product?.pieces_per_box || 0)
        : 1;
  return Number(quantity || 0) * multiplier;
};

export default function StaffSalesPage() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submissionLock = useRef(false);
  const [form, setForm] = useState({
    customer_id: "",
    payment_type: "cash",
    amount_paid: "",
    notes: "",
    items: [emptyItem()],
  });

  const loadData = async () => {
    try {
      const [salesRes, customersRes, productsRes] = await Promise.all([
        api.get("/sales"),
        api.get("/customers"),
        api.get("/products"),
      ]);
      setSales(salesRes.data || []);
      setCustomers(customersRes.data || []);
      setProducts(
        (productsRes.data || []).filter(
          (product) =>
            product.status === "active" && Number(product.quantity) > 0,
        ),
      );
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load your sales data.",
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const items = useMemo(
    () =>
      form.items.map((item) => {
        const product = products.find(
          (entry) => String(entry.id) === String(item.product_id),
        );
        const baseQuantity = product
          ? piecesFor(product, item.quantity, item.unit)
          : 0;
        return {
          ...item,
          product,
          baseQuantity,
          subtotal: product ? Number(product.selling_price) * baseQuantity : 0,
        };
      }),
    [form.items, products],
  );
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const filteredSales = sales.filter((sale) => {
    const term = search.toLowerCase();
    return (
      ((sale.customer_name || "").toLowerCase().includes(term) ||
        (sale.sale_number || "").toLowerCase().includes(term)) &&
      (type === "all" || sale.payment_type === type)
    );
  });

  const changeItem = (index, field, value) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));

  const submitSale = async (event) => {
    event.preventDefault();
    if (submissionLock.current) return;
    const validItems = form.items.filter(
      (item) => item.product_id && Number(item.quantity) > 0,
    );
    if (!form.customer_id)
      return setError("Select your customer before completing the sale.");
    if (!validItems.length)
      return setError("Add at least one product before completing the sale.");
    submissionLock.current = true;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/sales", {
        customer_id: Number(form.customer_id),
        products: validItems.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
        payment_type: form.payment_type,
        amount_paid: form.amount_paid === "" ? 0 : Number(form.amount_paid),
        notes: form.notes,
      }, { headers: { "Idempotency-Key": crypto.randomUUID() } });
      setForm({
        customer_id: "",
        payment_type: "cash",
        amount_paid: "",
        notes: "",
        items: [emptyItem()],
      });
      setSuccess(
        `Sale completed successfully. Sale ID: ${response.data.sale?.id}.`,
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save the sale.",
      );
    } finally {
      setSaving(false);
      submissionLock.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">
            My sales register
          </p>
          <h2 className="text-3xl font-bold text-slate-900">Transactions</h2>
        </div>
        <div className="flex gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your sales"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 outline-none focus:border-brand-deep"
            >
              <option value="all">All types</option>
              <option value="cash">Cash</option>
              <option value="lending">Lending</option>
            </select>
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Plus size={18} className="text-brand-deep" /> New sale
        </div>
        <form onSubmit={submitSale} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={form.customer_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customer_id: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
              required
            >
              <option value="">Select your customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
            <select
              value={form.payment_type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payment_type: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            >
              <option value="cash">Cash</option>
              <option value="lending">Lending</option>
            </select>
            <input
              type="number"
              min="0"
              max={total}
              value={form.amount_paid}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  amount_paid: event.target.value,
                }))
              }
              placeholder={
                form.payment_type === "cash"
                  ? `Cash payment (default ${money(total)})`
                  : "Initial payment (optional)"
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            />
            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Sale note (optional)"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            />
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">
              Products from system inventory
            </div>
            {form.items.map((item, index) => {
              const selected = items[index];
              return (
                <div
                  key={index}
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_130px_110px_minmax(180px,0.75fr)_auto] md:items-center"
                >
                  <select
                    value={item.product_id}
                    onChange={(event) =>
                      changeItem(index, "product_id", event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-deep"
                    required
                  >
                    <option value="">Select system product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} — {money(product.selling_price)} / piece
                        ({product.quantity} pieces in stock)
                      </option>
                    ))}
                  </select>
                  <select
                    value={item.unit}
                    onChange={(event) =>
                      changeItem(index, "unit", event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-deep"
                    aria-label="Selling unit"
                  >
                    <option value="single">Single</option>
                    <option value="dozen">Dozen</option>
                    <option value="box">Box</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max={
                      selected?.product
                        ? Math.floor(
                            Number(selected.product.quantity) /
                              (item.unit === "dozen"
                                ? 12
                                : item.unit === "box"
                                  ? Number(selected.product.pieces_per_box || 0)
                                  : 1),
                          )
                        : undefined
                    }
                    value={item.quantity}
                    onChange={(event) =>
                      changeItem(index, "quantity", event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-deep"
                    aria-label="Quantity"
                  />
                  <div className="px-2 text-sm text-slate-700">
                    <div className="font-semibold">
                      {money(selected?.subtotal)}
                    </div>
                    {selected?.product && (
                      <div className="mt-0.5 text-xs font-normal text-slate-500">
                        {item.quantity} {unitLabels[item.unit]}
                        {Number(item.quantity) === 1 ? "" : "s"} ={" "}
                        {selected.baseQuantity} pieces
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={form.items.length === 1}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        items: current.items.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                    className="rounded-lg p-2 text-rose-700 hover:bg-rose-100 disabled:opacity-30"
                    aria-label="Remove product"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    items: [...current.items, emptyItem()],
                  }))
                }
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-deep hover:underline"
              >
                <Plus size={16} /> Add another product
              </button>
              <div className="text-lg font-bold text-slate-900">
                Sale total: {money(total)}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !products.length}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? "Saving sale..." : "Complete sale"}
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">My sales</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {sales.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Cash sales</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {sales.filter((item) => item.payment_type === "cash").length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Lending sales</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {sales.filter((item) => item.payment_type === "lending").length}
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Sale</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {sale.sale_number}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {sale.customer_name}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-brand-gold/20 px-2.5 py-1 text-xs font-semibold uppercase text-brand-deep">
                      {sale.payment_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {money(sale.total_amount)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sale.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
