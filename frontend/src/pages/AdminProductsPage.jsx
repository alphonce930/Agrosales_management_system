import { useState } from 'react';
import { PackagePlus, Search, Trash2 } from 'lucide-react';

const initialProducts = [
  { id: 1, code: 'AG-101', name: 'Super Grow 20-20-20', stock: 120, price: 'TZS 24,500', status: 'active' },
  { id: 2, code: 'AG-205', name: 'Pesticide Shield', stock: 38, price: 'TZS 16,200', status: 'low' },
  { id: 3, code: 'AG-312', name: 'Soil Booster', stock: 90, price: 'TZS 12,800', status: 'active' }
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ code: '', name: '', stock: 0, price: '', status: 'active' });

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.code.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = (event) => {
    event.preventDefault();
    if (!form.code || !form.name || !form.price) return;

    setProducts((current) => [{ id: Date.now(), ...form, price: `TZS ${Number(form.price).toLocaleString()}` }, ...current]);
    setForm({ code: '', name: '', stock: 0, price: '', status: 'active' });
  };

  const removeProduct = (id) => {
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Inventory</p>
          <h2 className="text-3xl font-bold text-slate-900">Product catalog</h2>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
          />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <PackagePlus size={18} className="text-brand-deep" /> Add product
        </div>

        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={addProduct}>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Product code"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Product name"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            placeholder="Stock"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="Selling price"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
          />
          <div className="flex gap-2">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep"
            >
              <option value="active">Active</option>
              <option value="low">Low stock</option>
              <option value="inactive">Inactive</option>
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
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">{product.code}</td>
                  <td className="px-5 py-4 text-slate-700">{product.name}</td>
                  <td className="px-5 py-4 text-slate-700">{product.stock}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{product.price}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : product.status === 'low'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-rose-700 hover:bg-rose-200"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
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
