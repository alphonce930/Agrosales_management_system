import { BarChart3, TrendingUp, Wallet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const monthlySales = [
  { name: 'Jan', value: 2400000 },
  { name: 'Feb', value: 3100000 },
  { name: 'Mar', value: 2800000 },
  { name: 'Apr', value: 3900000 },
  { name: 'May', value: 4300000 },
  { name: 'Jun', value: 5200000 }
];

const performance = [
  { name: 'John', sales: 1200000 },
  { name: 'Asha', sales: 980000 },
  { name: 'Moses', sales: 840000 },
  { name: 'Grace', sales: 1120000 }
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Analytics</p>
        <h2 className="text-3xl font-bold text-slate-900">Business performance</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-500"><TrendingUp size={16} /> Total revenue</div>
          <div className="mt-3 text-2xl font-bold text-slate-900">TZS 6.2M</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-500"><Wallet size={16} /> Cash collected</div>
          <div className="mt-3 text-2xl font-bold text-emerald-600">TZS 4.8M</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-500"><BarChart3 size={16} /> Outstanding debt</div>
          <div className="mt-3 text-2xl font-bold text-amber-600">TZS 1.2M</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Monthly revenue</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f3d2e" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#0f3d2e" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#0f3d2e" fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Top performers</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
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
