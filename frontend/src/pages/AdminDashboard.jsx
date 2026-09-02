import { Users, Package, ShoppingCart, Wallet, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const stats = [
  { label: 'Total Staff', value: '18', icon: Users },
  { label: 'Verified Staff', value: '15', icon: Users },
  { label: 'Pending Staff', value: '3', icon: FileText },
  { label: 'Total Products', value: '58', icon: Package },
  { label: 'Total Customers', value: '1,240', icon: Users },
  { label: 'Total Sales', value: 'TZS 6.2M', icon: ShoppingCart },
  { label: 'Total Cash Sales', value: 'TZS 4.8M', icon: Wallet },
  { label: 'Total Lending', value: 'TZS 2.1M', icon: FileText },
  { label: 'Total Payments', value: 'TZS 3.9M', icon: Wallet },
  { label: 'Outstanding Debt', value: 'TZS 1.2M', icon: FileText }
];

const summaryData = [
  { name: 'Jan', sales: 1100 },
  { name: 'Feb', sales: 1500 },
  { name: 'Mar', sales: 1300 },
  { name: 'Apr', sales: 1850 },
  { name: 'May', sales: 2200 },
  { name: 'Jun', sales: 2600 }
];

const staffPerformance = [
  { name: 'John', sales: 1200000 },
  { name: 'Asha', sales: 980000 },
  { name: 'Moses', sales: 840000 },
  { name: 'Grace', sales: 1120000 }
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
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
              <AreaChart data={summaryData}>
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
              <BarChart data={staffPerformance}>
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
