import { useMemo, useState } from 'react';
import { ArrowUpRight, DollarSign, PackageSearch, Search } from 'lucide-react';

const initialLending = [
  { id: 1, customer: 'Joseph Mchomvu', product: 'Fertilizer 50kg', amount: 'TZS 250,000', status: 'pending' },
  { id: 2, customer: 'Salma Mbwana', product: 'Pesticide Shield', amount: 'TZS 180,000', status: 'partial' },
  { id: 3, customer: 'Mikidadi Sule', product: 'Seed Pack', amount: 'TZS 95,000', status: 'paid' }
];

export default function StaffLendingPage() {
  const [search, setSearch] = useState('');
  const [lending, setLending] = useState(initialLending);
  const [form, setForm] = useState({
    customer: '',
    product: '',
    amount: '',
    notes: ''
  });

  const filteredLending = useMemo(() => {
    const query = search.toLowerCase();
    return lending.filter((item) =>
      item.customer.toLowerCase().includes(query) ||
      item.product.toLowerCase().includes(query) ||
      item.amount.toLowerCase().includes(query)
    );
  }, [search, lending]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.customer || !form.product || !form.amount) return;

    setLending((current) => [
      {
        id: Date.now(),
        customer: form.customer,
        product: form.product,
        amount: `TZS ${Number(form.amount).toLocaleString()}`,
        status: 'pending'
      },
      ...current
    ]);

    setForm({ customer: '', product: '', amount: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Lending</p>
          <h2 className="text-3xl font-bold text-slate-900">Customer credit and sales</h2>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or product"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
          />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DollarSign size={18} className="text-brand-deep" /> New lending entry
        </div>

        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
          <input
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
            placeholder="Customer name"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <input
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            placeholder="Product"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Amount"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <div className="flex gap-2">
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">Add</button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Active lending</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{lending.filter((item) => item.status !== 'paid').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Pending</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{lending.filter((item) => item.status === 'pending').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Partial payment</div>
          <div className="mt-2 text-2xl font-bold text-brand-deep">{lending.filter((item) => item.status === 'partial').length}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLending.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">{item.customer}</td>
                  <td className="px-5 py-4 text-slate-700">{item.product}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{item.amount}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <PackageSearch size={18} className="text-brand-deep" /> Lending summary
        </div>
        <p className="mt-3 text-slate-600">
          A lending record shows the customer name, product sold, and amount owed so staff and admins can track balances and follow-up payment schedules.
        </p>
      </div>
    </div>
  );
}
