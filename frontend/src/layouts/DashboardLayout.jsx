import { Link, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Users, Package, DollarSign, ReceiptText, ShieldCheck, LogOut, LayoutGrid, FileText, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const sidebarItems = {
  admin: [
    { label: 'Dashboard', icon: LayoutGrid, path: '/admin' },
    { label: 'Staff', icon: Users, path: '/admin/staff' },
    { label: 'Customers', icon: Users, path: '/admin/customers' },
    { label: 'Products', icon: Package, path: '/admin/products' },
    { label: 'Sales', icon: DollarSign, path: '/admin/sales' },
    { label: 'Payments', icon: WalletCards, path: '/admin/payments' },
    { label: 'Reports', icon: FileText, path: '/admin/reports' },
    { label: 'My Profile', icon: ShieldCheck, path: '/admin/profile' }
  ],
  staff: [
    { label: 'Dashboard', icon: LayoutGrid, path: '/staff' },
    { label: 'Customers', icon: Users, path: '/staff/customers' },
    { label: 'Products', icon: Package, path: '/staff/products' },
    { label: 'Sales', icon: DollarSign, path: '/staff/sales' },
    { label: 'Lending', icon: ReceiptText, path: '/staff/lending' },
    { label: 'Payments', icon: WalletCards, path: '/staff/payments' },
    { label: 'Receipts', icon: ReceiptText, path: '/staff/receipts' },
    { label: 'Reports', icon: FileText, path: '/staff/reports' },
    { label: 'My Profile', icon: ShieldCheck, path: '/staff/profile' }
  ]
};

export default function DashboardLayout({ role }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-brand-deep text-white p-5 hidden lg:block">
          <div className="mb-8">
            <div className="text-2xl font-bold">Golden Agrochemicals</div>
            <div className="text-sm text-brand-gold mt-1">Farmers Priority</div>
          </div>
          <nav className="space-y-2">
            {sidebarItems[role].map(({ label, icon: Icon, path }) => (
              <Link key={label} to={path} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/10 transition">
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <button onClick={handleLogout} className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/10 transition">
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm text-slate-500">Good morning, {user?.full_name || 'User'}</div>
                <h1 className="text-2xl font-bold text-slate-800">{role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard'}</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-brand-light rounded-full p-2 text-brand-deep">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm">{user?.full_name}</div>
                  <div className="text-xs text-slate-500 uppercase">{user?.role}</div>
                </div>
              </div>
            </div>
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
