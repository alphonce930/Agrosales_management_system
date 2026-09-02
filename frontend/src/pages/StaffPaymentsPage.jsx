import { useEffect, useMemo, useState } from 'react';
import { Search, ReceiptText } from 'lucide-react';
import api from '../services/api';

const formatCurrency = (value) => `TZS ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

export default function StaffPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    sale_id: '',
    amount: '',
    payment_method: 'cash',
    notes: ''
  });
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customerRes, saleRes, paymentRes, receiptRes] = await Promise.all([
          api.get('/customers'),
          api.get('/sales'),
          api.get('/payments'),
          api.get('/receipts')
        ]);

        setCustomers(customerRes.data || []);
        setSales(saleRes.data || []);
        setPayments(paymentRes.data || []);
        setReceipts(receiptRes.data || []);

        if ((receiptRes.data || []).length) {
          setSelectedReceiptId(receiptRes.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load payment data', error);
      }
    };

    loadData();
  }, []);

  const customerSales = useMemo(() => {
    if (!form.customer_id) return [];
    return sales.filter((sale) => String(sale.customer_id) === String(form.customer_id));
  }, [sales, form.customer_id]);

  useEffect(() => {
    if (!form.customer_id && customers[0]) {
      setForm((prev) => ({ ...prev, customer_id: String(customers[0].id) }));
    }
  }, [customers, form.customer_id]);

  useEffect(() => {
    if (customerSales.length && (!form.sale_id || !customerSales.some((sale) => String(sale.id) === String(form.sale_id)))) {
      setForm((prev) => ({ ...prev, sale_id: String(customerSales[0].id) }));
    }
  }, [customerSales, form.sale_id]);

  const selectedReceipt = useMemo(
    () => receipts.find((receipt) => receipt.id === selectedReceiptId) || receipts[0],
    [receipts, selectedReceiptId]
  );

  const filteredPayments = payments.filter((payment) =>
    (payment.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (payment.payment_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.customer_id || !form.sale_id || !form.amount) {
      alert('Select a customer, sale, and payment amount.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/payments', {
        customer_id: Number(form.customer_id),
        sale_id: Number(form.sale_id),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        notes: form.notes
      });

      const [paymentRes, receiptRes] = await Promise.all([
        api.get('/payments'),
        api.get('/receipts')
      ]);

      setPayments(paymentRes.data || []);
      setReceipts(receiptRes.data || []);
      setSelectedReceiptId((receiptRes.data || [])[0]?.id || null);
      setForm({
        customer_id: form.customer_id,
        sale_id: '',
        amount: '',
        payment_method: 'cash',
        notes: ''
      });

      alert('Payment recorded successfully and receipt generated.');
    } catch (error) {
      console.error('Payment failed', error);
      alert(error.response?.data?.message || 'Payment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Payments</p>
          <h2 className="text-3xl font-bold text-slate-900">Settlement records</h2>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
          />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ReceiptText size={18} className="text-brand-deep" /> Record customer payment
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <select
            value={form.customer_id}
            onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value, sale_id: '' }))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          >
            <option value="">Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.full_name}</option>
            ))}
          </select>

          <select
            value={form.sale_id}
            onChange={(e) => setForm((prev) => ({ ...prev, sale_id: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            disabled={!form.customer_id}
          >
            <option value="">Sale</option>
            {customerSales.map((sale) => (
              <option key={sale.id} value={sale.id}>{sale.sale_number}</option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="Amount"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />

          <select
            value={form.payment_method}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          >
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank Transfer</option>
          </select>

          <button disabled={saving} type="submit" className="rounded-xl bg-brand-deep px-4 py-2.5 font-medium text-white hover:bg-brand-green disabled:opacity-60">
            {saving ? 'Saving...' : 'Save payment'}
          </button>
        </form>

        <div className="mt-4">
          <input
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
        </div>
      </div>

      {selectedReceipt && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-deep">Generated receipt</div>
              <div className="text-lg font-bold text-slate-900">{selectedReceipt.customer_name}</div>
            </div>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-brand-gold px-4 py-2 font-medium text-brand-deep hover:opacity-90"
            >
              Print this customer receipt
            </button>
          </div>

          <div className="mx-auto max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-black tracking-tight text-brand-deep">Golden Agrochemicals</div>
              <div className="mt-1 text-sm text-slate-700">Mbagala Rangi Branch</div>
              <div className="mt-3 border-b border-dashed border-slate-300 pb-3 text-lg font-bold uppercase text-slate-900">Payment Receipt</div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between"><span>Receipt</span><span className="font-semibold text-slate-900">{selectedReceipt.receipt_number}</span></div>
              <div className="flex justify-between"><span>Customer</span><span className="font-semibold text-slate-900">{selectedReceipt.customer_name}</span></div>
              <div className="flex justify-between"><span>Sale</span><span className="font-semibold text-slate-900">{selectedReceipt.sale_number}</span></div>
              <div className="flex justify-between"><span>Date</span><span className="font-semibold text-slate-900">{formatDate(selectedReceipt.issued_at)}</span></div>
              <div className="flex justify-between"><span>Method</span><span className="font-semibold text-slate-900">{selectedReceipt.payment_type === 'cash' ? 'Cash' : 'Lending'}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-semibold text-slate-900">{formatCurrency(selectedReceipt.total_amount || 0)}</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">{payment.payment_number}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.customer_name}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.payment_method}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                  <td className="px-5 py-4 text-slate-700">{formatDate(payment.payment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
