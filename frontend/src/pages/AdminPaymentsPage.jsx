import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  useEffect(() => { api.get('/payments').then(({ data }) => setPayments(data)).catch(() => setPayments([])); }, []);
  const [search, setSearch] = useState('');

  const filteredPayments = payments.filter((payment) =>
    (payment.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (payment.payment_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Payment records</p>
          <h2 className="text-3xl font-bold text-slate-900">Receipts and settlements</h2>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total payments</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{payments.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Cash</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{payments.filter((item) => item.payment_method === 'cash').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Mobile / Bank</div>
          <div className="mt-2 text-2xl font-bold text-brand-deep">{payments.filter((item) => item.payment_method !== 'cash').length}</div>
        </div>
      </div>

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
                  <td className="px-5 py-4 font-semibold text-slate-900">TZS {Number(payment.amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-700">{new Date(payment.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
