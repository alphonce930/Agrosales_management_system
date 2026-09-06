import { DollarSign, Users, ShoppingCart, Wallet, Package2, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useEffect, useState } from 'react';
import api from '../services/api';

const COLORS = ['#0f3d2e', '#d4a72c', '#4f8f78'];

export default function StaffDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/analytics/dashboard').then(({ data: result }) => setData(result)); }, []);
  const totals = data?.totals || {};
  const stats = [
    { label: 'Total Cash Sales', value: `TZS ${Number(totals.total_cash_sales || 0).toLocaleString()}`, icon: Wallet },
    { label: 'Total Lending', value: `TZS ${Number(totals.total_lending || 0).toLocaleString()}`, icon: ShoppingCart },
    { label: 'Outstanding Debt', value: `TZS ${Number(totals.outstanding_debt || 0).toLocaleString()}`, icon: ArrowUpRight },
    { label: 'Total Customers', value: totals.total_customers || 0, icon: Users }, { label: 'Products Sold', value: data?.products?.reduce((sum, item) => sum + item.sales, 0) || 0, icon: Package2 },
    { label: 'Payments Received', value: `TZS ${Number(totals.total_payments || 0).toLocaleString()}`, icon: DollarSign }
  ];
  const salesData = (data?.monthly || []).map((item) => ({ name: item.name, sales: item.value }));
  const paymentData = data?.payments || [];
  const productData = data?.products || [];
  const debtData = data?.debt || [];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
              </div>
              <div className="rounded-xl bg-brand-gold/20 p-3 text-brand-deep">
                <Icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Sales Overview</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#d4a72c" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#d4a72c" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#d4a72c" fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Payment Type</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {paymentData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Top Product Sales</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#0f3d2e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Customer Debt</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#d4a72c" />
                <Bar dataKey="paid" fill="#0f3d2e" />
                <Bar dataKey="outstanding" fill="#4f8f78" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
