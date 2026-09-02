import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

const initialCustomers = [
  { id: 1, name: 'Joseph Mchomvu', phone: '+255712000111', location: 'Arusha', type: 'Farmer', balance: 'TZS 340,000' },
  { id: 2, name: 'Salma Mbwana', phone: '+255765000222', location: 'Morogoro', type: 'Business', balance: 'TZS 120,000' },
  { id: 3, name: 'Mikidadi Sule', phone: '+255699000333', location: 'Dodoma', type: 'Institution', balance: 'TZS 540,000' }
];

export default function StaffCustomersPage() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', location: '', type: 'Farmer' });

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.location.toLowerCase().includes(search.toLowerCase())
  );

  const addCustomer = (event) => {
    event.preventDefault();
    if (!form.name || !form.phone || !form.location) return;

    setCustomers((current) => [{ id: Date.now(), name: form.name, phone: form.phone, location: form.location, type: form.type, balance: 'TZS 0' }, ...current]);
    setForm({ name: '', phone: '', location: '', type: 'Farmer' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Customer records</p>
          <h2 className="text-3xl font-bold text-slate-900">Customer directory</h2>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep" />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><Plus size={18} className="text-brand-deep" /> Add customer</div>
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={addCustomer}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <div className="flex gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep">
              <option>Farmer</option>
              <option>Business</option>
              <option>Institution</option>
            </select>
            <button type="submit" className="btn-primary whitespace-nowrap">Save</button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Balance</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">{customer.name}</td>
                  <td className="px-5 py-4 text-slate-700">{customer.phone}</td>
                  <td className="px-5 py-4 text-slate-700">{customer.location}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-brand-gold/20 px-2.5 py-1 text-xs font-semibold text-brand-deep">{customer.type}</span></td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{customer.balance}</td>
                  <td className="px-5 py-4"><button className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-rose-700 hover:bg-rose-200"><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
