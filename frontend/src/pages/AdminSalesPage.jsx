import { useState } from 'react';
import { Filter, Search } from 'lucide-react';

const initialSales = [
  { id: 1, saleNumber: 'SALE-1001', customer: 'Joseph Mchomvu', total: 'TZS 320,000', type: 'cash', status: 'paid' },
  { id: 2, saleNumber: 'SALE-1002', customer: 'Salma Mbwana', total: 'TZS 410,000', type: 'lending', status: 'partially_paid' },
  { id: 3, saleNumber: 'SALE-1003', customer: 'Mikidadi Sule', total: 'TZS 560,000', type: 'cash', status: 'paid' }
];

export default function AdminSalesPage() {
  const [sales, setSales] = useState(initialSales);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = sale.customer.toLowerCase().includes(search.toLowerCase()) || sale.saleNumber.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || sale.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Sales ledger</p>
          <h2 className="text-3xl font-bold text-slate-900">Transactions</h2>
        </div>
        <div className="flex gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sale"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 outline-none focus:border-brand-deep"
            >
              <option value="all">All types</option>
              <option value="cash">Cash</option>
              <option value="lending">Lending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total sales</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{sales.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Cash sales</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{sales.filter((item) => item.type === 'cash').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Lending sales</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{sales.filter((item) => item.type === 'lending').length}</div>
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
                  <td className="px-5 py-4 font-medium text-slate-900">{sale.saleNumber}</td>
                  <td className="px-5 py-4 text-slate-700">{sale.customer}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-brand-gold/20 px-2.5 py-1 text-xs font-semibold text-brand-deep uppercase">
                      {sale.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{sale.total}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        sale.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
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
