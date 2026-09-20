import { Copy, Printer, Search, FileText, Building2, Phone, MapPin, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const companyInfo = {
  name: 'Golden Agrochemicals',
  phone: '0749 556 578',
  address: 'mwenge, Dar es Salaam, Tanzania',
  email: 'info@goldenagrochemicals.co.tz'
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `TZS ${amount.toLocaleString()}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

export default function StaffReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [receiptForm, setReceiptForm] = useState({ sale_id: '', notes: '' });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const formatReceipt = (item) => ({
    id: item.id,
    receipt: item.receipt_number || `RCT-${item.id}`,
    customer: item.customer_name || 'Unknown customer',
    total: formatCurrency(item.total_amount || item.amount_paid || 0),
    issued: formatDate(item.issued_at || item.sale_date),
    paymentMethod: item.payment_type === 'cash' ? 'Cash' : 'Lending',
    invoice: item.sale_number || `INV-${item.id}`,
    note: item.notes || 'Payment completed successfully.',
    amountValue: Number(item.total_amount || item.amount_paid || 0),
    raw: item
  });

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const [receiptResponse, saleResponse] = await Promise.all([api.get('/receipts'), api.get('/sales')]);
        const formatted = receiptResponse.data.map(formatReceipt);
        setReceipts(formatted);
        setSales(saleResponse.data || []);
        if (formatted[0]) setSelectedReceiptId(formatted[0].id);
        if (saleResponse.data?.[0]) setReceiptForm((current) => ({ ...current, sale_id: String(saleResponse.data[0].id) }));
      } catch (error) {
        console.error('Failed to fetch receipts', error);
        setReceipts([]);
        setError('Unable to load your receipt records.');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const selectedReceipt = useMemo(
    () => receipts.find((receipt) => receipt.id === selectedReceiptId) || receipts[0],
    [receipts, selectedReceiptId]
  );

  const filteredReceipts = receipts.filter((receipt) =>
    receipt.customer.toLowerCase().includes(search.toLowerCase()) ||
    receipt.receipt.toLowerCase().includes(search.toLowerCase()) ||
    receipt.invoice.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSale = useMemo(
    () => sales.find((sale) => String(sale.id) === String(receiptForm.sale_id)),
    [sales, receiptForm.sale_id]
  );

  const createReceipt = async (event) => {
    event.preventDefault();
    if (!receiptForm.sale_id) return;
    setGenerating(true);
    setError('');
    try {
      const { data } = await api.post('/receipts', { sale_id: Number(receiptForm.sale_id), notes: receiptForm.notes });
      const receipt = formatReceipt(data.receipt);
      setReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
      setSelectedReceiptId(receipt.id);
      setReceiptForm((current) => ({ ...current, notes: '' }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to generate the e-receipt.');
    } finally {
      setGenerating(false);
    }
  };

  const buildReceiptText = (receipt) => [
    `${companyInfo.name} - ${companyInfo.branch}`,
    `Phone: ${companyInfo.phone}`,
    `Address: ${companyInfo.address}`,
    'Payment Receipt',
    `Invoice: ${receipt.invoice}`,
    `Receipt: ${receipt.receipt}`,
    `Customer: ${receipt.customer}`,
    `Date: ${receipt.issued}`,
    `Payment Method: ${receipt.paymentMethod}`,
    `Amount: ${receipt.total}`,
    `Note: ${receipt.note}`,
    'Thank you for choosing Golden Agrochemicals.'
  ].join('\n');

  const handleGenerateReceipt = (receipt) => {
    if (!receipt) return;
    setSelectedReceiptId(receipt.id);

    const printWindow = window.open('', '_blank', 'width=820,height=900');
    if (!printWindow) {
      alert('Please allow pop-ups to print the individual receipt.');
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>Receipt for ${receipt.customer}</title>
          <style>
            body { font-family: Arial, sans-serif; background: #fff; color: #0f172a; margin: 0; padding: 32px; }
            @page { size: 80mm auto; margin: 3mm; }
            body { width: 74mm; margin: 0 auto; padding: 0; }
            .receipt { width: 74mm; margin: 0; padding: 0; }
            .brand { text-align: center; font-weight: 800; font-size: 24px; color: #0f172a; }
            .muted { color: #475569; font-size: 13px; }
            .title { text-align: center; font-weight: 700; font-size: 18px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1; margin-top: 12px; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; font-size: 14px; margin-top: 10px; }
            .notes { margin-top: 18px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 14px; }
            .thanks { text-align: center; margin-top: 18px; font-weight: 700; font-size: 18px; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="brand">${companyInfo.name}</div>
            <div class="muted" style="text-align:center; margin-top:4px;">${companyInfo.branch}</div>
            <div class="muted" style="text-align:center; margin-top:4px;">Phone: ${companyInfo.phone}</div>
            <div class="muted" style="text-align:center; margin-top:4px;">${companyInfo.address}</div>
            <div class="title">Payment Receipt</div>
            <div class="row"><span>Invoice</span><strong>${receipt.invoice}</strong></div>
            <div class="row"><span>Receipt</span><strong>${receipt.receipt}</strong></div>
            <div class="row"><span>Customer</span><strong>${receipt.customer}</strong></div>
            <div class="row"><span>Date</span><strong>${receipt.issued}</strong></div>
            <div class="row"><span>Payment Method</span><strong>${receipt.paymentMethod}</strong></div>
            <div class="row"><span>Amount</span><strong>${receipt.total}</strong></div>
            <div class="notes"><strong>Notes:</strong><br>${receipt.note}</div>
            <div class="thanks">Thank you!</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handlePrint = () => {
    if (selectedReceipt) {
      handleGenerateReceipt(selectedReceipt);
    }
  };

  const handleCopy = async () => {
    if (!selectedReceipt) return;

    const text = buildReceiptText(selectedReceipt);

    try {
      await navigator.clipboard.writeText(text);
      alert(`Receipt generated for ${selectedReceipt.customer}.`);
    } catch {
      alert('Clipboard access is unavailable in this browser.');
    }
  };

  if (loading) {
    return <div className="card p-6 text-slate-600">Loading receipts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Receipts</p>
          <h2 className="text-3xl font-bold text-slate-900">Issued receipts</h2>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or customer"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
          />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ReceiptText size={19} className="text-brand-deep" /> Generate e-receipt
        </div>
        <form onSubmit={createReceipt} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={receiptForm.sale_id}
            onChange={(event) => setReceiptForm((current) => ({ ...current, sale_id: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            required
          >
            <option value="">Select your sale</option>
            {sales.map((sale) => (
              <option key={sale.id} value={sale.id}>{sale.sale_number} — {sale.customer_name}</option>
            ))}
          </select>
          <input
            value={selectedSale?.customer_name || ''}
            placeholder="Customer"
            readOnly
            className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-600"
          />
          <input
            value={receiptForm.notes}
            onChange={(event) => setReceiptForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Receipt note (optional)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <button type="submit" disabled={generating || !receiptForm.sale_id} className="btn-primary disabled:opacity-60">
            {generating ? 'Generating...' : 'Generate receipt'}
          </button>
        </form>
        {selectedSale && (
          <div className="mt-3 text-sm text-slate-500">
            Sale total: <span className="font-semibold text-slate-700">{formatCurrency(selectedSale.total_amount)}</span>
            <span className="mx-2">•</span>{selectedSale.payment_type === 'cash' ? 'Cash' : 'Lending'}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-deep p-2 text-white"><FileText size={18} /></div>
                <div>
                  <div className="text-lg font-bold text-slate-900">Receipt records</div>
                  <div className="text-sm text-slate-500">Track and generate office receipts</div>
                </div>
              </div>
              {selectedReceipt && (
                <button
                  onClick={() => handleGenerateReceipt(selectedReceipt)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-4 py-2 text-sm font-medium text-white hover:bg-brand-green"
                >
                  <FileText size={16} /> Generate for {selectedReceipt.customer}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Receipt</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className={`border-t border-slate-200 ${selectedReceipt?.id === receipt.id ? 'bg-brand-light/50' : ''}`}>
                    <td className="px-5 py-4 font-medium text-slate-900">{receipt.receipt}</td>
                    <td className="px-5 py-4 text-slate-700">{receipt.customer}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{receipt.total}</td>
                    <td className="px-5 py-4 text-slate-700">{receipt.issued}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedReceiptId(receipt.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-deep hover:text-brand-deep"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleGenerateReceipt(receipt)}
                          className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-deep hover:opacity-90"
                        >
                          Generate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-brand-light p-2 text-brand-deep"><Building2 size={18} /></div>
            <div>
              <div className="text-lg font-bold text-slate-900">Company information</div>
              <div className="text-sm text-slate-500">Official receipt details</div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3"><Building2 size={16} className="mt-0.5 text-brand-deep" /><span><span className="font-semibold text-slate-900">Company:</span> {companyInfo.name}</span></div>
            <div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 text-brand-deep" /><span><span className="font-semibold text-slate-900">Branch:</span> {companyInfo.branch}</span></div>
            <div className="flex items-start gap-3"><Phone size={16} className="mt-0.5 text-brand-deep" /><span><span className="font-semibold text-slate-900">Phone:</span> {companyInfo.phone}</span></div>
            <div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 text-brand-deep" /><span><span className="font-semibold text-slate-900">Address:</span> {companyInfo.address}</span></div>
          </div>
        </div>
      </div>

      {selectedReceipt && (
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-deep/20 bg-brand-light/40 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-brand-deep">Receipt for customer</div>
              <div className="text-lg font-bold text-slate-900">{selectedReceipt.customer}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-4 py-2 text-white hover:bg-brand-green">
                <Copy size={16} /> Copy receipt
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-2 font-medium text-brand-deep hover:opacity-90">
                <Printer size={16} /> Print receipt
              </button>
            </div>
          </div>

          <div className="receipt-paper mx-auto max-w-[440px] rounded-2xl border border-slate-200 bg-white p-5 shadow-lg print:shadow-none">
            <div className="text-center">
              <div className="text-2xl font-black tracking-tight text-brand-deep">{companyInfo.name}</div>
              <div className="mt-1 text-sm text-slate-700">{companyInfo.branch}</div>
              <div className="mt-1 text-sm text-slate-700">Phone: {companyInfo.phone}</div>
              <div className="mt-1 text-sm text-slate-700">{companyInfo.address}</div>
              <div className="mt-3 border-b border-dashed border-slate-300 pb-3 text-lg font-bold uppercase tracking-wide text-slate-900">Payment Receipt</div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between"><span>Invoice</span><span className="font-semibold text-slate-900">{selectedReceipt.invoice}</span></div>
              <div className="flex justify-between"><span>Receipt</span><span className="font-semibold text-slate-900">{selectedReceipt.receipt}</span></div>
              <div className="flex justify-between"><span>Customer</span><span className="font-semibold text-slate-900">{selectedReceipt.customer}</span></div>
              <div className="flex justify-between"><span>Date</span><span className="font-semibold text-slate-900">{selectedReceipt.issued}</span></div>
              <div className="flex justify-between"><span>Payment Method</span><span className="font-semibold text-slate-900">{selectedReceipt.paymentMethod}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-semibold text-slate-900">{selectedReceipt.total}</span></div>
            </div>

            <div className="mt-5 border-t border-dashed border-slate-300 pt-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Notes:</div>
              <div>{selectedReceipt.note}</div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-700">
              <div className="text-lg font-bold text-brand-deep">Thank you!</div>
              <div className="mt-1">Generated by the staff payment system</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
