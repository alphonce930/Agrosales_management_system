import { useState } from 'react';
import { Search } from 'lucide-react';

const initialPayments = [
  { id: 1, payment: 'PAY-401', customer: 'Joseph Mchomvu', amount: 'TZS 90,000', method: 'Cash', date: '2026-09-02' },
  { id: 2, payment: 'PAY-402', customer: 'Salma Mbwana', amount: 'TZS 50,000', method: 'Mobile Money', date: '2026-09-02' },
  { id: 3, payment: 'PAY-403', customer: 'Mikidadi Sule', amount: 'TZS 160,000', method: 'Bank', date: '2026-09-01' }
];

export default function StaffPaymentsPage() {
  const [payments] = useState(initialPayments);
  const [search, setSearch] = useState('');

  const filteredPayments = payments.filter((payment) =>
    payment.customer.toLowerCase().includes(search.toLowerCase()) || payment.payment.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Payments</p>
          <h2 className="text-3xl font-bold text-slate-900">Settlement records</h2>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep" />
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
                  <td className="px-5 py-4 font-medium text-slate-900">{payment.payment}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.customer}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.method}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{payment.amount}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
