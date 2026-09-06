import { useEffect, useMemo, useState } from 'react';
import { PackagePlus, RefreshCw, Search, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function StaffProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ code: '', name: '', stock: 0, price: '', status: 'active' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const { data } = await api.get('/products', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      setProducts((Array.isArray(data) ? data : []).map((product) => ({
        ...product,
        name: product.name || 'Unnamed product',
        product_code: product.product_code || `PRODUCT-${product.id}`,
        quantity: Number(product.quantity) || 0,
        minimum_stock: Number(product.minimum_stock) || 0,
        selling_price: Number(product.selling_price) || 0
      })));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load products from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const handleFocus = () => fetchProducts();
    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase();
    return products.filter((product) =>
      product.name.toLowerCase().includes(query) || product.product_code.toLowerCase().includes(query)
    );
  }, [products, search]);

  const addProduct = async (event) => {
    event.preventDefault();
    if (!form.code || !form.name || !form.price) return;

    try {
      setSaving(true);
      setError('');
      await api.post('/products', {
        product_code: form.code,
        name: form.name,
        quantity: form.stock,
        selling_price: Number(form.price),
        status: form.status
      });
      setForm({ code: '', name: '', stock: 0, price: '', status: 'active' });
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save product to the database.');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id) => {
    try {
      setError('');
      await api.delete(`/products/${id}`);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove product.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Inventory</p>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900">Product catalog</h2>
            <button
              type="button"
              onClick={fetchProducts}
              disabled={loading}
              title="Refresh products"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><PackagePlus size={18} className="text-brand-deep" /> Add product</div>
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={addProduct}>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Product code" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="Stock" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Selling price" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep" />
          <div className="flex gap-2">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-brand-deep">
              <option value="active">Active</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit" disabled={saving} className="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
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
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500">Loading products...</td>
                </tr>
              ) : filteredProducts.length ? filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 font-medium text-slate-900">{product.product_code}</td>
                  <td className="px-5 py-4 text-slate-700">{product.name}</td>
                  <td className="px-5 py-4 text-slate-700">{product.quantity}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">TZS {Number(product.selling_price).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      product.status === 'active' && product.quantity <= product.minimum_stock
                        ? 'bg-amber-100 text-amber-700'
                        : product.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-700'
                    }`}>
                      {product.status === 'active' && product.quantity <= product.minimum_stock ? 'low' : product.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => removeProduct(product.id)} className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-rose-700 hover:bg-rose-200">
                      <Trash2 size={14} /> Remove
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
