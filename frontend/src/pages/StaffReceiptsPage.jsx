import { Search } from 'lucide-react';
import { useState } from 'react';

const initialReceipts = [
  { id: 1, receipt: 'RCPT-221', customer: 'Joseph Mchomvu', total: 'TZS 320,000', issued: '2026-09-02' },
  { id: 2, receipt: 'RCPT-223', customer: 'Salma Mbwana', total: 'TZS 410,000', issued: '2026-09-02' },
  { id: 3, receipt: 'RCPT-228', customer: 'Mikidadi Sule', total: 'TZS 560,000', issued: '2026-09-01' }
];

export default function StaffReceiptsPage() {
  const [receipts] = useState(initialReceipts);
  const [search, setSearch] = useState('');

  const filteredReceipts = receipts.filter((receipt) =>
    receipt.customer.toLowerCase().includes(search.toLowerCase()) || receipt.receipt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Receipts</p>
          <h2 className="text-3xl font-bold text-slate-900">Issued receipts</h2>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search receipt" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Receipt</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Issued</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">{receipt.receipt}</td>
                  <td className="px-5 py-4 text-slate-700">{receipt.customer}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{receipt.total}</td>
                  <td className="px-5 py-4 text-slate-700">{receipt.issued}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
