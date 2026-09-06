import { Users, Package, ShoppingCart, Wallet, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useEffect, useState } from 'react';
import api from '../services/api';

const formatMoney = (value) => `TZS ${Number(value || 0).toLocaleString()}`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics/dashboard').then(({ data: result }) => setData(result)).catch(() => setError('Unable to load dashboard data.'));
  }, []);

  const totals = data?.totals || {};
  const stats = [
    { label: 'Total Staff', value: totals.total_staff, icon: Users }, { label: 'Verified Staff', value: totals.verified_staff, icon: Users },
    { label: 'Pending Staff', value: totals.pending_staff, icon: FileText }, { label: 'Total Products', value: totals.total_products, icon: Package },
    { label: 'Total Customers', value: totals.total_customers, icon: Users }, { label: 'Total Sales', value: formatMoney(totals.total_sales_value), icon: ShoppingCart },
    { label: 'Total Cash Sales', value: formatMoney(totals.total_cash_sales), icon: Wallet }, { label: 'Total Lending', value: formatMoney(totals.total_lending), icon: FileText },
    { label: 'Total Payments', value: formatMoney(totals.total_payments), icon: Wallet }, { label: 'Outstanding Debt', value: formatMoney(totals.outstanding_debt), icon: FileText }
  ];
  return (
    <div className="space-y-6">{error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
              </div>
              <div className="rounded-xl bg-brand-gold/20 p-2 text-brand-deep">
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Sales Overview</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthly || []}>
                <defs>
                  <linearGradient id="adminSales" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f3d2e" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#0f3d2e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#0f3d2e" fill="url(#adminSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Staff Performance</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.staffPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#d4a72c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
