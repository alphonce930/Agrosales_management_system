import { DollarSign, Users, ShoppingCart, Wallet, Package2, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const stats = [
  { label: 'Today\'s Cash Sales', value: 'TZS 420,000', icon: DollarSign },
  { label: 'Total Cash Sales', value: 'TZS 2.4M', icon: Wallet },
  { label: 'Total Lending', value: 'TZS 1.1M', icon: ShoppingCart },
  { label: 'Outstanding Debt', value: 'TZS 840,000', icon: ArrowUpRight },
  { label: 'Total Customers', value: '1,240', icon: Users },
  { label: 'Products Sold', value: '7,450', icon: Package2 },
  { label: 'Payments Received', value: 'TZS 980,000', icon: DollarSign }
];

const salesData = [
  { name: 'Mon', sales: 400 },
  { name: 'Tue', sales: 700 },
  { name: 'Wed', sales: 650 },
  { name: 'Thu', sales: 980 },
  { name: 'Fri', sales: 1200 },
  { name: 'Sat', sales: 900 }
];

const paymentData = [
  { name: 'Cash', value: 62 },
  { name: 'Lending', value: 24 },
  { name: 'Paid Lending', value: 14 }
];

const productData = [
  { name: 'Herbicide', sales: 120 },
  { name: 'Fertilizer', sales: 95 },
  { name: 'Insecticide', sales: 82 },
  { name: 'Seed', sales: 64 }
];

const debtData = [
  { name: 'Jan', total: 800000, paid: 420000, outstanding: 380000 },
  { name: 'Feb', total: 900000, paid: 560000, outstanding: 340000 },
  { name: 'Mar', total: 1100000, paid: 610000, outstanding: 490000 }
];

const COLORS = ['#0f3d2e', '#d4a72c', '#4f8f78'];

export default function StaffDashboard() {
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
